// Lớp gọi API + kiểu dữ liệu cho dashboard tự doanh native.
// Dùng lại đúng các route /api/tu-doanh/* mà bản port dùng → số khớp tuyệt đối.
// Cache theo URL trong phiên (như port), có nonce _fresh để bỏ cache.

/* ------------------------------------------------------------------ types --- */

export type Span = { from: string; to: string };

export type Meta = {
  trams: string[];
  diems: string[];
  bps: string[];
  groups: string[];
  combos: { tram: string; diem: string; bp: string }[];
  stores: { code: string; tram: string; diem: string; bp: string; last: string }[];
  months: string[];
  firstDate: string;
  lastDate: string;
};

export type Unit = {
  name: string;
  cur: number;
  prevW: number;
  prevWY: number;
  prevM: number;
  prevY: number;
};

export type StoreRow = Unit & { tram: string; diem: string; bp: string; sl: number; target: number; pct: number };

export type Overview = {
  from: string;
  to: string;
  effTo: string;
  latestInData: string;
  nDays: number;
  pace: number;
  spans: { cur: Span; prevW: Span; prevWY: Span; prevM: Span; prevY: Span };
  total: {
    cur: number; prevW: number; prevWY: number; prevM: number; prevY: number;
    sl: number; slPrevM: number; slPrevY: number; km: number;
  };
  daily: { d: string; dt: number; sl: number }[];
  monthly: { year: number; labels: string[]; cur: number[]; prev: number[] };
  byTram: Unit[];
  byDiem: Unit[];
  byBp: Unit[];
  byStore: StoreRow[];
  groups: { group: string; dt: number; prevM: number; prevY: number; sl: number; share: number }[];
  topSku: { sku: string; ten: string; group: string; cur: number; sl: number; prevM: number; delta: number }[];
  skuMovers: {
    up: { sku: string; ten: string; group: string; cur: number; sl: number; prevM: number; delta: number }[];
    down: { sku: string; ten: string; group: string; cur: number; sl: number; prevM: number; delta: number }[];
  };
  kpi: { target: number; pctKpi: number };
};

export type Groups = {
  from: string; to: string; effTo: string;
  spans: Overview["spans"];
  structure: { group: string; dt: number; sl: number; share: number }[];
  table: { group: string; dt: number; sl: number; share: number; prevW: number; prevWY: number; prevM: number; prevY: number; ytd: number; ytdPrev: number }[];
  trend: { labels: string[]; series: { group: string; data: number[] }[] };
  top10Sku: { sku: string; ten: string; group: string; dt: number; sl: number }[];
};

export type Skus = {
  group: string; base: string; from: string; to: string;
  count: number; topN: number; pareto: number;
  groupTotal: number; shownTotal: number; restTotal: number;
  skus: { sku: string; ten: string; dt: number; sl: number; share: number; momPct: number | null }[];
  rest: { sku: string; ten: string; dt: number; sl: number; share: number; momPct: number | null }[];
};

export type Catalog = {
  from: string; to: string; effTo: string; group: string; base: string;
  bspan: Span;
  groups: { group: string; dt: number; sl: number; skuCount: number }[];
  skus: { sku: string; ten: string; group: string; dt: number; sl: number; donGia: number; share: number; momPct: number | null }[];
  trams: { name: string; dt: number; tram: string }[];
  diems: { name: string; dt: number; tram: string }[];
  bps: { name: string; dt: number; tram: string }[];
  stores: { store: string; tram: string; diem: string; bp: string; dt: number; sl: number }[];
  sel: { tram: string; diem: string; bp: string; store: string };
};

export type Diem = {
  diem: string; tram: string;
  dt: number; dtPrev: number; momPct: number | null;
  sl: number; storeCount: number;
  bps: string[];
  daily: { d: string; byBp: Record<string, number>; sl: number }[];
  stores: { store: string; bp: string; dt: number; sl: number; prev: number; momPct: number | null }[];
  storesAll: { store: string; bp: string; dt: number; sl: number; prev: number; momPct: number | null }[];
};

export type Diemtram = {
  from: string; to: string; effTo: string; base: string;
  spans: Overview["spans"];
  allBps: string[];
  diems: Diem[];
};

/* --------------------------------------------------------------- bộ lọc --- */

export type Filter = {
  from?: string;
  to?: string;
  tram: string[];   // CSV khi gửi API
  diem: string[];
  bp: string[];
  store: string[];
  group: string[];
};

export const emptyFilter = (): Filter => ({ tram: [], diem: [], bp: [], store: [], group: [] });

/** Dựng querystring cho API. `dims` chọn chiều nào được gửi (một số view bỏ bớt). */
export function toQuery(
  f: Filter,
  extra: Record<string, string | undefined> = {},
  dims: (keyof Filter)[] = ["tram", "diem", "bp", "store", "group"]
): string {
  const p = new URLSearchParams();
  if (f.from) p.set("from", f.from);
  if (f.to) p.set("to", f.to);
  for (const k of dims) {
    const v = f[k];
    if (Array.isArray(v) && v.length) p.set(k, v.join(","));
  }
  for (const [k, v] of Object.entries(extra)) if (v != null && v !== "") p.set(k, v);
  return p.toString();
}

/* ---------------------------------------------------------------- fetch --- */

const cache = new Map<string, unknown>();
let freshNonce = "";

/** Bỏ toàn bộ cache phiên (nút "Cập nhật dữ liệu"). */
export function bustCache() {
  cache.clear();
  freshNonce = String(Date.now());
}

export async function api<T>(endpoint: string, query: string): Promise<T> {
  const url = `/api/tu-doanh/${endpoint}${query ? `?${query}` : ""}`;
  const key = url + (freshNonce ? `#${freshNonce}` : "");
  if (cache.has(key)) return cache.get(key) as T;
  const res = await fetch(url + (freshNonce ? `${query ? "&" : "?"}_fresh=${freshNonce}` : ""));
  if (!res.ok) throw new Error(`API ${endpoint} lỗi ${res.status}`);
  const data = (await res.json()) as T;
  cache.set(key, data);
  return data;
}
