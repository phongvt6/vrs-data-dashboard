#!/usr/bin/env node
// Kéo dữ liệu thật từ Google Sheets về schema "mart" trong Supabase.
//
//   npm run sync                       # kéo tất cả dataset nguồn Sheets
//   npm run sync -- --only=data_tlx    # chỉ một dataset (lặp lại được nhiều lần)
//   npm run sync -- --dry-run          # chỉ in kế hoạch, không ghi DB
//
// Mỗi dataset trong catalog.datasets (nguon_ref.type = "sheets") thành một bảng
// mart.<dataset_id>. Bảng được dựng ở tên tạm rồi mới đổi tên đè lên bảng cũ,
// nên dashboard không bao giờ đọc phải bảng đang nạp dở.

import pg from "pg";
import { JWT } from "google-auth-library";
import { lenKeHoach, doiO, tachHeader } from "./lib/mart.mjs";
import { docTabPub, tabsPub } from "./lib/csv.mjs";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const chiLay = args.filter((a) => a.startsWith("--only=")).map((a) => a.slice(7));

const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
if (!connectionString) {
  console.error("Thiếu DATABASE_URL. Xem .env.example.");
  process.exit(1);
}

const LO = 500; // số dòng mỗi câu INSERT

const client = new pg.Client({
  connectionString,
  ssl: /localhost|127\.0\.0\.1/.test(connectionString) ? false : { rejectUnauthorized: false },
});

async function tokenCuaNguon(secret) {
  const creds = JSON.parse(secret);
  const auth = new JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  const { token } = await auth.getAccessToken();
  if (!token) throw new Error("không lấy được access token");
  return token;
}

/** Đọc trọn một tab. FORMATTED_STRING cho ngày để không nhận về số serial. */
async function docTab(token, sheetId, tab) {
  const range = encodeURIComponent(`${tab}`);
  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}` +
    `?valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Sheets API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const { values = [] } = await res.json();
  return tachHeader(values);
}

/** gid trong nguon_ref.path → tên tab, tra trong config.tabs của nguồn. */
function tenTab(nguonRef, config) {
  const gid = String(nguonRef.path ?? "").split("#gid=")[1];
  const tabs = Array.isArray(config?.tabs) ? config.tabs : [];
  const found = tabs.find((t) => String(t?.gid ?? "") === gid);
  return found?.title ?? null;
}

/** Đọc một dataset về {header, rows, nhan}, đi đường nào tuỳ loại nguồn. */
async function docDataset(ds) {
  if (ds.nguon_ref?.type === "sheets_pub") {
    const gid = String(ds.nguon_ref.path ?? "").split("#gid=")[1];
    if (!gid) throw new Error("nguon_ref.path thiếu #gid=");
    const pubId = String(ds.nguon_ref.path).split("#")[0];
    const tab = tabsPub(ds.config).find((t) => t.gid === gid);
    const values = await docTabPub(pubId, gid);
    return { ...tachHeader(values), nhan: tab?.title ?? `gid=${gid}` };
  }

  const tab = tenTab(ds.nguon_ref, ds.config);
  if (!tab) throw new Error("không tra được tên tab từ gid trong nguon_ref");
  const sheetId = String(ds.nguon_ref.path).split("#")[0];
  const token = await tokenCuaNguon(ds.secret);
  return { ...(await docTab(token, sheetId, tab)), nhan: tab };
}

async function napBang(ds, keHoach, rows) {
  const bang = ds.id;
  const tam = `${bang}__nap`;
  const cols = keHoach.map((c) => `"${c.ten}" ${c.kieu}`).join(", ");

  await client.query("BEGIN");
  try {
    await client.query(`DROP TABLE IF EXISTS mart."${tam}"`);
    await client.query(`CREATE TABLE mart."${tam}" (_dong integer, ${cols})`);

    const tenCols = ["_dong", ...keHoach.map((c) => c.ten)];
    const dsCols = tenCols.map((c) => `"${c}"`).join(",");
    for (let i = 0; i < rows.length; i += LO) {
      const lo = rows.slice(i, i + LO);
      const vals = [];
      const holes = lo.map((r, j) => {
        const base = j * tenCols.length;
        vals.push(i + j + 1, ...keHoach.map((c, k) => doiO(r[k], c.kieu)));
        return `(${tenCols.map((_, k) => `$${base + k + 1}`).join(",")})`;
      });
      await client.query(`INSERT INTO mart."${tam}" (${dsCols}) VALUES ${holes.join(",")}`, vals);
    }

    await client.query(`DROP TABLE IF EXISTS mart."${bang}"`);
    await client.query(`ALTER TABLE mart."${tam}" RENAME TO "${bang}"`);
    await client.query(
      `INSERT INTO mart._sync (dataset_id, bang, luc, so_dong, so_cot, kieu_cot, ghi_chu)
       VALUES ($1,$2, now(), $3,$4,$5,'OK')
       ON CONFLICT (dataset_id) DO UPDATE SET
         bang=$2, luc=now(), so_dong=$3, so_cot=$4, kieu_cot=$5, ghi_chu='OK'`,
      [ds.id, bang, rows.length, keHoach.length,
       JSON.stringify(Object.fromEntries(keHoach.map((c) => [c.ten, c.kieu])))]
    );
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  }
}

await client.connect();
let ok = 0, hong = 0;
try {
  const { rows: datasets } = await client.query(
    `SELECT d.id, d.ten, d.nguon_ref, s.secret, s.config, s.label, s.enabled
       FROM catalog.datasets d
       JOIN catalog.sources s ON s.id = d.nguon_ref->>'source'
      WHERE d.nguon_ref->>'type' IN ('sheets', 'sheets_pub')
      ORDER BY d.id`
  );

  const canLay = datasets.filter((d) => !chiLay.length || chiLay.includes(d.id));
  if (!canLay.length) {
    console.log("Không có dataset nào khớp.");
  }

  for (const ds of canLay) {
    const nhan = ds.id.padEnd(24);
    try {
      if (!ds.enabled) { console.log(`${nhan} bỏ qua — nguồn "${ds.label}" đang tắt`); continue; }
      const { header, rows, nhan: tab } = await docDataset(ds);
      if (!header.length) throw new Error(`tab "${tab}" không có dòng tiêu đề`);

      const keHoach = lenKeHoach(header, rows);
      const kieu = keHoach.reduce((a, c) => ((a[c.kieu] = (a[c.kieu] ?? 0) + 1), a), {});
      const tomTat = Object.entries(kieu).map(([k, v]) => `${v} ${k}`).join(", ");

      if (dryRun) {
        console.log(`${nhan} ${String(rows.length).padStart(6)} dòng · ${keHoach.length} cột (${tomTat}) — dry-run`);
        continue;
      }
      await napBang(ds, keHoach, rows);
      console.log(`${nhan} ${String(rows.length).padStart(6)} dòng · ${keHoach.length} cột (${tomTat}) → mart.${ds.id}`);
      ok++;
    } catch (e) {
      hong++;
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`${nhan} LỖI — ${msg}`);
      if (!dryRun) {
        await client.query(
          `INSERT INTO mart._sync (dataset_id, luc, ghi_chu) VALUES ($1, now(), $2)
           ON CONFLICT (dataset_id) DO UPDATE SET luc=now(), ghi_chu=$2`,
          [ds.id, `LỖI · ${msg}`.slice(0, 300)]
        ).catch(() => {});
      }
    }
  }
} finally {
  await client.end();
}

console.log(`\n${ok} bảng đã nạp${hong ? `, ${hong} lỗi` : ""}.`);
if (hong) process.exitCode = 1;
