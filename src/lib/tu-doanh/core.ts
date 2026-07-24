/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";
import { query } from "@/lib/db";
import { getSourceFull } from "@/lib/sources";

/**
 * Ruột dashboard "Doanh thu tự doanh" — PORT 1:1 từ app nhân viên
 * (linhptvrs/doanh-thu-tu-doanh, lib/core.js). Logic SQL, mốc so sánh, Pareto,
 * cascade filter giữ NGUYÊN để số khớp từng con.
 *
 * Khác bản gốc đúng 2 chỗ, để "nối tầng dữ liệu của app mới":
 *   1. bq(): xác thực BigQuery bằng nguồn trong catalog.sources (getSourceFull)
 *      thay cho việc tự ký JWT từ env GCP_SA_KEY.
 *   2. Ghi chú + khai báo quầy: lưu ở Postgres dùng chung (bảng catalog.kv)
 *      thay cho Supabase-REST / Cloudflare KV.
 *
 * Front-end (public/tu-doanh/index.html) gọi /api/tu-doanh/* và nhận JSON GIỐNG
 * HỆT bản gốc nên không phải sửa gì phần render.
 */

// Nguồn BigQuery đã cấu hình trong app mới (cùng bảng doanh_thu_chi_tiet).
const NGUON = "src_d223440a";

const CFG = {
  PROJECT: "gwm-1673948129693",
  DATASET: "Revenue",
  TABLE: "doanh_thu_chi_tiet",
  COL: {
    date: "ngay_thang", store: "ma_cua_hang", sku: "ma_sku", ten: "ten_hang_hoa",
    qty: "so_luong", km: "tien_km", rev: "doanh_thu", bp: "bo_phan", tram: "tram", diem: "diem_tram",
    group: "nhom_hang_cu",
  },
  TARGET_TABLE: "", // chưa có bảng mốc KPI → % HT KPI tạm = 0
  TARGET_COL: { store: "ma_cua_hang", month: "thang", moc: "moc" },
  LOCATION: "US",
};
const T = () => `\`${CFG.PROJECT}.${CFG.DATASET}.${CFG.TABLE}\``;
const TT = () => `\`${CFG.PROJECT}.${CFG.DATASET}.${CFG.TARGET_TABLE}\``;
const C = CFG.COL;

const N = (v: any) =>
  v == null ? 0 : typeof v === "object" ? Number(v.value ?? v.toString?.() ?? 0) : Number(v);
const pad = (n: any) => String(n).padStart(2, "0");

/* ============ NGÀY THÁNG ============ */
const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
function addDays(s: string, n: number) {
  return new Date(new Date(s + "T00:00:00Z").getTime() + n * 86400000).toISOString().slice(0, 10);
}
function addMonths(s: string, d: number) {
  let [y, m, day] = s.split("-").map(Number);
  m += d;
  while (m < 1) { m += 12; y--; }
  while (m > 12) { m -= 12; y++; }
  const dim = daysInMonth(y, m);
  if (day > dim) day = dim;
  return `${y}-${pad(m)}-${pad(day)}`;
}
function addYears(s: string, d: number) {
  const [y0, m, day0] = s.split("-").map(Number);
  let y = y0, day = day0;
  y += d;
  const dim = daysInMonth(y, m);
  if (day > dim) day = dim;
  return `${y}-${pad(m)}-${pad(day)}`;
}
function monthsInRange(from: string, to: string) {
  const out: string[] = [];
  let [y, m] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${pad(m)}`);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return out;
}
const dmy = (s: string) => {
  const p = s.split("-");
  return p[2] + "/" + p[1];
};

/* ============ BIGQUERY (qua nguồn app mới) ============ */
// Param giữ đúng dạng bản gốc: mảng {name, parameterType:{type}, parameterValue:{value}}.
function P(name: string, type: string, value: any) {
  return { name, parameterType: { type }, parameterValue: { value: String(value) } };
}

let _bqClient: { bq: any; location: string } | null = null;
async function bqClient() {
  if (_bqClient) return _bqClient;
  const source = await getSourceFull(NGUON);
  if (!source) throw new Error(`Không tìm thấy nguồn "${NGUON}" (BigQuery Doanh thu).`);
  if (!source.enabled) throw new Error(`Nguồn "${source.label}" đang tắt.`);
  const project = String((source.config as any)?.project ?? CFG.PROJECT);
  let credentials: Record<string, unknown>;
  try {
    credentials = JSON.parse(source.secret);
  } catch {
    throw new Error(`Nguồn "${source.label}": service-account JSON không hợp lệ.`);
  }
  const { BigQuery } = await import("@google-cloud/bigquery");
  _bqClient = {
    bq: new BigQuery({ projectId: project, credentials }),
    location: String((source.config as any)?.location ?? CFG.LOCATION),
  };
  return _bqClient;
}

async function bq(qsql: string, params: any[] = []): Promise<any[]> {
  const { bq: client, location } = await bqClient();
  // Chuyển mảng param có-kiểu của bản gốc → object {name:value} cho client Node.
  // QUAN TRỌNG: client @google-cloud/bigquery KHÔNG áp `types:{s:'DATE'}` như REST
  // API — phải BỌC giá trị DATE bằng client.date(...) thì `col DATE BETWEEN @s`
  // mới khớp (truyền chuỗi thô sẽ ra 0 dòng, im lặng). STRING giữ nguyên chuỗi.
  const p: Record<string, unknown> = {};
  for (const it of params) {
    const type = it.parameterType.type;
    const value = it.parameterValue.value;
    p[it.name] = type === "DATE" ? client.date(value) : value;
  }
  const [rows] = await client.query({
    query: qsql,
    ...(location ? { location } : {}),
    ...(params.length ? { params: p } : {}),
    maxResults: 50000,
  });
  return rows as any[];
}

function dimWhere(f: any, params: any[], { group = true, storeExpr }: any = {}) {
  const add = (col: string, csv: any, pfx: string) => {
    if (!csv) return "";
    const vals = String(csv).split(",");
    const names = vals.map((v, i) => `@${pfx}${i}`);
    vals.forEach((v, i) => params.push(P(pfx + i, "STRING", v)));
    return ` AND ${col} IN (${names.join(",")})`;
  };
  let w = "";
  w += add(C.tram, f.tram, "tram");
  w += add(C.diem, f.diem, "diem");
  w += add(C.bp, f.bp, "bp");
  w += add(storeExpr || C.store, f.store, "store");
  if (group) w += add(C.group, f.group, "grp");
  return w;
}
async function bounds() {
  const r = await bq(
    `SELECT FORMAT_DATE('%Y-%m-%d',MIN(${C.date})) mn, FORMAT_DATE('%Y-%m-%d',MAX(${C.date})) mx FROM ${T()}`
  );
  return { firstDate: r[0]?.mn, lastDate: r[0]?.mx };
}

/* ============ KHAI BÁO SÁP NHẬP / ĐỔI TÊN QUẦY ============ */
const SMAP_KEY = "storemap:v1";
const SAFE_CODE = (s: any) => String(s || "").replace(/[^A-Za-z0-9_\-.]/g, "");
async function getStoreMap(): Promise<any> {
  let cfg: any = { enabled: false, rules: [] };
  try {
    const t = await kvGet(SMAP_KEY);
    if (t) cfg = JSON.parse(t);
  } catch { /* chưa có bảng / chưa khai báo → mặc định tắt */ }
  return cfg;
}
function flattenMap(cfg: any) {
  const m: Record<string, string> = {};
  if (!cfg || !cfg.enabled || !Array.isArray(cfg.rules)) return m;
  for (const r of cfg.rules) {
    const to = SAFE_CODE(r.to);
    if (!to) continue;
    for (const f of r.from || []) {
      const fc = SAFE_CODE(f);
      if (fc && fc !== to) m[fc] = to;
    }
  }
  for (const k of Object.keys(m)) {
    const seen = new Set([k]);
    let v = m[k];
    let hop = 0;
    while (m[v] && !seen.has(v) && hop++ < 10) { seen.add(v); v = m[v]; }
    m[k] = v;
  }
  return m;
}
function storeCol(map: Record<string, string>) {
  const ks = Object.keys(map);
  if (!ks.length) return C.store;
  return `CASE ${C.store}${ks.map((k) => ` WHEN '${k}' THEN '${map[k]}'`).join("")} ELSE ${C.store} END`;
}
async function storeExpr() {
  return storeCol(flattenMap(await getStoreMap()));
}

/* ============ meta ============ */
export async function meta() {
  const [dims, months, combos, stores, bd] = await Promise.all([
    bq(`SELECT ARRAY_AGG(DISTINCT ${C.tram} IGNORE NULLS ORDER BY ${C.tram}) trams,
        ARRAY_AGG(DISTINCT ${C.diem} IGNORE NULLS ORDER BY ${C.diem}) diems,
        ARRAY_AGG(DISTINCT ${C.bp} IGNORE NULLS ORDER BY ${C.bp}) bps,
        ARRAY_AGG(DISTINCT ${C.group} IGNORE NULLS ORDER BY ${C.group}) \`groups\` FROM ${T()}`),
    bq(`SELECT DISTINCT FORMAT_DATE('%Y-%m', ${C.date}) ym FROM ${T()} ORDER BY ym`),
    bq(`SELECT ${C.tram} tram, ${C.diem} diem, ${C.bp} bp FROM ${T()}
        WHERE ${C.tram} IS NOT NULL GROUP BY tram, diem, bp`),
    bq(`SELECT ${C.store} s, ANY_VALUE(${C.tram}) tram, ANY_VALUE(${C.diem}) diem, ANY_VALUE(${C.bp}) bp,
        FORMAT_DATE('%Y-%m-%d',MAX(${C.date})) last FROM ${T()} WHERE ${C.store} IS NOT NULL GROUP BY s ORDER BY s`),
    bounds(),
  ]);
  const arr = (x: any) => (Array.isArray(x) ? x.map((v: any) => v?.v ?? v) : []);
  return {
    trams: arr(dims[0]?.trams), diems: arr(dims[0]?.diems), bps: arr(dims[0]?.bps), groups: arr(dims[0]?.groups),
    combos: combos.map((r: any) => ({ tram: r.tram, diem: r.diem, bp: r.bp })),
    stores: stores.map((r: any) => ({ code: r.s, tram: r.tram, diem: r.diem, bp: r.bp, last: r.last })),
    months: months.map((r: any) => r.ym), firstDate: bd.firstDate, lastDate: bd.lastDate,
  };
}

/* ============ overview ============ */
export async function overview(f: any) {
  const to = f.to || (await bounds()).lastDate;
  const from = f.from || to.slice(0, 7) + "-01";
  const range = (s: string, e: string, extra: any[] = []) => [P("s", "DATE", s), P("e", "DATE", e), ...extra];

  const SC = await storeExpr();
  const yr = Number(to.slice(0, 4));
  const rangeP = (s: string, e: string) => range(s, e).concat(dimParams(f, { storeExpr: SC }));
  const [daily, targetRows, monRows] = await Promise.all([
    bq(`SELECT FORMAT_DATE('%Y-%m-%d',${C.date}) d, SUM(${C.rev}) dt, SUM(${C.qty}) sl FROM ${T()}
        WHERE ${C.date} BETWEEN @s AND @e${dimWhere(f, [], { storeExpr: SC })} GROUP BY d ORDER BY d`, rangeP(from, to)),
    targetQuery(from, to),
    bq(`SELECT EXTRACT(YEAR FROM ${C.date}) y, EXTRACT(MONTH FROM ${C.date}) m, SUM(${C.rev}) dt FROM ${T()}
        WHERE ${C.date} BETWEEN @s AND @e${dimWhere(f, [], { storeExpr: SC })} GROUP BY y, m`, rangeP(`${yr - 1}-01-01`, `${yr}-12-31`)),
  ]);
  const latestInData = daily.length ? daily[daily.length - 1].d : to;
  const effTo = latestInData < to ? latestInData : to;
  const spans: any = {
    cur: { from, to: effTo },
    prevW: { from: addDays(from, -7), to: addDays(effTo, -7) },
    prevWY: { from: addDays(from, -364), to: addDays(effTo, -364) },
    prevM: { from: addMonths(from, -1), to: addMonths(effTo, -1) },
    prevY: { from: addYears(from, -1), to: addYears(effTo, -1) },
  };
  const minF = [spans.cur, spans.prevW, spans.prevWY, spans.prevM, spans.prevY].map((s) => s.from).reduce((a, b) => (b < a ? b : a));
  const IFS = (col: string, sp: any, alias: string, pfx: string, par: any[]) => {
    par.push(P(pfx + "a", "DATE", sp.from), P(pfx + "b", "DATE", sp.to));
    return `SUM(IF(${C.date} BETWEEN @${pfx}a AND @${pfx}b, ${col}, 0)) ${alias}`;
  };

  const sPar = [P("s", "DATE", minF), P("e", "DATE", effTo)];
  const storeSql = `SELECT ${SC} store, ANY_VALUE(${C.tram}) tram, ANY_VALUE(${C.diem}) diem, ANY_VALUE(${C.bp}) bp,
    ${IFS(C.rev, spans.cur, "cur", "sc", sPar)}, ${IFS(C.rev, spans.prevW, "prevW", "sw", sPar)}, ${IFS(C.rev, spans.prevWY, "prevWY", "swy", sPar)}, ${IFS(C.rev, spans.prevM, "prevM", "sm", sPar)}, ${IFS(C.rev, spans.prevY, "prevY", "sy", sPar)},
    ${IFS(C.qty, spans.cur, "sl", "sq", sPar)}, ${IFS(C.qty, spans.prevM, "slPm", "sqm", sPar)}, ${IFS(C.qty, spans.prevY, "slPy", "sqy", sPar)}, ${IFS(C.km, spans.cur, "km", "sk", sPar)}
    FROM ${T()} WHERE ${C.date} BETWEEN @s AND @e${dimWhere(f, sPar, { storeExpr: SC })} GROUP BY store`;
  const gPar = [P("s", "DATE", spans.prevY.from), P("e", "DATE", effTo)];
  const groupSql = `SELECT ${C.group} grp, ${IFS(C.rev, spans.cur, "cur", "gc", gPar)}, ${IFS(C.rev, spans.prevM, "prevM", "gm", gPar)}, ${IFS(C.rev, spans.prevY, "prevY", "gy", gPar)}, ${IFS(C.qty, spans.cur, "sl", "gq", gPar)}
    FROM ${T()} WHERE ${C.date} BETWEEN @s AND @e${dimWhere(f, gPar, { group: false, storeExpr: SC })} GROUP BY grp ORDER BY cur DESC`;
  const kPar = [P("s", "DATE", spans.prevM.from), P("e", "DATE", effTo)];
  const skuSql = `SELECT ${C.sku} sku, ANY_VALUE(${C.ten}) ten, ANY_VALUE(${C.group}) grp, ${IFS(C.rev, spans.cur, "cur", "kc", kPar)}, ${IFS(C.rev, spans.prevM, "prevM", "km", kPar)}, ${IFS(C.qty, spans.cur, "sl", "kq", kPar)}
    FROM ${T()} WHERE ${C.date} BETWEEN @s AND @e${dimWhere(f, kPar, { group: false, storeExpr: SC })} GROUP BY sku`;
  const [storeRows, groupRows, skuRows] = await Promise.all([bq(storeSql, sPar), bq(groupSql, gPar), bq(skuSql, kPar)]);

  const tgt: any = {};
  for (const r of targetRows) tgt[r.store] = N(r.moc);
  const byStore = storeRows.map((r: any) => ({
    name: r.store, tram: r.tram, diem: r.diem, bp: r.bp, cur: N(r.cur), sl: N(r.sl),
    prevW: N(r.prevW), prevWY: N(r.prevWY), prevM: N(r.prevM), prevY: N(r.prevY),
    target: tgt[r.store] || 0, pct: tgt[r.store] ? N(r.cur) / tgt[r.store] : 0,
  })).sort((a: any, b: any) => b.cur - a.cur);
  const K5 = ["cur", "prevW", "prevWY", "prevM", "prevY"];
  const agg = (keyFn: any) => {
    const m = new Map();
    for (const s of byStore) {
      const k = keyFn(s);
      const e = m.get(k) || { name: k, cur: 0, prevW: 0, prevWY: 0, prevM: 0, prevY: 0 };
      for (const kk of K5) (e as any)[kk] += (s as any)[kk];
      m.set(k, e);
    }
    return [...m.values()].sort((a: any, b: any) => b.cur - a.cur);
  };
  const byTram = agg((s: any) => s.tram), byDiem = agg((s: any) => s.diem), byBp = agg((s: any) => s.bp);

  const monMap: any = {};
  for (const r of monRows) monMap[`${r.y}-${r.m}`] = N(r.dt);
  const monthly = {
    year: yr, labels: Array.from({ length: 12 }, (_, i) => "T" + (i + 1)),
    cur: Array.from({ length: 12 }, (_, i) => monMap[`${yr}-${i + 1}`] || 0),
    prev: Array.from({ length: 12 }, (_, i) => monMap[`${yr - 1}-${i + 1}`] || 0),
  };

  const S = (k: string) => storeRows.reduce((a: number, r: any) => a + N(r[k]), 0);
  const total = { cur: S("cur"), prevW: S("prevW"), prevWY: S("prevWY"), prevM: S("prevM"), prevY: S("prevY"), sl: S("sl"), slPrevM: S("slPm"), slPrevY: S("slPy"), km: S("km") };

  const gTot = groupRows.reduce((a: number, r: any) => a + N(r.cur), 0) || 1;
  const groups = groupRows.map((r: any) => ({ group: r.grp, dt: N(r.cur), prevM: N(r.prevM), prevY: N(r.prevY), sl: N(r.sl), share: N(r.cur) / gTot }));

  const skuArr = skuRows.map((r: any) => ({ sku: r.sku, ten: r.ten, group: r.grp, cur: N(r.cur), sl: N(r.sl), prevM: N(r.prevM), delta: N(r.cur) - N(r.prevM) }));
  const topSku = skuArr.slice().sort((a: any, b: any) => b.cur - a.cur).slice(0, 10);
  const up = skuArr.filter((x: any) => x.delta > 0).sort((a: any, b: any) => b.delta - a.delta).slice(0, 3);
  const down = skuArr.filter((x: any) => x.delta < 0).sort((a: any, b: any) => a.delta - b.delta).slice(0, 3);

  const totalTarget = byStore.reduce((a: number, s: any) => a + s.target, 0);
  const nDays = Math.round((Date.parse(effTo) - Date.parse(from)) / 86400000) + 1;
  const months = monthsInRange(from, to);
  const [ly, lm] = effTo.split("-").map(Number);
  const pace = months.length === 1 ? Number(effTo.split("-")[2]) / daysInMonth(ly, lm) : 1;

  return {
    from, to, effTo, latestInData: effTo, nDays, pace, spans, total,
    daily: daily.map((r: any) => ({ d: r.d, dt: N(r.dt), sl: N(r.sl) })), monthly, byTram, byDiem, byBp, byStore, groups, topSku, skuMovers: { up, down },
    kpi: { target: totalTarget, pctKpi: totalTarget ? total.cur / totalTarget : 0 },
  };
}
function dimParams(f: any, { group = true, storeExpr }: any = {}) {
  const p: any[] = [];
  dimWhere(f, p, { group, storeExpr });
  return p;
}
async function targetQuery(from: string, to: string) {
  if (!CFG.TARGET_TABLE) return [];
  const months = monthsInRange(from, to);
  const names = months.map((_, i) => `@m${i}`);
  const params = months.map((m, i) => P("m" + i, "STRING", m));
  return bq(`SELECT ${CFG.TARGET_COL.store} store, SUM(${CFG.TARGET_COL.moc}) moc FROM ${TT()}
     WHERE ${CFG.TARGET_COL.month} IN (${names.join(",")}) GROUP BY store`, params);
}

/* ============ compare ============ */
export async function compare(f: any) {
  const metric = f.metric === "sl" ? "sl" : "dt";
  const VAL = metric === "sl" ? C.qty : C.rev;
  const anchor = f.anchor || (await bounds()).lastDate;
  const names = ["Kỳ này", "Kỳ trước"];
  let curStart: string, curEnd: string, prevStart: string, prevEnd: string, bucket: string, labels: string[], curLabel: string, prevLabel: string;
  if (f.mode === "week") {
    const d = new Date(anchor + "T00:00:00Z");
    const wd = (d.getUTCDay() + 6) % 7;
    const cf = new Date(d.getTime() - wd * 86400000);
    curStart = cf.toISOString().slice(0, 10);
    curEnd = new Date(cf.getTime() + 6 * 86400000).toISOString().slice(0, 10);
    prevStart = new Date(cf.getTime() - 7 * 86400000).toISOString().slice(0, 10);
    prevEnd = new Date(cf.getTime() - 86400000).toISOString().slice(0, 10);
    bucket = "day"; labels = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
    curLabel = `Tuần này (${dmy(curStart)}–${dmy(curEnd)})`; prevLabel = `Tuần trước (${dmy(prevStart)}–${dmy(prevEnd)})`;
  } else if (f.mode === "year") {
    const y = Number(anchor.slice(0, 4));
    curStart = `${y}-01-01`; curEnd = `${y}-12-31`; prevStart = `${y - 1}-01-01`; prevEnd = `${y - 1}-12-31`;
    bucket = "month"; labels = Array.from({ length: 12 }, (_, i) => "T" + (i + 1)); curLabel = "Năm " + y; prevLabel = "Năm " + (y - 1);
  } else if (f.mode === "quarter") {
    const [ly, lm] = anchor.split("-").map(Number);
    const q = Math.floor((lm - 1) / 3);
    curStart = `${ly}-${pad(q * 3 + 1)}-01`; curEnd = new Date(Date.UTC(ly, q * 3 + 3, 0)).toISOString().slice(0, 10);
    let py = ly, pq = q - 1;
    if (pq < 0) { pq = 3; py--; }
    prevStart = `${py}-${pad(pq * 3 + 1)}-01`; prevEnd = new Date(Date.UTC(py, pq * 3 + 3, 0)).toISOString().slice(0, 10);
    bucket = "month"; labels = [0, 1, 2].map((i) => "Th" + (q * 3 + i + 1)); curLabel = `Quý ${q + 1}/${ly}`; prevLabel = `Quý ${pq + 1}/${py}`;
  } else {
    const month = f.month || anchor.slice(0, 7);
    const [y, m] = month.split("-").map(Number);
    const pm = addMonths(month + "-01", -1).slice(0, 7);
    const [pmy, pmm] = pm.split("-");
    curStart = `${month}-01`; curEnd = `${month}-${pad(daysInMonth(y, m))}`; prevStart = `${pm}-01`; prevEnd = `${pm}-${pad(daysInMonth(Number(pmy), Number(pmm)))}`;
    bucket = "dom"; labels = Array.from({ length: daysInMonth(y, m) }, (_, i) => String(i + 1)); curLabel = `Tháng ${m}/${y}`; prevLabel = `Tháng ${Number(pmm)}/${pmy}`;
  }
  const SC = await storeExpr();
  const sel = bucket === "day" ? `FORMAT_DATE('%Y-%m-%d',${C.date}) k` : bucket === "dom" ? `EXTRACT(DAY FROM ${C.date}) k` : `EXTRACT(MONTH FROM ${C.date}) k`;
  const run = async (s: string, e: string) => {
    const p = [P("s", "DATE", s), P("e", "DATE", e)];
    const rows = await bq(`SELECT ${sel}, SUM(${VAL}) v FROM ${T()} WHERE ${C.date} BETWEEN @s AND @e${dimWhere(f, p, { storeExpr: SC })} GROUP BY k`, p);
    return new Map(rows.map((r: any) => [String(r.k), N(r.v)]));
  };
  const [cm, pmm2] = await Promise.all([run(curStart, curEnd), run(prevStart, prevEnd)]);
  let cur: number[], prev: number[];
  if (bucket === "day") {
    const dd = (base: string, i: number) => new Date(new Date(base + "T00:00:00Z").getTime() + i * 86400000).toISOString().slice(0, 10);
    cur = labels.map((_, i) => cm.get(dd(curStart, i)) || 0); prev = labels.map((_, i) => pmm2.get(dd(prevStart, i)) || 0);
  } else if (bucket === "dom") {
    cur = labels.map((_, i) => cm.get(String(i + 1)) || 0); prev = labels.map((_, i) => pmm2.get(String(i + 1)) || 0);
  } else {
    const cMs = monthsOfRange(curStart, curEnd), pMs = monthsOfRange(prevStart, prevEnd);
    cur = cMs.map((mn) => cm.get(String(mn)) || 0); prev = pMs.map((mn) => pmm2.get(String(mn)) || 0);
  }
  return { mode: "ok", metric, names, labels, cur, prev, curLabel, prevLabel, curTotal: cur.reduce((a, b) => a + b, 0), prevTotal: prev.reduce((a, b) => a + b, 0) };
}
function monthsOfRange(s: string, e: string) {
  const out: number[] = [];
  let d = new Date(s + "T00:00:00Z");
  const end = new Date(e + "T00:00:00Z");
  while (d <= end) { out.push(d.getUTCMonth() + 1); d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)); }
  return out;
}
function addMonthsYM(ym: string, k: number) {
  let [y, m] = ym.split("-").map(Number);
  m += k;
  while (m < 1) { m += 12; y--; }
  while (m > 12) { m -= 12; y++; }
  return `${y}-${pad(m)}`;
}
function spanSet(from: string, effTo: string): any {
  const yr = Number(effTo.slice(0, 4));
  return {
    cur: { from, to: effTo }, prevW: { from: addDays(from, -7), to: addDays(effTo, -7) }, prevWY: { from: addDays(from, -364), to: addDays(effTo, -364) },
    prevM: { from: addMonths(from, -1), to: addMonths(effTo, -1) }, prevY: { from: addYears(from, -1), to: addYears(effTo, -1) },
    ytd: { from: `${yr}-01-01`, to: effTo }, ytdPrev: { from: `${yr - 1}-01-01`, to: addYears(effTo, -1) },
  };
}

/* ============ groups ============ */
export async function groupsApi(f: any) {
  const to = f.to || (await bounds()).lastDate;
  const from = f.from || to.slice(0, 7) + "-01";
  const SC = await storeExpr();
  const p1 = [P("s", "DATE", from), P("e", "DATE", to)];
  const struct = await bq(`SELECT ${C.group} grp, SUM(${C.rev}) dt, SUM(${C.qty}) sl FROM ${T()}
     WHERE ${C.date} BETWEEN @s AND @e${dimWhere(f, p1, { group: false, storeExpr: SC })} GROUP BY grp ORDER BY dt DESC`, p1);
  const tot = struct.reduce((a: number, r: any) => a + N(r.dt), 0) || 1;
  const structure = struct.map((r: any) => ({ group: r.grp, dt: N(r.dt), sl: N(r.sl), share: N(r.dt) / tot }));

  const le = await bq(`SELECT FORMAT_DATE('%Y-%m-%d',MAX(${C.date})) d FROM ${T()} WHERE ${C.date} BETWEEN @s AND @e`, [P("s", "DATE", from), P("e", "DATE", to)]);
  const effTo = le[0]?.d && le[0].d < to ? le[0].d : to;
  const spans = spanSet(from, effTo);
  const grpQ = (k: string) => bq(`SELECT ${C.group} grp, SUM(${C.rev}) dt FROM ${T()}
     WHERE ${C.date} BETWEEN @s AND @e${dimWhere(f, [], { group: false, storeExpr: SC })} GROUP BY grp`,
    [P("s", "DATE", spans[k].from), P("e", "DATE", spans[k].to)].concat(dimParams(f, { group: false, storeExpr: SC })));
  const [pw, pwy, pm, py, ytd, ytdp] = await Promise.all([grpQ("prevW"), grpQ("prevWY"), grpQ("prevM"), grpQ("prevY"), grpQ("ytd"), grpQ("ytdPrev")]);
  const M = (o: any[]) => new Map(o.map((r: any) => [r.grp, N(r.dt)]));
  const mp: any = { prevW: M(pw), prevWY: M(pwy), prevM: M(pm), prevY: M(py), ytd: M(ytd), ytdPrev: M(ytdp) };
  const table = structure.map((g: any) => ({
    group: g.group, dt: g.dt, sl: g.sl, share: g.share,
    prevW: mp.prevW.get(g.group) || 0, prevWY: mp.prevWY.get(g.group) || 0, prevM: mp.prevM.get(g.group) || 0,
    prevY: mp.prevY.get(g.group) || 0, ytd: mp.ytd.get(g.group) || 0, ytdPrev: mp.ytdPrev.get(g.group) || 0,
  }));

  const trStart = `${addMonthsYM(to.slice(0, 7), -11)}-01`;
  const p3 = [P("s", "DATE", trStart), P("e", "DATE", to)];
  const tr = await bq(`SELECT FORMAT_DATE('%Y-%m',${C.date}) ym, ${C.group} grp, SUM(${C.rev}) dt FROM ${T()}
     WHERE ${C.date} BETWEEN @s AND @e${dimWhere(f, p3, { group: false, storeExpr: SC })} GROUP BY ym, grp ORDER BY ym`, p3);
  const months = [...new Set(tr.map((r: any) => r.ym))].sort();
  const labels = months.map((ym: any) => { const [yy, mm] = ym.split("-"); return "T" + Number(mm) + "/" + yy.slice(2); });
  const gnames = structure.map((s: any) => s.group);
  const series = gnames.map((g: any) => ({ group: g, data: months.map((ym: any) => { const row = tr.find((r: any) => r.ym === ym && r.grp === g); return row ? N(row.dt) : 0; }) }));
  const ps10 = [P("s", "DATE", from), P("e", "DATE", to)];
  const s10 = await bq(`SELECT ${C.sku} sku, ANY_VALUE(${C.ten}) ten, ANY_VALUE(${C.group}) grp, SUM(${C.rev}) dt, SUM(${C.qty}) sl FROM ${T()}
     WHERE ${C.date} BETWEEN @s AND @e${dimWhere(f, ps10, { group: false, storeExpr: SC })} GROUP BY sku ORDER BY dt DESC LIMIT 10`, ps10);
  const top10Sku = s10.map((r: any) => ({ sku: r.sku, ten: r.ten, group: r.grp, dt: N(r.dt), sl: N(r.sl) }));
  return { from, to, effTo, spans, structure, table, trend: { labels, series }, top10Sku };
}

/* ============ skus (drill-down 1 nhóm, Pareto 80%) ============ */
export async function skusApi(f: any) {
  const to = f.to || (await bounds()).lastDate;
  const from = f.from || to.slice(0, 7) + "-01";
  const group = f.group || "";
  const base = f.base || "prevM";
  const SC = await storeExpr();
  const p1 = [P("s", "DATE", from), P("e", "DATE", to), P("grp", "STRING", group)];
  const cur = await bq(`SELECT ${C.sku} sku, ANY_VALUE(${C.ten}) ten, SUM(${C.rev}) dt, SUM(${C.qty}) sl FROM ${T()}
     WHERE ${C.date} BETWEEN @s AND @e AND ${C.group}=@grp${dimWhere(f, p1, { group: false, storeExpr: SC })} GROUP BY sku ORDER BY dt DESC`, p1);
  const le = await bq(`SELECT FORMAT_DATE('%Y-%m-%d',MAX(${C.date})) d FROM ${T()} WHERE ${C.date} BETWEEN @s AND @e AND ${C.group}=@g`, [P("s", "DATE", from), P("e", "DATE", to), P("g", "STRING", group)]);
  const effTo = le[0]?.d && le[0].d < to ? le[0].d : to;
  const bsp = spanSet(from, effTo)[base] || spanSet(from, effTo).prevM;
  const p2 = [P("s", "DATE", bsp.from), P("e", "DATE", bsp.to), P("grp", "STRING", group)];
  const pm = await bq(`SELECT ${C.sku} sku, SUM(${C.rev}) dt FROM ${T()}
     WHERE ${C.date} BETWEEN @s AND @e AND ${C.group}=@grp${dimWhere(f, p2, { group: false, storeExpr: SC })} GROUP BY sku`, p2);
  const pmM = new Map(pm.map((r: any) => [r.sku, N(r.dt)]));
  const tot = cur.reduce((a: number, r: any) => a + N(r.dt), 0) || 1;
  const all = cur.map((r: any) => ({
    sku: r.sku, ten: r.ten, dt: N(r.dt), sl: N(r.sl), share: N(r.dt) / tot,
    momPct: (pmM.get(r.sku) || 0) > 0 ? (N(r.dt) - (pmM.get(r.sku) || 0)) / (pmM.get(r.sku) || 0) * 100 : null,
  }));
  const PARETO = 0.8;
  const cutoff = tot * PARETO;
  let cum = 0, n = 0;
  for (const s of all) { cum += s.dt; n++; if (cum >= cutoff) break; }
  n = Math.min(Math.max(1, n), all.length);
  const shown = all.slice(0, n);
  const rest = all.slice(n);
  return {
    group, base, from, to, count: all.length, topN: n, pareto: PARETO, groupTotal: tot,
    shownTotal: shown.reduce((a: number, x: any) => a + x.dt, 0), restTotal: rest.reduce((a: number, x: any) => a + x.dt, 0), skus: shown, rest,
  };
}

/* ============ catalog ============ */
function catWhere(f: any, params: any[], opts: any = {}) {
  const SC = opts.storeExpr || C.store;
  const add = (col: string, csv: any, pfx: string) => {
    if (!csv || opts.exclude === pfx) return "";
    const vals = String(csv).split(",");
    const names = vals.map((v, i) => `@${pfx}${i}`);
    vals.forEach((v, i) => params.push(P(pfx + i, "STRING", v)));
    return ` AND ${col} IN (${names.join(",")})`;
  };
  let w = "";
  w += add(C.group, f.group, "cg");
  w += add(C.tram, f.tram, "ct");
  w += add(C.diem, f.diem, "cd");
  w += add(C.bp, f.bp, "cb");
  if (!opts.noStore) w += add(SC, f.store, "cs");
  return w;
}
export async function catalogApi(f: any) {
  const to = f.to || (await bounds()).lastDate;
  const from = f.from || to.slice(0, 7) + "-01";
  const group = f.group || "";
  const base = f.base || "prevM";
  const SC = await storeExpr();
  const cw = (ff: any, p: any[], o: any = {}) => catWhere(ff, p, { ...o, storeExpr: SC });
  const mk = (s: string, e: string) => [P("s", "DATE", s), P("e", "DATE", e)];
  const pe = mk(from, to);
  const le = await bq(`SELECT FORMAT_DATE('%Y-%m-%d',MAX(${C.date})) d FROM ${T()} WHERE ${C.date} BETWEEN @s AND @e${cw(f, pe)}`, pe);
  const effTo = le[0]?.d && le[0].d < to ? le[0].d : to;
  const bsp = spanSet(from, effTo)[base] || spanSet(from, effTo).prevM;
  const facetQ = (col: string, exclude: string) => {
    const p = mk(from, to);
    return bq(`SELECT ${col} name, ANY_VALUE(${C.tram}) tram, SUM(${C.rev}) dt FROM ${T()}
     WHERE ${C.date} BETWEEN @s AND @e${cw(f, p, { exclude })} GROUP BY name ORDER BY dt DESC`, p).then((rs: any[]) => rs.map((r: any) => ({ name: r.name, dt: N(r.dt), tram: r.tram })));
  };
  const ps = mk(from, to), pc = mk(from, to), pg = mk(from, to), pb = mk(bsp.from, bsp.to);
  const [trams, diems, bps, storeRows, cur, gt, pm] = await Promise.all([
    facetQ(C.tram, "ct"), facetQ(C.diem, "cd"), facetQ(C.bp, "cb"),
    bq(`SELECT ${SC} store, ANY_VALUE(${C.tram}) tram, ANY_VALUE(${C.diem}) diem, ANY_VALUE(${C.bp}) bp, SUM(${C.rev}) dt, SUM(${C.qty}) sl FROM ${T()}
       WHERE ${C.date} BETWEEN @s AND @e${cw(f, ps, { noStore: true })} GROUP BY store ORDER BY dt DESC`, ps),
    bq(`SELECT ${C.sku} sku, ANY_VALUE(${C.ten}) ten, ANY_VALUE(${C.group}) grp, SUM(${C.rev}) dt, SUM(${C.qty}) sl FROM ${T()}
       WHERE ${C.date} BETWEEN @s AND @e${cw(f, pc)} GROUP BY sku ORDER BY dt DESC`, pc),
    bq(`SELECT ${C.group} grp, SUM(${C.rev}) dt, SUM(${C.qty}) sl, COUNT(DISTINCT ${C.sku}) n FROM ${T()}
       WHERE ${C.date} BETWEEN @s AND @e${cw(f, pg)} GROUP BY grp ORDER BY dt DESC`, pg),
    bq(`SELECT ${C.sku} sku, SUM(${C.rev}) dt FROM ${T()} WHERE ${C.date} BETWEEN @s AND @e${cw(f, pb)} GROUP BY sku`, pb),
  ]);
  const stores = storeRows.map((r: any) => ({ store: r.store, tram: r.tram, diem: r.diem, bp: r.bp, dt: N(r.dt), sl: N(r.sl) })).filter((s: any) => s.dt > 0);
  const pmM = new Map(pm.map((r: any) => [r.sku, N(r.dt)]));
  const gtotM = new Map(gt.map((r: any) => [r.grp, N(r.dt)]));
  const skus = cur.map((r: any) => {
    const dt = N(r.dt), sl = N(r.sl);
    const gt2: any = gtotM.get(r.grp) || 1;
    return {
      sku: r.sku, ten: r.ten, group: r.grp, dt, sl, donGia: sl ? Math.round(dt / sl) : 0, share: gt2 ? dt / gt2 : 0,
      momPct: (pmM.get(r.sku) || 0) > 0 ? (dt - (pmM.get(r.sku) || 0)) / (pmM.get(r.sku) || 0) * 100 : null,
    };
  });
  const groups = gt.map((r: any) => ({ group: r.grp, dt: N(r.dt), sl: N(r.sl), skuCount: N(r.n) }));
  return {
    from, to, effTo, group, base, bspan: bsp, groups, skus, trams, diems, bps, stores,
    sel: { tram: f.tram || "", diem: f.diem || "", bp: f.bp || "", store: f.store || "" },
  };
}

/* ============ diemtram ============ */
export async function diemtramApi(f: any) {
  const to = f.to || (await bounds()).lastDate;
  const from = f.from || to.slice(0, 7) + "-01";
  const base = f.base || "prevM";
  const SC = await storeExpr();
  const p1 = [P("s", "DATE", from), P("e", "DATE", to)];
  const p2 = [P("s", "DATE", from), P("e", "DATE", to)];
  const [curStore, dailyBp] = await Promise.all([
    bq(`SELECT ${SC} store, ANY_VALUE(${C.diem}) diem, ANY_VALUE(${C.tram}) tram, ANY_VALUE(${C.bp}) bp, SUM(${C.rev}) dt, SUM(${C.qty}) sl FROM ${T()}
        WHERE ${C.date} BETWEEN @s AND @e${dimWhere(f, p1, { storeExpr: SC })} GROUP BY store`, p1),
    bq(`SELECT ${C.diem} diem, FORMAT_DATE('%Y-%m-%d',${C.date}) d, ${C.bp} bp, SUM(${C.rev}) dt, SUM(${C.qty}) sl FROM ${T()}
        WHERE ${C.date} BETWEEN @s AND @e${dimWhere(f, p2, { storeExpr: SC })} GROUP BY diem, d, bp ORDER BY d`, p2),
  ]);
  const effTo = dailyBp.reduce((a: string, r: any) => (r.d > a ? r.d : a), from);
  const bsp = spanSet(from, effTo)[base] || spanSet(from, effTo).prevM;
  const p3 = [P("s", "DATE", bsp.from), P("e", "DATE", bsp.to)];
  const prevStore = await bq(`SELECT ${SC} store, SUM(${C.rev}) dt FROM ${T()} WHERE ${C.date} BETWEEN @s AND @e${dimWhere(f, p3, { storeExpr: SC })} GROUP BY store`, p3);
  const pM = new Map(prevStore.map((r: any) => [r.store, N(r.dt)]));
  const allBps = [...new Set(curStore.map((r: any) => r.bp))].sort();

  const dmap: any = {};
  for (const r of dailyBp) {
    (dmap[r.diem] ||= {});
    const dd = (dmap[r.diem][r.d] ||= { byBp: {}, sl: 0 });
    dd.byBp[r.bp] = (dd.byBp[r.bp] || 0) + N(r.dt);
    dd.sl += N(r.sl);
  }
  const diemList = [...new Set(curStore.map((r: any) => r.diem))];
  const out = diemList.map((diem: any) => {
    const rows = curStore.filter((r: any) => r.diem === diem);
    const dt = rows.reduce((a: number, r: any) => a + N(r.dt), 0), sl = rows.reduce((a: number, r: any) => a + N(r.sl), 0);
    const dtPrev = rows.reduce((a: number, r: any) => a + (Number(pM.get(r.store)) || 0), 0);
    const bps = [...new Set(rows.map((r: any) => r.bp))].sort();
    const days = Object.keys(dmap[diem] || {}).sort();
    const daily = days.map((d: any) => { const e = dmap[diem][d]; const byBp: any = {}; for (const b of allBps as any[]) byBp[b as any] = e.byBp[b as any] || 0; return { d, byBp, sl: e.sl }; });
    const storesAll = rows.map((r: any) => ({
      store: r.store, bp: r.bp, dt: N(r.dt), sl: N(r.sl),
      prev: Number(pM.get(r.store)) || 0, momPct: (Number(pM.get(r.store)) || 0) > 0 ? (N(r.dt) - (Number(pM.get(r.store)) || 0)) / (Number(pM.get(r.store)) || 0) * 100 : null,
    })).sort((a: any, b: any) => b.dt - a.dt);
    return {
      diem, tram: rows[0]?.tram || "", dt, dtPrev, momPct: dtPrev > 0 ? (dt - dtPrev) / dtPrev * 100 : null,
      sl, storeCount: rows.length, bps, daily, stores: storesAll.slice(0, 10), storesAll,
    };
  }).sort((a: any, b: any) => b.dt - a.dt);
  return { from, to, effTo, base, spans: spanSet(from, effTo), allBps, diems: out };
}

/* ============ KV (Postgres dùng chung) — ghi chú + khai báo quầy ============ */
async function kvGet(k: string): Promise<string> {
  const r = await query<{ v: string }>(`SELECT v FROM catalog.kv WHERE k = $1`, [k]);
  return r[0]?.v || "";
}
async function kvSet(k: string, v: string): Promise<void> {
  await query(`INSERT INTO catalog.kv (k, v, updated_at) VALUES ($1, $2, now())
     ON CONFLICT (k) DO UPDATE SET v = $2, updated_at = now()`, [k, v]);
}
async function kvDel(k: string): Promise<void> {
  await query(`DELETE FROM catalog.kv WHERE k = $1`, [k]);
}

/* ============ note ============ */
const NOTE_PREFIX = "note:";
const safeKey = (k: any) => NOTE_PREFIX + String(k || "").slice(0, 400).replace(/[^\w:.\-]/g, "_");
const jsonResp = (o: any, status = 200) =>
  new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });

export async function noteHandler(request: Request): Promise<Response> {
  const url = new URL(request.url);
  try {
    if (request.method === "POST") {
      let body: any;
      try { body = await request.json(); } catch { return jsonResp({ error: "JSON không hợp lệ" }, 400); }
      if (!body.key) return jsonResp({ error: "thiếu key" }, 400);
      const key = safeKey(body.key);
      const text = String(body.text || "").slice(0, 20000);
      if (text) await kvSet(key, text); else await kvDel(key);
      return jsonResp({ ok: true, stored: true });
    }
    const rawKey = url.searchParams.get("key");
    if (!rawKey) return jsonResp({ error: "thiếu key" }, 400);
    const text = await kvGet(safeKey(rawKey));
    return jsonResp({ key: rawKey, text });
  } catch (e: any) {
    return jsonResp({ error: String(e?.message || e) }, 500);
  }
}

/* ============ storemap ============ */
export async function storemapHandler(request: Request): Promise<Response> {
  try {
    if (request.method === "POST") {
      let body: any;
      try { body = await request.json(); } catch { return jsonResp({ error: "JSON không hợp lệ" }, 400); }
      const rules = (Array.isArray(body.rules) ? body.rules : []).map((r: any) => ({
        id: String(r.id || "").slice(0, 40) || "r" + Math.random().toString(36).slice(2, 8),
        type: r.type === "rename" ? "rename" : "merge",
        from: [...new Set((r.from || []).map(SAFE_CODE).filter(Boolean))],
        to: SAFE_CODE(r.to), note: String(r.note || "").slice(0, 200), ts: String(r.ts || "").slice(0, 20),
      })).filter((r: any) => r.to && r.from.length);
      const cfg = { enabled: body.enabled !== false, rules, v: Date.now() };
      await kvSet(SMAP_KEY, JSON.stringify(cfg));
      return jsonResp({ ok: true, stored: true, cfg });
    }
    const cfg = await getStoreMap();
    return jsonResp({ enabled: !!cfg.enabled, rules: cfg.rules || [] });
  } catch (e: any) {
    return jsonResp({ error: String(e?.message || e) }, 500);
  }
}
