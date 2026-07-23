import "server-only";
import { query } from "./db";
import type { ChartRow } from "@/chart/types";

// Truy vấn dữ liệu thật cho dashboard viết bằng code.
//
// Dữ liệu nằm ở schema `mart` trong chính Supabase của app — do `npm run sync`
// kéo từ Google Sheets về. Nghĩa là dashboard chỉ việc viết SQL bình thường:
// JOIN, GROUP BY, window function đều dùng được, và trang tải trong mili-giây.

/** Chạy SQL trên schema mart. Tham số luôn dùng $1, $2… đừng nối chuỗi. */
export async function mart<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  return query<T>(sql, params);
}

/** Một dòng bất kỳ → ChartRow, để đưa thẳng vào ChartTile. */
type ThoRow = Record<string, unknown>;

const so = (v: unknown) => {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

/**
 * Đổi kết quả SQL sang ChartRow[]. Chỉ là tiện ích cho trường hợp thường gặp —
 * dashboard nào cần hình dạng khác thì cứ tự map, không bắt buộc đi qua đây.
 */
export function toRows(
  rows: ThoRow[],
  cot: { label: string; value: string; series?: string; value2?: string }
): ChartRow[] {
  return rows.map((r) => ({
    label: String(r[cot.label] ?? ""),
    ...(cot.series ? { series: String(r[cot.series] ?? "") } : {}),
    value: so(r[cot.value]),
    ...(cot.value2 ? { value2: so(r[cot.value2]) } : {}),
  }));
}

export type TinhTrangMart = {
  dataset_id: string;
  luc: string;
  so_dong: number;
  ghi_chu: string;
};

/** Dữ liệu kéo về lúc nào — để dashboard hiện "số liệu tính đến …". */
export async function tinhTrangMart(): Promise<TinhTrangMart[]> {
  const rows = await query<{ dataset_id: string; luc: Date | string; so_dong: string; ghi_chu: string }>(
    `SELECT dataset_id, luc, so_dong, ghi_chu FROM mart._sync ORDER BY dataset_id`
  );
  return rows.map((r) => ({
    dataset_id: r.dataset_id,
    luc: new Date(r.luc).toISOString().slice(0, 16).replace("T", " "),
    so_dong: Number(r.so_dong) || 0,
    ghi_chu: r.ghi_chu,
  }));
}

/** Mốc đồng bộ gần nhất trong số các dataset mà một dashboard dùng tới. */
export async function moiNhat(datasetIds: string[]): Promise<string | null> {
  if (!datasetIds.length) return null;
  const rows = await query<{ luc: Date | string }>(
    `SELECT max(luc) AS luc FROM mart._sync WHERE dataset_id = ANY($1)`,
    [datasetIds]
  );
  const luc = rows[0]?.luc;
  return luc ? new Date(luc).toISOString().slice(0, 16).replace("T", " ") : null;
}
