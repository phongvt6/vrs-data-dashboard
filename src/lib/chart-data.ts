import "server-only";
import { query } from "./db";
import { getSourceFull, type SourceFull } from "./sources";
import { gopNhom, kiemTraSql, toSo, type QueryParams } from "./chart-rows";
import type { ChartRow } from "@/chart/types";

export { gopNhom, kiemTraSql, type QueryParams } from "./chart-rows";

// Lấy số thật cho chart.
//
// Toàn bộ nguồn của công ty hiện là Google Sheets, nên đường đi chính là:
// đọc một tab → gộp nhóm trong app → ra ChartRow[]. Postgres/BigQuery đi bằng
// SQL, có rào chắn chỉ-đọc ở dưới.
//
// Kết quả luôn quy về ChartRow[] — đúng dạng mà bộ render đã ăn từ giai đoạn 2,
// nên không phải sửa gì bên trong chart.

export type ChartQuery = {
  chart_id: string;
  source_id: string | null;
  sql: string;
  params: QueryParams;
  cache_ttl_giay: number;
  last_run_at: string;
  last_run_note: string;
};

const MAX_DONG = 5000; // trần số dòng đọc/trả về, cho cả Sheets lẫn SQL

export async function getChartQuery(chartId: string): Promise<ChartQuery | undefined> {
  const rows = await query<ChartQuery>(
    `SELECT chart_id, source_id, sql, params, cache_ttl_giay, last_run_at, last_run_note
       FROM catalog.chart_queries WHERE chart_id = $1`,
    [chartId]
  );
  return rows[0];
}

export async function getChartQueries(chartIds: string[]): Promise<Map<string, ChartQuery>> {
  if (!chartIds.length) return new Map();
  const rows = await query<ChartQuery>(
    `SELECT chart_id, source_id, sql, params, cache_ttl_giay, last_run_at, last_run_note
       FROM catalog.chart_queries WHERE chart_id = ANY($1)`,
    [chartIds]
  );
  return new Map(rows.map((r) => [r.chart_id, r]));
}

export async function saveChartQuery(q: Omit<ChartQuery, "last_run_at" | "last_run_note">): Promise<void> {
  await query(
    `INSERT INTO catalog.chart_queries (chart_id, source_id, sql, params, cache_ttl_giay)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (chart_id) DO UPDATE SET
       source_id=$2, sql=$3, params=$4, cache_ttl_giay=$5`,
    [q.chart_id, q.source_id || null, q.sql, JSON.stringify(q.params ?? {}), q.cache_ttl_giay]
  );
}

export async function deleteChartQuery(chartId: string): Promise<void> {
  await query(`DELETE FROM catalog.chart_queries WHERE chart_id = $1`, [chartId]);
}

async function ghiNhanChay(chartId: string, note: string) {
  await query(`UPDATE catalog.chart_queries SET last_run_at=$2, last_run_note=$3 WHERE chart_id=$1`, [
    chartId,
    new Date().toISOString().slice(0, 19).replace("T", " "),
    note.slice(0, 300),
  ]);
}

/* -------------------------------------------------------------------------- */
/* Đọc Google Sheets                                                           */
/* -------------------------------------------------------------------------- */

type Bang = { header: string[]; rows: unknown[][] };

async function sheetsToken(source: SourceFull): Promise<string> {
  let creds: { client_email: string; private_key: string };
  try {
    creds = JSON.parse(source.secret);
  } catch {
    throw new Error("Service-account JSON của nguồn không hợp lệ.");
  }
  const { JWT } = await import("google-auth-library");
  const auth = new JWT({
    email: creds.client_email,
    key: creds.private_key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  const { token } = await auth.getAccessToken();
  if (!token) throw new Error("Không lấy được access token cho Google Sheets.");
  return token;
}

/** Tên các tab đã khai báo ở nguồn (config.tabs do collector ghi). */
export function tabsCuaNguon(source: SourceFull): string[] {
  const tabs = source.config?.tabs;
  if (!Array.isArray(tabs)) return [];
  return tabs
    .map((t) => (typeof t === "string" ? t : String((t as { title?: string }).title ?? "")))
    .filter(Boolean);
}

/** Đọc một tab về dạng bảng. UNFORMATTED_VALUE để số ra số, không ra chuỗi. */
export async function docTab(source: SourceFull, tab: string, gioiHan = MAX_DONG): Promise<Bang> {
  const sheetId = String(source.config?.spreadsheetId ?? "");
  if (!sheetId) throw new Error("Nguồn thiếu spreadsheetId.");
  const token = await sheetsToken(source);
  const range = encodeURIComponent(`${tab}!A1:ZZ${gioiHan + 1}`);
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?valueRenderOption=UNFORMATTED_VALUE`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!res.ok) throw new Error(`Sheets API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = (await res.json()) as { values?: unknown[][] };
  const values = json.values ?? [];
  if (!values.length) return { header: [], rows: [] };
  return {
    header: (values[0] as unknown[]).map((h) => String(h ?? "").trim()),
    rows: values.slice(1),
  };
}

/* -------------------------------------------------------------------------- */
/* SQL (Postgres / BigQuery)                                                   */
/* -------------------------------------------------------------------------- */

async function chaySql(source: SourceFull, sql: string): Promise<Record<string, unknown>[]> {
  const loi = kiemTraSql(sql);
  if (loi) throw new Error(loi);

  if (source.type === "postgres") {
    const conn = source.secret;
    if (!conn) throw new Error("Nguồn thiếu connection string.");
    const { Client } = await import("pg");
    const isLocal = /localhost|127\.0\.0\.1/.test(conn);
    const client = new Client({ connectionString: conn, ssl: isLocal ? false : { rejectUnauthorized: false } });
    await client.connect();
    try {
      // Transaction chỉ-đọc + timeout: hai lớp chắn nữa ngoài kiểm tra chuỗi.
      await client.query("BEGIN READ ONLY");
      await client.query("SET LOCAL statement_timeout = 15000");
      const res = await client.query(`SELECT * FROM (${sql.trim().replace(/;\s*$/, "")}) t LIMIT ${MAX_DONG}`);
      await client.query("COMMIT");
      return res.rows;
    } finally {
      await client.end();
    }
  }

  if (source.type === "bigquery") {
    const project = String(source.config?.project ?? "");
    if (!project) throw new Error("Nguồn thiếu project.");
    let credentials: Record<string, unknown>;
    try {
      credentials = JSON.parse(source.secret);
    } catch {
      throw new Error("Service-account JSON không hợp lệ.");
    }
    const { BigQuery } = await import("@google-cloud/bigquery");
    const bq = new BigQuery({ projectId: project, credentials });
    const [rows] = await bq.query({ query: sql, maxResults: MAX_DONG });
    return rows as Record<string, unknown>[];
  }

  throw new Error(`Nguồn loại "${source.type}" không chạy được SQL.`);
}

/** Kết quả SQL → ChartRow[] theo tên cột đã khai báo. */
function sqlToRows(rows: Record<string, unknown>[], p: QueryParams): ChartRow[] {
  if (!p.cot_label || !p.cot_value) return [];
  return rows.slice(0, MAX_DONG).map((r) => ({
    label: String(r[p.cot_label!] ?? ""),
    ...(p.cot_series ? { series: String(r[p.cot_series] ?? "") } : {}),
    value: toSo(r[p.cot_value!]),
    ...(p.cot_value2 ? { value2: toSo(r[p.cot_value2]) } : {}),
  }));
}

/* -------------------------------------------------------------------------- */
/* Chạy + cache                                                                */
/* -------------------------------------------------------------------------- */

// Cache của tầng này đã chuyển sang `duLieu()` trong src/lib/nguon.ts — nó dùng
// cache DÙNG CHUNG của Next thay vì RAM từng instance (RAM khiến hai người mở
// cùng lúc thấy số lệch nhau). Giữ `xoaCache` làm hàm rỗng cho nơi gọi cũ.
export function xoaCache(_chartId?: string) {}

export type KetQua = { rows: ChartRow[]; tuCache: boolean; loi?: string };

/**
 * Chạy truy vấn của một chart. Trả về mảng rỗng kèm `loi` khi hỏng — nơi gọi tự
 * quyết định hiện lỗi hay lùi về số liệu mẫu.
 */
export async function chayChartQuery(q: ChartQuery, _boQuaCache = false): Promise<KetQua> {
  if (!q.source_id) return { rows: [], tuCache: false, loi: "Chưa chọn nguồn dữ liệu." };

  try {
    const source = await getSourceFull(q.source_id);
    if (!source) throw new Error("Nguồn dữ liệu không còn tồn tại.");
    if (!source.enabled) throw new Error(`Nguồn "${source.label}" đang tắt.`);

    let rows: ChartRow[];
    if (source.type === "sheets") {
      if (!q.params?.tab) throw new Error("Chưa chọn tab của Google Sheet.");
      rows = gopNhom(await docTab(source, q.params.tab), q.params ?? {});
    } else {
      rows = sqlToRows(await chaySql(source, q.sql), q.params ?? {});
    }

    await ghiNhanChay(q.chart_id, `OK · ${rows.length} dòng`);
    return { rows, tuCache: false };
  } catch (e) {
    const loi = e instanceof Error ? e.message : String(e);
    await ghiNhanChay(q.chart_id, `LỖI · ${loi}`).catch(() => {});
    return { rows: [], tuCache: false, loi };
  }
}
