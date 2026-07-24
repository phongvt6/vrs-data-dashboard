import "server-only";
import { query } from "./db";
import { getSourceFull, type SourceFull } from "./sources";

// Truy vấn dữ liệu cho dashboard — MỘT cửa cho mọi loại nguồn.
//
// Mỗi loại nguồn đi một đường khác nhau, và đó là chủ ý:
//
//   Google Sheets  → đọc bản đã kéo về schema `mart` (Sheets không query được)
//   BigQuery       → query THẲNG, không copy về. Nó đã là kho phân tích, quét
//                    hàng triệu dòng trong giây; copy về Postgres vừa phí, vừa
//                    làm số cũ đi, vừa không chở nổi bảng lớn (doanh_thu_chi_tiet
//                    2,7 triệu dòng và còn tăng)
//   Postgres       → query thẳng, đã là Postgres rồi
//
// Dashboard chỉ việc gọi truyVan(<id nguồn>, sql) — khác biệt giấu hết ở đây.

/** Nguồn ảo: bản Sheets đã kéo về schema `mart` trong chính Supabase của app. */
export const MART = "mart";

const TRAN_DONG = 50_000; // trần dòng trả về, chặn lỡ tay quét cả bảng

type Params = unknown[] | Record<string, unknown> | undefined;

// stale: client dùng bản cũ được bao lâu · revalidate: sau bao lâu thì làm mới
// ngầm ở lần xem kế · expire: quá lâu không ai xem thì lần sau phải chờ số mới.
const DO_TUOI = {
  phut: { stale: 60, revalidate: 300, expire: 3600 },
  gio: { stale: 300, revalidate: 3600, expire: 86400 },
  ngay: { stale: 3600, revalidate: 86400, expire: 604800 },
} as const;

/* -------------------------------------------------------------------------- */

async function chayBigQuery<T>(source: SourceFull, sql: string, params: Params): Promise<T[]> {
  const project = String(source.config?.project ?? "");
  if (!project) throw new Error(`Nguồn "${source.label}" thiếu project.`);
  let credentials: Record<string, unknown>;
  try {
    credentials = JSON.parse(source.secret);
  } catch {
    throw new Error(`Nguồn "${source.label}": service-account JSON không hợp lệ.`);
  }
  const { BigQuery } = await import("@google-cloud/bigquery");
  const bq = new BigQuery({ projectId: project, credentials });
  const location = String(source.config?.location ?? "");

  // BigQuery dùng tham số ĐẶT TÊN (@ten). Param null KHÔNG suy được kiểu → phải
  // khai tay. Dashboard hay truyền loc_tu/loc_den = null (chưa lọc ngày), đều là
  // chuỗi, nên mặc định STRING cho mọi param null.
  const named = params && !Array.isArray(params) ? params : undefined;
  const types = named
    ? Object.fromEntries(Object.entries(named).filter(([, v]) => v === null).map(([k]) => [k, "STRING"]))
    : undefined;

  const [rows] = await bq.query({
    query: sql,
    ...(location ? { location } : {}),
    ...(named ? { params: named } : {}),
    ...(types && Object.keys(types).length ? { types } : {}),
    maxResults: TRAN_DONG,
  });
  return rows as T[];
}

async function chayPostgres<T>(source: SourceFull, sql: string, params: Params): Promise<T[]> {
  const conn = source.secret;
  if (!conn) throw new Error(`Nguồn "${source.label}" thiếu connection string.`);
  const { Client } = await import("pg");
  const isLocal = /localhost|127\.0\.0\.1/.test(conn);
  const client = new Client({ connectionString: conn, ssl: isLocal ? false : { rejectUnauthorized: false } });
  await client.connect();
  try {
    // Chỉ-đọc + timeout: dashboard không có lý do gì để ghi vào nguồn.
    await client.query("BEGIN READ ONLY");
    await client.query("SET LOCAL statement_timeout = 30000");
    const res = await client.query(sql, Array.isArray(params) ? params : undefined);
    await client.query("COMMIT");
    return res.rows as T[];
  } finally {
    await client.end();
  }
}

/* -------------------------------------------------------------------------- */

/**
 * Chạy một truy vấn trên nguồn `nguonId`.
 *
 * - `nguonId` = MART  → chạy trên Supabase của app, dùng được schema `mart`
 * - `nguonId` = id trong catalog.sources → BigQuery / Postgres tương ứng
 *
 * `params`: mảng cho Postgres ($1, $2…), object cho BigQuery (@ten).
 *
 * KHÔNG cache — dùng `duLieu()` bên dưới nếu muốn cache.
 */
export async function truyVan<T = Record<string, unknown>>(
  nguonId: string,
  sql: string,
  params?: Params
): Promise<T[]> {
  if (nguonId === MART) {
    return query<T>(sql, Array.isArray(params) ? params : undefined);
  }

  const source = await getSourceFull(nguonId);
  if (!source) throw new Error(`Không tìm thấy nguồn "${nguonId}".`);
  if (!source.enabled) throw new Error(`Nguồn "${source.label}" đang tắt.`);

  switch (source.type) {
    case "bigquery":
      return chayBigQuery<T>(source, sql, params);
    case "postgres":
      return chayPostgres<T>(source, sql, params);
    case "sheets":
      throw new Error(
        `Nguồn "${source.label}" là Google Sheets — query bản đã kéo về bằng truyVan(MART, …) trên bảng mart.<dataset_id>.`
      );
    default:
      return chayBigQuery<T>(source, sql, params);
  }
}

/**
 * Như `truyVan` nhưng có CACHE DÙNG CHUNG.
 *
 * Cache nằm ở tầng dữ liệu của Next (trên Vercel là hạ tầng nền tảng), KHÔNG
 * phải RAM của tiến trình — nên hai người mở cùng lúc thấy đúng một con số.
 * Bản cũ cache trong RAM khiến mỗi instance một kết quả, số lệch nhau.
 *
 * `doi` = độ tươi mong muốn: "phut" cho số cần mới, "gio" cho báo cáo ngày,
 * "ngay" cho dữ liệu chốt kỳ.
 */
export async function duLieu<T = Record<string, unknown>>(
  nguonId: string,
  sql: string,
  params?: Params,
  doi: "phut" | "gio" | "ngay" = "gio"
): Promise<T[]> {
  "use cache";
  const { cacheLife, cacheTag } = await import("next/cache");
  cacheLife(DO_TUOI[doi]);
  // Gắn thẻ theo nguồn để sau này xoá cache của riêng một nguồn được.
  cacheTag(`nguon:${nguonId}`);
  return truyVan<T>(nguonId, sql, params);
}

/**
 * Đánh dấu dữ liệu của một nguồn là cũ — gọi sau khi đồng bộ xong.
 * "max" = vẫn trả bản cũ ngay, đồng thời lấy bản mới ngầm, nên không ai phải chờ.
 */
export async function xoaCacheNguon(nguonId: string): Promise<void> {
  const { revalidateTag } = await import("next/cache");
  revalidateTag(`nguon:${nguonId}`, "max");
}
