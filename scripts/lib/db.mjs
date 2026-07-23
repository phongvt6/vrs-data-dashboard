// Lớp DB cho các script Node (plain pg). Tách khỏi src/lib/db.ts (bản đó dùng
// "server-only" chỉ chạy trong Next). Đọc/ghi catalog trong schema "catalog".
import pg from "pg";

const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

export function hasDb() {
  return !!connectionString;
}

export async function withClient(fn) {
  if (!connectionString) {
    throw new Error("Chưa cấu hình DATABASE_URL / SUPABASE_DB_URL (xem .env.example).");
  }
  const isLocal = /localhost|127\.0\.0\.1/.test(connectionString);
  const client = new pg.Client({
    connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

// Đọc toàn bộ catalog từ DB (kèm nguon_ref để merge nhận diện bảng nguồn).
export async function loadCatalog(client) {
  const ds = (await client.query(`SELECT * FROM catalog.datasets ORDER BY sort_order, ten`)).rows;
  const cols = (
    await client.query(`SELECT dataset_id, ten, kieu, khoa, mo_ta FROM catalog.columns ORDER BY dataset_id, pos`)
  ).rows;
  const rels = (
    await client.query(`SELECT id, from_id AS "from", to_id AS "to", loai, mo_ta FROM catalog.relationships ORDER BY id`)
  ).rows;

  const byDs = new Map();
  for (const c of cols) {
    if (!byDs.has(c.dataset_id)) byDs.set(c.dataset_id, []);
    byDs.get(c.dataset_id).push({ ten: c.ten, kieu: c.kieu, khoa: c.khoa, mo_ta: c.mo_ta });
  }
  return {
    datasets: ds.map((d) => ({
      ...d,
      so_dong: Number(d.so_dong) || 0,
      cap_nhat_lan_cuoi: d.cap_nhat_lan_cuoi || "",
      columns: byDs.get(d.id) ?? [],
    })),
    relationships: rels,
  };
}

// Upsert catalog vào DB (KHÔNG xóa dataset/relationship cũ). Dùng cho seed + collector.
export async function upsertCatalog(client, catalog) {
  await client.query("BEGIN");
  try {
    for (let i = 0; i < catalog.datasets.length; i++) {
      const d = catalog.datasets[i];
      await client.query(
        `INSERT INTO catalog.datasets
           (id, ten, nguon, duong_dan, chu_so_huu, tan_suat, phan_loai_bao_mat,
            trang_thai, so_dong, mo_ta, cap_nhat_lan_cuoi, nguon_ref, sort_order, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13, now())
         ON CONFLICT (id) DO UPDATE SET
           ten=$2, nguon=$3, duong_dan=$4, chu_so_huu=$5, tan_suat=$6,
           phan_loai_bao_mat=$7, trang_thai=$8, so_dong=$9, mo_ta=$10,
           cap_nhat_lan_cuoi=$11, nguon_ref=$12, sort_order=$13, updated_at=now()`,
        [
          d.id, d.ten, d.nguon, d.duong_dan ?? "", d.chu_so_huu ?? "", d.tan_suat ?? "",
          d.phan_loai_bao_mat ?? "Nội bộ", d.trang_thai ?? "prototype", d.so_dong ?? 0,
          d.mo_ta ?? "", d.cap_nhat_lan_cuoi ?? "", d.nguon_ref ? JSON.stringify(d.nguon_ref) : null, i,
        ]
      );
      await client.query(`DELETE FROM catalog.columns WHERE dataset_id = $1`, [d.id]);
      for (let j = 0; j < (d.columns ?? []).length; j++) {
        const c = d.columns[j];
        await client.query(
          `INSERT INTO catalog.columns (dataset_id, pos, ten, kieu, khoa, mo_ta) VALUES ($1,$2,$3,$4,$5,$6)`,
          [d.id, j, c.ten, c.kieu ?? "", c.khoa ?? "", c.mo_ta ?? ""]
        );
      }
    }
    for (const r of catalog.relationships ?? []) {
      await client.query(
        `INSERT INTO catalog.relationships (id, from_id, to_id, loai, mo_ta)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (id) DO UPDATE SET from_id=$2, to_id=$3, loai=$4, mo_ta=$5`,
        [r.id, r.from, r.to, r.loai ?? "", r.mo_ta ?? ""]
      );
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  }
}
