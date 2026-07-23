"use server";

import { docTab, gopNhom, kiemTraSql, type QueryParams } from "@/lib/chart-data";
import { getSourceFull } from "@/lib/sources";
import type { ChartRow } from "@/chart/types";

/** Đọc tên cột của một tab — để form cho chọn thay vì bắt gõ tay. */
export async function docCotAction(
  sourceId: string,
  tab: string
): Promise<{ cot: string[]; loi?: string }> {
  try {
    const source = await getSourceFull(sourceId);
    if (!source) return { cot: [], loi: "Nguồn không tồn tại." };
    if (source.type !== "sheets") return { cot: [], loi: "Chỉ Google Sheets mới đọc được cột theo tab." };
    // Chỉ cần dòng đầu; đọc vài dòng cho chắc tab không rỗng.
    const bang = await docTab(source, tab, 5);
    if (!bang.header.length) return { cot: [], loi: "Tab này không có dòng tiêu đề." };
    return { cot: bang.header };
  } catch (e) {
    return { cot: [], loi: e instanceof Error ? e.message : String(e) };
  }
}

/** Chạy thử ngay trong form, chưa lưu gì. */
export async function chayThuAction(input: {
  source_id: string;
  sql: string;
  params: QueryParams;
}): Promise<{ rows: ChartRow[]; loi?: string }> {
  try {
    const source = await getSourceFull(input.source_id);
    if (!source) return { rows: [], loi: "Nguồn không tồn tại." };
    if (!source.enabled) return { rows: [], loi: `Nguồn "${source.label}" đang tắt.` };

    if (source.type === "sheets") {
      if (!input.params.tab) return { rows: [], loi: "Chưa chọn tab." };
      if (!input.params.cot_label) return { rows: [], loi: "Chưa chọn cột hạng mục." };
      const rows = gopNhom(await docTab(source, input.params.tab), input.params);
      return rows.length ? { rows } : { rows: [], loi: "Chạy xong nhưng không ra dòng nào." };
    }

    const loiSql = kiemTraSql(input.sql);
    if (loiSql) return { rows: [], loi: loiSql };
    // SQL chạy thật qua đúng đường của lúc hiển thị.
    const { chayChartQuery } = await import("@/lib/chart-data");
    const kq = await chayChartQuery(
      {
        chart_id: `thu_${input.source_id}`,
        source_id: input.source_id,
        sql: input.sql,
        params: input.params,
        cache_ttl_giay: 0,
        last_run_at: "",
        last_run_note: "",
      },
      true
    );
    return { rows: kq.rows, loi: kq.loi };
  } catch (e) {
    return { rows: [], loi: e instanceof Error ? e.message : String(e) };
  }
}
