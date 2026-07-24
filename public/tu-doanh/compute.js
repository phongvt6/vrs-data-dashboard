/**
 * compute.js — Toàn bộ logic tính cho app "Doanh thu tự doanh".
 * Chạy TRONG TRÌNH DUYỆT: nạp bằng <script src="/compute.js">, lộ ra biến toàn cục `Compute`.
 * Front-end gọi Compute.buildREC/setData rồi Compute.meta/overview/compare/groups/skus/catalog/diemtram.
 * Bọc trong IIFE để KHÔNG rò các biến nội bộ (pad, daysInMonth...) ra global (tránh trùng với index.html).
 */
(function () {

/* ================= TIỆN ÍCH ================= */
const pad = n => String(n).padStart(2, "0");
const iso = d => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const daysInMonth = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const uniq = a => [...new Set(a)];
const inCsv = (csv, v) => !csv || csv.split(",").includes(v);
function addDays(s, n) { return iso(new Date(new Date(s + "T00:00:00Z").getTime() + n * 86400000)); }
function addMonths(s, d) { let [y, m, day] = s.split("-").map(Number); m += d; while (m < 1) { m += 12; y--; } while (m > 12) { m -= 12; y++; } const dim = daysInMonth(y, m); if (day > dim) day = dim; return `${y}-${pad(m)}-${pad(day)}`; }
function addYears(s, d) { let [y, m, day] = s.split("-").map(Number); y += d; const dim = daysInMonth(y, m); if (day > dim) day = dim; return `${y}-${pad(m)}-${pad(day)}`; }
function monthsInRange(from, to) { const out = []; let [y, m] = from.split("-").map(Number); const [ty, tm] = to.split("-").map(Number); while (y < ty || (y === ty && m <= tm)) { out.push(`${y}-${pad(m)}`); m++; if (m > 12) { m = 1; y++; } } return out; }
function spanSet(from, effTo) {
  const yr = Number(effTo.slice(0, 4));
  return {
    cur: { from, to: effTo }, prevW: { from: addDays(from, -7), to: addDays(effTo, -7) }, prevWY: { from: addDays(from, -364), to: addDays(effTo, -364) },
    prevM: { from: addMonths(from, -1), to: addMonths(effTo, -1) }, prevY: { from: addYears(from, -1), to: addYears(effTo, -1) },
    ytd: { from: `${yr}-01-01`, to: effTo }, ytdPrev: { from: `${yr - 1}-01-01`, to: addYears(effTo, -1) }
  };
}
const dmy = s => { const p = s.split("-"); return p[2] + "/" + p[1]; };
function pack(labels, cur, prev, names, curLabel, prevLabel, metric) { return { mode: "ok", metric, names, labels, cur, prev, curLabel, prevLabel, curTotal: cur.reduce((a, b) => a + b, 0), prevTotal: prev.reduce((a, b) => a + b, 0) }; }

/* ================= PARSE CSV → REC =================
 * Parse theo TỪNG DÒNG (dữ liệu không có xuống dòng trong ô). Dòng không có dấu " → split(',') cực nhanh;
 * chỉ dòng có " (tên hàng chứa dấu phẩy) mới quét kỹ. Nhanh hơn nhiều bản char-by-char cũ → tránh vượt CPU Worker.  */
function parseLine(line) {
  const row = []; const L = line.length; let p = 0;
  while (p <= L) {
    if (p < L && line.charCodeAt(p) === 34) { // ký tự "
      let q = p + 1, buf = "";
      const close = line.indexOf('"', q);
      if (close !== -1 && line.charCodeAt(close + 1) !== 34) { buf = line.slice(q, close); p = close + 1; } // trường hợp phổ biến: không có "" lồng
      else { while (q < L) { const c = line.charCodeAt(q); if (c === 34) { if (line.charCodeAt(q + 1) === 34) { buf += '"'; q += 2; } else { q++; break; } } else { buf += line[q]; q++; } } p = q; }
      row.push(buf);
      if (p < L && line.charCodeAt(p) === 44) p++; else p = L + 1;
    } else {
      const c = line.indexOf(",", p);
      if (c === -1) { row.push(line.slice(p)); p = L + 1; } else { row.push(line.slice(p, c)); p = c + 1; }
    }
  }
  return row;
}
function parseCSV(text) {
  const rows = []; const N = text.length; let i = 0;
  while (i < N) {
    let nl = text.indexOf("\n", i); if (nl === -1) nl = N;
    let end = nl; if (end > i && text.charCodeAt(end - 1) === 13) end--; // bỏ \r
    if (end > i) { const line = text.slice(i, end); rows.push(line.indexOf('"') === -1 ? line.split(",") : parseLine(line)); }
    i = nl + 1;
  }
  return rows;
}
const num = s => { const n = parseFloat(String(s == null ? "" : s).replace(/[^0-9.\-]/g, "")); return isNaN(n) ? 0 : n; };
function normDate(s, order) {
  s = String(s == null ? "" : s).trim(); if (!s) return "";
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); if (m) return `${m[1]}-${pad(+m[2])}-${pad(+m[3])}`;
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) { let a = +m[1], b = +m[2], y = +m[3], mo, day; if (order === "DMY") { day = a; mo = b; } else { mo = a; day = b; } if (mo > 12 && day <= 12) { const t = mo; mo = day; day = t; } return `${y}-${pad(mo)}-${pad(day)}`; }
  return "";
}
const DEFAULT_COL = { date: "ngay_thang", store: "ma_cua_hang", sku: "ma_sku", ten: "ten_hang_hoa", qty: "so_luong", km: "tien_km", rev: "doanh_thu", bp: "bo_phan", tram: "tram", diem: "diem_tram", group: "nhom_hang_cu" };
// Đọc 1 dòng CSV bắt đầu ở i, trả {row, next}. row=mảng ô của dòng (bỏ qua nếu rỗng → row=null).
function lineAt(text, i, N) {
  let nl = text.indexOf("\n", i); if (nl === -1) nl = N;
  let end = nl; if (end > i && text.charCodeAt(end - 1) === 13) end--;
  const row = end > i ? (text.slice(i, end).indexOf('"') === -1 ? text.slice(i, end).split(",") : parseLine(text.slice(i, end))) : null;
  return { row, next: nl + 1 };
}
/* buildREC theo LUỒNG: đọc từng dòng → tạo thẳng bản ghi → KHÔNG giữ mảng 2D toàn file (109k×13 ô).
 * Giảm mạnh CPU + bộ nhớ để Worker không vượt giới hạn (lỗi 1102) khi dữ liệu lớn.  */
function buildREC(text, COL, dateOrder) {
  COL = COL || DEFAULT_COL; dateOrder = dateOrder || "MDY";
  const N = text.length; if (!N) return [];
  let h = lineAt(text, 0, N); if (!h.row) return [];
  const hdr = h.row.map(x => x.trim()); const I = n => hdr.indexOf(n);
  const ci = { date: I(COL.date), store: I(COL.store), sku: I(COL.sku), ten: I(COL.ten), qty: I(COL.qty), km: I(COL.km), rev: I(COL.rev), bp: I(COL.bp), tram: I(COL.tram), diem: I(COL.diem), group: I(COL.group) };
  const pool = new Map();   // gộp chuỗi trùng: mọi ô cùng giá trị dùng chung 1 chuỗi → REC nhẹ hơn nhiều (ngày/trạm/nhóm... rất ít giá trị khác nhau)
  const it = v => { let s = pool.get(v); if (s === undefined) { s = v; pool.set(v, v); } return s; };
  const out = [];
  let i = h.next;
  while (i < N) {
    const r = lineAt(text, i, N); i = r.next; const row = r.row;
    if (!row || row.length < 3) continue;
    const date = normDate(row[ci.date], dateOrder); if (!date) continue;
    out.push({
      date: it(date), ym: it(date.slice(0, 7)), y: Number(date.slice(0, 4)),
      store: it((row[ci.store] || "").trim()), tram: it((row[ci.tram] || "").trim()), diem: it((row[ci.diem] || "").trim()),
      bp: it((row[ci.bp] || "").trim()), group: it((row[ci.group] || "").trim()), sku: it((row[ci.sku] || "").trim()), ten: it((row[ci.ten] || "").trim()),
      qty: Math.round(num(row[ci.qty])), dt: Math.round(num(row[ci.rev])), km: Math.round(num(row[ci.km]))
    });
  }
  return out;
}

/* ================= STATE ================= */
const S = { REC: [], allMonths: [], firstDate: "", latestDate: "", allGroups: [], TARGET: {} };
function setData(rec) {
  S.REC = rec;
  S.allMonths = uniq(rec.map(r => r.ym)).sort();
  S.firstDate = rec.reduce((a, r) => (r.date < a ? r.date : a), "9999");
  S.latestDate = rec.reduce((a, r) => (r.date > a ? r.date : a), "");
  S.allGroups = uniq(rec.map(r => r.group));
  return S;
}

/* ================= /api/meta ================= */
function meta() {
  return { trams: uniq(S.REC.map(r => r.tram)).sort(), diems: uniq(S.REC.map(r => r.diem)).sort(), bps: uniq(S.REC.map(r => r.bp)).sort(), groups: S.allGroups, months: S.allMonths, firstDate: S.firstDate, lastDate: S.latestDate };
}

/* ================= /api/overview ================= */
function overview(f) {
  const REC = S.REC, latestDate = S.latestDate, TARGET = S.TARGET;
  const to = f.to || latestDate; const from = f.from || (to.slice(0, 7) + "-01");
  const dims = r => inCsv(f.tram, r.tram) && inCsv(f.bp, r.bp) && inCsv(f.group, r.group);
  const inR = (r, a, b) => r.date >= a && r.date <= b;
  const cur = REC.filter(r => dims(r) && inR(r, from, to));
  const effTo = cur.length ? cur.reduce((a, r) => (r.date > a ? r.date : a), "") : to;
  const spans = { cur: { from, to: effTo }, prevW: { from: addDays(from, -7), to: addDays(effTo, -7) }, prevWY: { from: addDays(from, -364), to: addDays(effTo, -364) }, prevM: { from: addMonths(from, -1), to: addMonths(effTo, -1) }, prevY: { from: addYears(from, -1), to: addYears(effTo, -1) } };
  const per = { cur }; for (const k of ["prevW", "prevWY", "prevM", "prevY"]) per[k] = REC.filter(r => dims(r) && inR(r, spans[k].from, spans[k].to));
  const Ssum = (rows, k) => rows.reduce((a, r) => a + (k ? r[k] : r.dt), 0); const KEYS = ["cur", "prevW", "prevWY", "prevM", "prevY"];
  const total = { km: Ssum(cur, "km"), sl: Ssum(cur, "qty"), slPrevM: Ssum(per.prevM, "qty"), slPrevY: Ssum(per.prevY, "qty") };
  for (const k of KEYS) total[k] = Ssum(per[k]);
  const dd = new Map(); for (const r of cur) { const e = dd.get(r.date) || { dt: 0, sl: 0 }; e.dt += r.dt; e.sl += r.qty; dd.set(r.date, e); }
  const daily = [...dd.entries()].map(([d, v]) => ({ d, dt: v.dt, sl: v.sl })).sort((a, b) => (a.d < b.d ? -1 : 1));
  const byDim = (keyFn, extra) => { const names = uniq([...per.cur, ...per.prevM, ...per.prevY].map(keyFn)); return names.map(n => { const o = { name: n }; for (const k of KEYS) o[k] = Ssum(per[k].filter(r => keyFn(r) === n)); return { ...o, ...(extra ? extra(n) : {}) }; }).sort((a, b) => b.cur - a.cur); };
  const byTram = byDim(r => r.tram), byDiem = byDim(r => r.diem), byBp = byDim(r => r.bp);
  const months = monthsInRange(from, to); const storeTarget = st => months.reduce(a => a + (TARGET[st] || 0), 0);
  const byStore = byDim(r => r.store, (n) => { const m = REC.find(r => r.store === n); const tg = storeTarget(n); const c = per.cur.filter(r => r.store === n); return { tram: m ? m.tram : "", diem: m ? m.diem : "", bp: m ? m.bp : "", sl: Ssum(c, "qty"), target: tg, pct: tg ? Ssum(c) / tg : 0 }; });
  const yr = Number(to.slice(0, 4));
  const monEval = (yy, mm) => REC.filter(r => r.y === yy && Number(r.date.slice(5, 7)) === mm && dims(r)).reduce((a, r) => a + r.dt, 0);
  const monthly = { year: yr, labels: Array.from({ length: 12 }, (_, i) => "T" + (i + 1)), cur: Array.from({ length: 12 }, (_, i) => monEval(yr, i + 1)), prev: Array.from({ length: 12 }, (_, i) => monEval(yr - 1, i + 1)) };
  const noGrp = (a, b) => REC.filter(r => inCsv(f.tram, r.tram) && inCsv(f.bp, r.bp) && inR(r, a, b));
  const gCur = noGrp(from, effTo), gPm = noGrp(spans.prevM.from, spans.prevM.to), gPy = noGrp(spans.prevY.from, spans.prevY.to);
  const gmap = rows => { const m = new Map(); for (const r of rows) m.set(r.group, (m.get(r.group) || 0) + r.dt); return m; };
  const gc = gmap(gCur), gp = gmap(gPm), gy = gmap(gPy), gslm = new Map(); for (const r of gCur) gslm.set(r.group, (gslm.get(r.group) || 0) + r.qty);
  const gTot = [...gc.values()].reduce((a, b) => a + b, 0) || 1;
  const groups = [...gc.entries()].map(([group, dt]) => ({ group, dt, prevM: gp.get(group) || 0, prevY: gy.get(group) || 0, sl: gslm.get(group) || 0, share: dt / gTot })).sort((a, b) => b.dt - a.dt);
  const scur = new Map(); for (const r of gCur) { const e = scur.get(r.sku) || { ten: r.ten, group: r.group, cur: 0, sl: 0 }; e.cur += r.dt; e.sl += r.qty; scur.set(r.sku, e); }
  const spm = new Map(); for (const r of gPm) spm.set(r.sku, (spm.get(r.sku) || 0) + r.dt);
  const skuArr = [...scur.entries()].map(([sku, v]) => ({ sku, ...v, prevM: spm.get(sku) || 0, delta: v.cur - (spm.get(sku) || 0) }));
  const topSku = skuArr.slice().sort((a, b) => b.cur - a.cur).slice(0, 10);
  const up = skuArr.filter(x => x.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, 3);
  const down = skuArr.filter(x => x.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, 3);
  const totalTarget = byStore.reduce((a, s) => a + s.target, 0);
  const nDays = Math.round((Date.parse(effTo) - Date.parse(from)) / 86400000) + 1;
  const [ly, lm] = effTo.split("-").map(Number);
  const pace = months.length === 1 ? Number(effTo.split("-")[2]) / daysInMonth(ly, lm) : 1;
  return { from, to, effTo, latestInData: effTo, nDays, pace, spans, total, daily, monthly, byTram, byDiem, byBp, byStore, groups, topSku, skuMovers: { up, down }, kpi: { target: totalTarget, pctKpi: totalTarget ? total.cur / totalTarget : 0 } };
}

/* ================= /api/compare ================= */
function compare(f) {
  const REC = S.REC, latestDate = S.latestDate;
  const metric = f.metric === "sl" ? "sl" : "dt"; const val = r => (metric === "sl" ? r.qty : r.dt); const anchor = f.anchor || latestDate;
  const rows = REC.filter(r => inCsv(f.tram, r.tram) && inCsv(f.bp, r.bp) && inCsv(f.group, r.group));
  const names = ["Kỳ này", "Kỳ trước"]; const dnum = s => Number(s.split("-")[2]);
  if (f.mode === "week") {
    const last = new Date(anchor + "T00:00:00Z"); const wd = (last.getUTCDay() + 6) % 7; const cf = new Date(last.getTime() - wd * 86400000);
    const days = i => iso(new Date(cf.getTime() + i * 86400000)); const pv = i => iso(new Date(cf.getTime() + (i - 7) * 86400000)); const labels = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
    const cur = labels.map((_, i) => rows.filter(r => r.date === days(i)).reduce((a, r) => a + val(r), 0));
    const prev = labels.map((_, i) => rows.filter(r => r.date === pv(i)).reduce((a, r) => a + val(r), 0));
    return pack(labels, cur, prev, names, `Tuần này (${dmy(days(0))}–${dmy(days(6))})`, `Tuần trước (${dmy(pv(0))}–${dmy(pv(6))})`, metric);
  }
  if (f.mode === "year") {
    const y = Number(anchor.slice(0, 4)); const labels = Array.from({ length: 12 }, (_, i) => "T" + (i + 1));
    const cur = labels.map((_, i) => rows.filter(r => r.ym === `${y}-${pad(i + 1)}`).reduce((a, r) => a + val(r), 0));
    const prev = labels.map((_, i) => rows.filter(r => r.ym === `${y - 1}-${pad(i + 1)}`).reduce((a, r) => a + val(r), 0));
    return pack(labels, cur, prev, names, "Năm " + y, "Năm " + (y - 1), metric);
  }
  if (f.mode === "quarter") {
    const [ly, lm] = anchor.split("-").map(Number); const q = Math.floor((lm - 1) / 3);
    const curMs = [0, 1, 2].map(i => `${ly}-${pad(q * 3 + i + 1)}`); let py = ly, pq = q - 1; if (pq < 0) { pq = 3; py--; } const prevMs = [0, 1, 2].map(i => `${py}-${pad(pq * 3 + i + 1)}`);
    const labels = curMs.map(ym => "Th" + Number(ym.split("-")[1]));
    const cur = curMs.map(ym => rows.filter(r => r.ym === ym).reduce((a, r) => a + val(r), 0));
    const prev = prevMs.map(ym => rows.filter(r => r.ym === ym).reduce((a, r) => a + val(r), 0));
    return pack(labels, cur, prev, names, `Quý ${q + 1}/${ly}`, `Quý ${pq + 1}/${py}`, metric);
  }
  const month = f.month || anchor.slice(0, 7); const [y, m] = month.split("-").map(Number); const pm = addMonths(month + "-01", -1).slice(0, 7); const nDays = daysInMonth(y, m);
  const labels = Array.from({ length: nDays }, (_, i) => String(i + 1));
  const cur = labels.map((_, i) => rows.filter(r => r.ym === month && dnum(r.date) === i + 1).reduce((a, r) => a + val(r), 0));
  const prev = labels.map((_, i) => rows.filter(r => r.ym === pm && dnum(r.date) === i + 1).reduce((a, r) => a + val(r), 0));
  const [pmy, pmm] = pm.split("-"); return pack(labels, cur, prev, names, `Tháng ${m}/${y}`, `Tháng ${pmm * 1}/${pmy}`, metric);
}

/* ================= /api/groups ================= */
function groupsApi(f) {
  const REC = S.REC, latestDate = S.latestDate, allMonths = S.allMonths, allGroups = S.allGroups;
  const to = f.to || latestDate; const from = f.from || (to.slice(0, 7) + "-01");
  const ff = r => inCsv(f.tram, r.tram) && inCsv(f.bp, r.bp); const inR = (r, a, b) => r.date >= a && r.date <= b;
  const cur = REC.filter(r => ff(r) && inR(r, from, to)); const effTo = cur.length ? cur.reduce((a, r) => (r.date > a ? r.date : a), "") : to;
  const spans = spanSet(from, effTo);
  const gsum = rows => { const m = new Map(); for (const r of rows) m.set(r.group, (m.get(r.group) || 0) + r.dt); return m; };
  const M = {}; for (const k in spans) M[k] = gsum(REC.filter(r => ff(r) && inR(r, spans[k].from, spans[k].to)));
  const gsl = new Map(); for (const r of cur) gsl.set(r.group, (gsl.get(r.group) || 0) + r.qty);
  const tot = [...M.cur.values()].reduce((a, b) => a + b, 0) || 1;
  const table = [...M.cur.entries()].map(([group, dt]) => ({ group, dt, sl: gsl.get(group) || 0, share: dt / tot, prevW: M.prevW.get(group) || 0, prevWY: M.prevWY.get(group) || 0, prevM: M.prevM.get(group) || 0, prevY: M.prevY.get(group) || 0, ytd: M.ytd.get(group) || 0, ytdPrev: M.ytdPrev.get(group) || 0 })).sort((a, b) => b.dt - a.dt);
  const structure = table.map(g => ({ group: g.group, dt: g.dt, sl: g.sl, share: g.share }));
  const endYm = to.slice(0, 7); const trendMonths = allMonths.filter(ym => ym <= endYm).slice(-12);
  const labels = trendMonths.map(ym => { const [yy, mm] = ym.split("-"); return "T" + (mm * 1) + "/" + yy.slice(2); });
  const series = allGroups.map(grp => ({ group: grp, data: trendMonths.map(ym => REC.filter(r => r.ym === ym && r.group === grp && ff(r)).reduce((a, r) => a + r.dt, 0)) }));
  const sm = new Map(); for (const r of cur) { const e = sm.get(r.sku) || { ten: r.ten, group: r.group, dt: 0, sl: 0 }; e.dt += r.dt; e.sl += r.qty; sm.set(r.sku, e); }
  const top10Sku = [...sm.entries()].map(([sku, v]) => ({ sku, ...v })).sort((a, b) => b.dt - a.dt).slice(0, 10);
  return { from, to, effTo, spans, structure, table, trend: { labels, series }, top10Sku };
}

/* ================= /api/skus ================= */
function skusApi(f) {
  const REC = S.REC, latestDate = S.latestDate;
  const to = f.to || latestDate; const from = f.from || (to.slice(0, 7) + "-01"); const group = f.group; const base = f.base || "prevM";
  const ff = r => inCsv(f.tram, r.tram) && inCsv(f.bp, r.bp) && r.group === group; const inR = (r, a, b) => r.date >= a && r.date <= b;
  const cur = REC.filter(r => ff(r) && inR(r, from, to)); const effTo = cur.length ? cur.reduce((a, r) => (r.date > a ? r.date : a), "") : to;
  const bsp = spanSet(from, effTo)[base] || spanSet(from, effTo).prevM;
  const pm = REC.filter(r => ff(r) && inR(r, bsp.from, bsp.to));
  const sc = new Map(); for (const r of cur) { const e = sc.get(r.sku) || { ten: r.ten, dt: 0, sl: 0 }; e.dt += r.dt; e.sl += r.qty; sc.set(r.sku, e); }
  const sp = new Map(); for (const r of pm) sp.set(r.sku, (sp.get(r.sku) || 0) + r.dt);
  const tot = [...sc.values()].reduce((a, x) => a + x.dt, 0) || 1;
  const all = [...sc.entries()].map(([sku, v]) => ({ sku, ten: v.ten, dt: v.dt, sl: v.sl, share: v.dt / tot, momPct: (sp.get(sku) || 0) > 0 ? (v.dt - (sp.get(sku) || 0)) / (sp.get(sku) || 0) * 100 : null })).sort((a, b) => b.dt - a.dt);
  // PARETO: lấy các mã cộng dồn doanh thu tới 80% doanh thu nhóm (nhóm mã cần tập trung khai thác)
  const PARETO = 0.8; const cutoff = tot * PARETO; let cum = 0, n = 0;
  for (const s of all) { cum += s.dt; n++; if (cum >= cutoff) break; }
  n = Math.min(Math.max(1, n), all.length); const shown = all.slice(0, n);
  const shownTotal = shown.reduce((a, x) => a + x.dt, 0);
  return { group, base, from, to, count: all.length, topN: n, pareto: PARETO, groupTotal: tot, shownTotal, skus: shown };
}

/* ================= /api/catalog =================
 * Lọc ĐƠN CHỌN, liên thông: trạm(tr) / điểm trạm(di) / bộ phận(bp) / cửa hàng(st).
 * Trả về facet 3 chiều (mỗi option kèm doanh thu để vẽ thanh) + danh sách cửa hàng + bảng SKU.  */
function catalogApi(f) {
  const REC = S.REC, latestDate = S.latestDate;
  const to = f.to || latestDate; const from = f.from || (to.slice(0, 7) + "-01"); const group = f.group || "";
  const tr = f.tram || "", di = f.diem || "", bp = f.bp || "", st = f.store || "";   // CSV chọn nhiều ("" = tất cả)
  const btw = (r, a, b) => r.date >= a && r.date <= b;
  const base = REC.filter(r => btw(r, from, to) && inCsv(group, r.group));
  const effTo = base.length ? base.reduce((a, r) => (r.date > a ? r.date : a), "") : to;
  // facet: gom theo keyFn, tính doanh thu, lọc theo CÁC chiều khác đang chọn (liên thông)
  const facet = (keyFn, ok) => { const m = new Map(), meta = new Map();
    for (const r of base) { if (ok(r)) { const k = keyFn(r); m.set(k, (m.get(k) || 0) + r.dt); if (!meta.has(k)) meta.set(k, r); } }
    return [...m.entries()].map(([name, dt]) => ({ name, dt, tram: meta.get(name).tram })).sort((a, b) => b.dt - a.dt); };
  const trams = facet(r => r.tram, r => inCsv(di, r.diem) && inCsv(bp, r.bp) && inCsv(st, r.store));
  const diems = facet(r => r.diem, r => inCsv(tr, r.tram) && inCsv(bp, r.bp) && inCsv(st, r.store));
  const bps = facet(r => r.bp, r => inCsv(tr, r.tram) && inCsv(di, r.diem) && inCsv(st, r.store));
  // danh sách cửa hàng: lọc theo trạm/điểm/bộ phận (KHÔNG lọc theo cửa hàng để còn chuyển đổi)
  const sm = new Map(); for (const r of base) { if (inCsv(tr, r.tram) && inCsv(di, r.diem) && inCsv(bp, r.bp)) { const e = sm.get(r.store) || { store: r.store, tram: r.tram, diem: r.diem, bp: r.bp, dt: 0, sl: 0 }; e.dt += r.dt; e.sl += r.qty; sm.set(r.store, e); } }
  const stores = [...sm.values()].filter(s => s.dt > 0).sort((a, b) => b.dt - a.dt);
  // bảng SKU: lọc theo TẤT CẢ chiều đang chọn
  const sel = r => inCsv(tr, r.tram) && inCsv(di, r.diem) && inCsv(bp, r.bp) && inCsv(st, r.store);
  const cur = base.filter(sel);
  const cmpBase = f.base || "prevM";   // mốc so sánh cho cột "so ..." (prevW/prevWY/prevM/prevY/ytd)
  const bsp = spanSet(from, effTo)[cmpBase] || spanSet(from, effTo).prevM;
  const pm = REC.filter(r => btw(r, bsp.from, bsp.to) && inCsv(group, r.group) && sel(r));
  const gtot = new Map(); for (const r of cur) gtot.set(r.group, (gtot.get(r.group) || 0) + r.dt);
  const sc = new Map(); for (const r of cur) { const e = sc.get(r.sku) || { ten: r.ten, group: r.group, dt: 0, sl: 0 }; e.dt += r.dt; e.sl += r.qty; sc.set(r.sku, e); }
  const sp = new Map(); for (const r of pm) sp.set(r.sku, (sp.get(r.sku) || 0) + r.dt);
  const skus = [...sc.entries()].map(([sku, v]) => ({ sku, ten: v.ten, group: v.group, dt: v.dt, sl: v.sl, donGia: v.sl ? Math.round(v.dt / v.sl) : 0, share: (gtot.get(v.group) || 1) ? v.dt / (gtot.get(v.group) || 1) : 0, momPct: (sp.get(sku) || 0) > 0 ? (v.dt - (sp.get(sku) || 0)) / (sp.get(sku) || 0) * 100 : null })).sort((a, b) => b.dt - a.dt);
  const gs = new Map(); for (const r of cur) { const e = gs.get(r.group) || { dt: 0, sl: 0, skus: new Set() }; e.dt += r.dt; e.sl += r.qty; e.skus.add(r.sku); gs.set(r.group, e); }
  const groups = [...gs.entries()].map(([grp, v]) => ({ group: grp, dt: v.dt, sl: v.sl, skuCount: v.skus.size })).sort((a, b) => b.dt - a.dt);
  return { from, to, effTo, group, groups, skus, trams, diems, bps, stores, base: cmpBase, bspan: bsp, sel: { tram: tr, diem: di, bp: bp, store: st } };
}

/* ================= /api/diemtram ================= */
function diemtramApi(f) {
  const REC = S.REC, latestDate = S.latestDate;
  const to = f.to || latestDate; const from = f.from || (to.slice(0, 7) + "-01"); const base = f.base || "prevM";
  const dims = r => inCsv(f.tram, r.tram) && inCsv(f.bp, r.bp) && inCsv(f.group, r.group); const inR = (r, a, b) => r.date >= a && r.date <= b;
  const cur = REC.filter(r => dims(r) && inR(r, from, to)); const effTo = cur.length ? cur.reduce((a, r) => (r.date > a ? r.date : a), "") : to;
  const bsp = spanSet(from, effTo)[base] || spanSet(from, effTo).prevM; const prev = REC.filter(r => dims(r) && inR(r, bsp.from, bsp.to));
  const allBps = uniq(cur.map(r => r.bp)).sort(); const diemList = uniq(cur.map(r => r.diem));
  const out = diemList.map(diem => {
    const rows = cur.filter(r => r.diem === diem); const prows = prev.filter(r => r.diem === diem);
    const dt = rows.reduce((a, r) => a + r.dt, 0), sl = rows.reduce((a, r) => a + r.qty, 0), dtPrev = prows.reduce((a, r) => a + r.dt, 0);
    const bps = uniq(rows.map(r => r.bp)).sort(); const days = uniq(rows.map(r => r.date)).sort();
    const daily = days.map(d => { const dr = rows.filter(r => r.date === d); const byBp = {}; for (const b of allBps) byBp[b] = dr.filter(r => r.bp === b).reduce((a, r) => a + r.dt, 0); return { d, byBp, sl: dr.reduce((a, r) => a + r.qty, 0) }; });
    const sm = new Map(); for (const r of rows) { const e = sm.get(r.store) || { bp: r.bp, dt: 0, sl: 0 }; e.dt += r.dt; e.sl += r.qty; sm.set(r.store, e); }
    const pS = new Map(); for (const r of prows) pS.set(r.store, (pS.get(r.store) || 0) + r.dt);
    const stores = [...sm.entries()].map(([store, v]) => ({ store, bp: v.bp, dt: v.dt, sl: v.sl, prev: pS.get(store) || 0, momPct: (pS.get(store) || 0) > 0 ? (v.dt - (pS.get(store) || 0)) / (pS.get(store) || 0) * 100 : null })).sort((a, b) => b.dt - a.dt);
    return { diem, tram: (rows[0] && rows[0].tram) || "", dt, dtPrev, momPct: dtPrev > 0 ? (dt - dtPrev) / dtPrev * 100 : null, sl, storeCount: uniq(rows.map(r => r.store)).length, bps, daily, stores: stores.slice(0, 10), storesAll: stores };
  }).sort((a, b) => b.dt - a.dt);
  return { from, to, effTo, base, spans: spanSet(from, effTo), allBps, diems: out };
}

const ROUTES = { "/api/meta": meta, "/api/overview": overview, "/api/compare": compare, "/api/groups": groupsApi, "/api/skus": skusApi, "/api/catalog": catalogApi, "/api/diemtram": diemtramApi };

const _API = { DEFAULT_COL, parseCSV, buildREC, setData, getState: () => S, meta, overview, compare, groupsApi, skusApi, catalogApi, diemtramApi, ROUTES };
(typeof self !== "undefined" ? self : this).Compute = _API;

})();
