// Kiểu dữ liệu + helper THUẦN (không đụng DB) — an toàn để import ở client.

export type Column = {
  ten: string;
  kieu: string;
  khoa: string;
  mo_ta: string;
};

export type Dataset = {
  id: string;
  ten: string;
  nguon: string;
  duong_dan: string;
  chu_so_huu: string;
  tan_suat: string;
  phan_loai_bao_mat: string;
  trang_thai: string;
  so_dong: number;
  mo_ta: string;
  cap_nhat_lan_cuoi?: string;
  columns: Column[];
};

export type Relationship = {
  id: string;
  from: string;
  to: string;
  loai: string;
  mo_ta: string;
};

export type Catalog = {
  datasets: Dataset[];
  relationships: Relationship[];
};

// ---- Dashboard ----

// Dataset nuôi một dashboard. dataset_id trỏ sang catalog.datasets.
export type DashboardDataset = {
  dataset_id: string;
  vai_tro: string;
  ghi_chu: string;
};

export type Dashboard = {
  id: string;
  ten: string;
  mo_ta: string;
  cong_cu: string;
  url: string;
  /** Tên trang dashboard nội bộ dưới /bang/. Rỗng = chỉ có link ra công cụ ngoài. */
  route: string;
  chu_so_huu: string;
  phong_ban: string;
  doi_tuong: string;
  tan_suat: string;
  phan_loai_bao_mat: string;
  trang_thai: string;
  anh_bia: string;
  cap_nhat_lan_cuoi?: string;
  datasets: DashboardDataset[];
};

export const CONG_CU_GOI_Y = [
  "Looker Studio",
  "Power BI",
  "Metabase",
  "Tableau",
  "Google Sheets",
  "Nội bộ",
];

export const VAI_TRO_DATASET = ["nguồn chính", "nguồn phụ", "tham chiếu"];

export const TRANG_THAI_DASHBOARD = ["prototype", "production", "ngừng dùng"];

export const toolClass = (cong_cu: string) =>
  "tool-pill tool-" + cong_cu.replace(/\s+/g, ".");

// Màu theo công cụ cho sơ đồ lineage. Công cụ lạ dùng màu mặc định.
const TOOL_COLOR: Record<string, string> = {
  "Looker Studio": "#3a7bd5",
  "Power BI": "#c9a227",
  Metabase: "#4c8f8b",
  Tableau: "#8a5cb8",
  "Google Sheets": "#2f8f5b",
  "Nội bộ": "#1f6f6b",
};
export const colorForTool = (cong_cu: string) => TOOL_COLOR[cong_cu] ?? "#546a7b";

// Công cụ thực tế đang có (để dựng bộ lọc động).
export function toolsInUse(dashboards: Dashboard[]): string[] {
  return Array.from(new Set(dashboards.map((d) => d.cong_cu))).filter(Boolean);
}

// Dashboard nào đang ăn từ dataset này — dùng ở trang chi tiết dataset.
export function dashboardsUsingDataset(
  dashboards: Dashboard[],
  datasetId: string
): Dashboard[] {
  return dashboards.filter((d) => d.datasets.some((x) => x.dataset_id === datasetId));
}

// ---- Nguồn dữ liệu (collector cấu hình trong app) ----
export type SourceType = "postgres" | "bigquery" | "airtable" | "sheets";

// Bản gửi cho client: KHÔNG kèm secret, chỉ cờ đã-có-secret.
export type SourceView = {
  id: string;
  type: SourceType;
  label: string;
  nguon: string;
  enabled: boolean;
  config: Record<string, unknown>;
  hasSecret: boolean;
  last_sync_at?: string;
  last_sync_note?: string;
};

export const SOURCE_TYPE_LABEL: Record<SourceType, string> = {
  postgres: "Supabase / Postgres",
  bigquery: "BigQuery",
  airtable: "Airtable",
  sheets: "Google Sheets",
};

export const sourceClass = (nguon: string) =>
  "source-pill source-" + nguon.replace(/\s+/g, ".");

// Màu theo nguồn cho sơ đồ lineage. Nguồn lạ dùng màu mặc định.
const SOURCE_COLOR: Record<string, string> = {
  BigQuery: "#4a6fa5",
  "Google Sheets": "#2f8f5b",
  Airtable: "#c46a3d",
  Supabase: "#7c5cbf",
  Postgres: "#546a7b",
};
export const colorForSource = (nguon: string) => SOURCE_COLOR[nguon] ?? "#546a7b";

// Danh sách nguồn thực tế đang có (để dựng bộ lọc/chú thích động).
export function sourcesInUse(datasets: Dataset[]): string[] {
  return Array.from(new Set(datasets.map((d) => d.nguon)));
}
