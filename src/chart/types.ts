// Kiểu + helper của thư viện chart. DỮ LIỆU taxonomy (JOBS + CHART_TYPES) không
// còn nằm ở đây — nó được SINH TỰ ĐỘNG từ app ui-chart-catalog vào
// `catalog.generated.ts` (chạy `npm run sync-charts`). File này chỉ giữ định
// nghĩa kiểu + hàm tra cứu, và re-export dữ liệu đã sinh.
//
// File thuần, không đụng DB — an toàn để import ở client.

import { JOBS, CHART_TYPES } from "./catalog.generated";

export { JOBS, CHART_TYPES };

/**
 * Một dòng dữ liệu cho chart. Mọi loại chart đều đọc dạng này; ý nghĩa từng
 * trường thay đổi theo loại (cột "dùng gì" trong CHART_TYPES nói rõ):
 *
 *   cột/thanh/donut/phễu   label = tên hạng mục, value = giá trị
 *   cột nhóm/cột chồng     label = nhóm, series = thành phần, value = giá trị
 *   đường/miền             label = mốc thời gian, series = tên đường
 *   heatmap                label = trục ngang, series = trục dọc, value = độ đậm
 *   scatter                label = tên điểm, value = x, value2 = y
 *   ô chỉ số / meter        value = số hiện tại, value2 = kỳ trước (hoặc mốc trần)
 */
export type ChartRow = {
  label: string;
  series?: string;
  value: number;
  value2?: number;
};

/** Tuỳ chọn hiển thị của một chart cụ thể, lưu trong cột `config` (jsonb). */
export type ChartConfig = {
  /** Định dạng con số trên trục và tooltip. */
  dinh_dang?: "so" | "tien" | "phan_tram";
  /** Mốc trần cho meter, hoặc đường mục tiêu cho cột/đường. */
  muc_tieu?: number;
  /** Đơn vị hiện cạnh con số ở ô chỉ số. */
  don_vi?: string;
};

// Id nhóm mục đích. Để `string` vì taxonomy do catalog định nghĩa (có thể thêm
// nhóm mới) — không ràng union cứng để khỏi vỡ khi sync.
export type JobId = string;

export type Job = {
  id: JobId;
  ten: string;
  /** Câu hỏi nghiệp vụ mà nhóm này trả lời. */
  cau_hoi: string;
};

export type ChartType = {
  id: string;
  ten: string;
  job: JobId;
  mo_ta: string;
  /** Khi nào NÊN dùng. */
  nen_dung: string[];
  /** Khi nào KHÔNG dùng — phần quan trọng nhất của một mục. */
  tranh: string[];
  /** Dữ liệu đầu vào phải có dạng gì. */
  dang_du_lieu: string;
  /** Chiều cao mặc định của ô chart trong lưới dashboard. */
  cao?: number;
};

export const chartType = (id: string) => CHART_TYPES.find((c) => c.id === id);

export const chartTypeName = (id: string) => chartType(id)?.ten ?? id;

export function chartTypesByJob(): { job: Job; types: ChartType[] }[] {
  return JOBS.map((job) => ({
    job,
    types: CHART_TYPES.filter((t) => t.job === job.id),
  })).filter((g) => g.types.length > 0);
}
