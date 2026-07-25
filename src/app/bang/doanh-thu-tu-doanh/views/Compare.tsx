"use client";

// View "So sánh thời gian" — dữ liệu từ /api/tu-doanh/overview + /api/tu-doanh/diemtram.
// Combo cột+line theo đơn vị · bảng combo · diễn giải so sánh · Deep · section
// từng điểm trạm (stat · cột chồng theo bộ phận · heat table Top 10 cửa hàng).

import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import type { Filter, Overview, Diemtram, Diem, Unit } from "../lib/api";
import { api, toQuery } from "../lib/api";
import type { PeriodType } from "../filter";
import { Grid, Cell, Stat, Loading, Loi, Bang } from "../ui";
import { colorMap } from "../lib/colors";
import { ComboUnits, StackedSeries } from "../charts";
import { delta, tien, so, fmtPct, ngayDay } from "../lib/format";
import { Insight, Deep, deepUnits } from "./insight";
import { rampColor, SEQUENTIAL_BLUE, DIVERGING, STATUS, labelInk } from "@/chart/lib/theme";

/* -------- mốc so sánh -------- */

type BaseKey = "prevW" | "prevWY" | "prevM" | "prevY";
type ComboDim = "tram" | "diem" | "bp" | "store";

const BASE_LABEL: Record<BaseKey, string> = {
  prevW: "Tuần trước",
  prevWY: "Tuần cùng kỳ năm trước",
  prevM: "Tháng liền kề",
  prevY: "Cùng kỳ năm trước",
};

function baseOptions(pt: PeriodType): BaseKey[] {
  if (pt === "week") return ["prevW", "prevWY"];
  if (pt === "month") return ["prevM", "prevY"];
  if (pt === "year") return ["prevY"];
  return ["prevM", "prevY"];
}

const DIM_LABEL: Record<ComboDim, string> = { tram: "Trạm", diem: "Điểm trạm", bp: "Bộ phận", store: "Cửa hàng" };
const DIM_NOUN: Record<ComboDim, string> = { tram: "trạm", diem: "điểm trạm", bp: "bộ phận", store: "cửa hàng" };

/* -------- helper màu heat -------- */

const DIV = DIVERGING.light;

/** Trộn 2 màu hex theo tỷ lệ t ∈ [0,1] (0 = a, 1 = b). */
function hexMix(a: string, b: string, t: number): string {
  const p = (h: string) => [0, 2, 4].map((i) => parseInt(h.replace("#", "").slice(i, i + 2), 16));
  const [r1, g1, b1] = p(a);
  const [r2, g2, b2] = p(b);
  const m = (x: number, y: number) => Math.round(x + (y - x) * t);
  return `#${[m(r1, r2), m(g1, g2), m(b1, b2)].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/** Nền diverging cho %±: xanh nếu ≥0, đỏ nếu <0, đậm dần theo |pct| (bão hoà 30%). */
function divBg(pct: number): string {
  const t = Math.min(Math.abs(pct) / 30, 1);
  return hexMix(DIV.mid, pct >= 0 ? STATUS.good : STATUS.critical, t);
}

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/* -------- toggle -------- */

const toggleBtn = (active: boolean): CSSProperties => ({
  fontSize: 12,
  fontWeight: 600,
  padding: "5px 11px",
  borderRadius: 8,
  cursor: "pointer",
  border: `1px solid ${active ? "var(--accent)" : "var(--line-strong, var(--line))"}`,
  background: active ? "var(--accent)" : "var(--panel)",
  color: active ? "#fff" : "var(--ink)",
});

/* ================================================================= view === */

export default function CompareView({ filter, periodType }: { filter: Filter; periodType: PeriodType }) {
  const [ov, setOv] = useState<Overview | null>(null);
  const [dt, setDt] = useState<Diemtram | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [comboDim, setComboDim] = useState<ComboDim>("tram");
  const [cmpBase, setCmpBase] = useState<BaseKey>(() => baseOptions(periodType)[0]);

  // periodType đổi → giữ cmpBase hợp lệ trong tập options mới.
  useEffect(() => {
    const opts = baseOptions(periodType);
    setCmpBase((prev) => (opts.includes(prev) ? prev : opts[0]));
  }, [periodType]);

  // diemtram phụ thuộc base → refetch khi filter hoặc cmpBase đổi.
  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([
      api<Overview>("overview", toQuery(filter)),
      api<Diemtram>("diemtram", toQuery(filter, { base: cmpBase })),
    ])
      .then(([o, d]) => {
        if (!alive) return;
        setOv(o);
        setDt(d);
        setErr("");
      })
      .catch((e) => alive && setErr(String(e.message ?? e)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [filter, cmpBase]);

  if (err) return <Loi e={err} />;
  if (loading || !ov || !dt) return <Loading cao={400} />;

  const opts = baseOptions(periodType);
  const label = BASE_LABEL[cmpBase];
  const labelLo = lowerFirst(label);
  const t = ov.total;

  // --- đơn vị cho combo (chỉ hiện đơn vị CÓ dữ liệu theo bộ lọc hiện tại) ---
  const rawUnits: Unit[] =
    comboDim === "tram" ? ov.byTram : comboDim === "diem" ? ov.byDiem : comboDim === "bp" ? ov.byBp : ov.byStore;
  const units = rawUnits.filter((u) => u.cur > 0 || u[cmpBase] > 0).sort((a, b) => b.cur - a.cur);

  const cats = ["Toàn Cty", ...units.map((u) => u.name)];
  const cur = [t.cur, ...units.map((u) => u.cur)];
  const prev = [t[cmpBase], ...units.map((u) => u[cmpBase])];

  // hàng bảng combo: Toàn Cty trước, rồi từng đơn vị
  const tableRows = [
    { name: "Toàn Cty", cur: t.cur, base: t[cmpBase], bold: true },
    ...units.map((u) => ({ name: u.name, cur: u.cur, base: u[cmpBase], bold: false })),
  ];

  const sp = ov.spans[cmpBase];

  // diverging comboDim toggle → chỉ nút; đổi chỉ vẽ lại
  const dimToggle = (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      {(Object.keys(DIM_LABEL) as ComboDim[]).map((d) => (
        <button key={d} style={toggleBtn(comboDim === d)} onClick={() => setComboDim(d)}>
          {DIM_LABEL[d]}
        </button>
      ))}
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Mốc so sánh (gọi lại API) */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>Mốc so sánh:</span>
        {opts.map((k) => (
          <button key={k} style={toggleBtn(cmpBase === k)} onClick={() => setCmpBase(k)}>
            {BASE_LABEL[k]}
          </button>
        ))}
      </div>

      {/* 1. Combo chart */}
      <Cell
        w={12}
        title="So sánh doanh thu theo đơn vị"
        note={`Kỳ này ${ngayDay(ov.spans.cur.from)} – ${ngayDay(ov.spans.cur.to)} · theo ${DIM_NOUN[comboDim]} · so ${labelLo}`}
        right={dimToggle}
      >
        <ComboUnits cats={cats} cur={cur} prev={prev} curName="Kỳ này" prevName={label} />
      </Cell>

      {/* 2. Bảng combo */}
      <Cell w={12} title="Bảng so sánh theo đơn vị">
        <Bang
          cols={[
            { ten: "Đơn vị" },
            { ten: label, canh: "phai" },
            { ten: "Kỳ này", canh: "phai" },
            { ten: "Tăng/giảm", canh: "phai" },
            { ten: "%", canh: "phai" },
          ]}
        >
          {tableRows.map((r, i) => {
            const dl = delta(r.cur, r.base);
            const sign = dl.abs >= 0 ? "+" : "−";
            return (
              <tr
                key={r.name + i}
                style={{ borderTop: i ? "1px solid var(--line)" : "none", fontWeight: r.bold ? 700 : 400 }}
              >
                <td style={{ padding: "6px 8px", maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {r.name}
                </td>
                <td style={{ padding: "6px 8px", textAlign: "right" }} className="mono">{tien(r.base)}</td>
                <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 600 }} className="mono">{tien(r.cur)}</td>
                <td
                  style={{ padding: "6px 8px", textAlign: "right", color: dl.abs >= 0 ? "#006300" : "#d03b3b" }}
                  className="mono"
                >
                  {sign}
                  {tien(Math.abs(dl.abs))}
                </td>
                <td
                  style={{ padding: "6px 8px", textAlign: "right", fontWeight: 600, color: dl.pct == null ? "var(--ink-soft)" : dl.good ? "#006300" : "#d03b3b" }}
                  className="mono"
                >
                  {fmtPct(dl.pct)}
                </td>
              </tr>
            );
          })}
        </Bang>
      </Cell>

      {/* 3. Chú thích spans */}
      <p style={{ fontSize: 11.5, color: "var(--ink-soft)", margin: "0 2px" }}>
        Mốc so sánh đều lấy đúng số ngày có dữ liệu, đến {ngayDay(ov.effTo)}: <b>Kỳ này</b> {ngayDay(ov.spans.cur.from)} – {ngayDay(ov.spans.cur.to)} · <b>so {labelLo}</b> {ngayDay(sp.from)} – {ngayDay(sp.to)}.
      </p>

      {/* 4. Diễn giải so sánh */}
      <Insight tieu_de="✦ Phân tích so sánh" lines={insightCompare(ov, units, cmpBase, label)} />

      {/* 5. Deep */}
      <Deep
        blocks={deepUnits(
          units.map((u) => ({ name: u.name, cur: u.cur, prev: u[cmpBase] })),
          DIM_NOUN[comboDim],
          t.cur,
          t[cmpBase]
        )}
      />

      {/* 6. Section từng điểm trạm */}
      {dt.diems.map((D) => (
        <DiemSection key={D.diem} D={D} allBps={dt.allBps} label={label} />
      ))}
      {!dt.diems.length && (
        <Cell w={12}>
          <div style={{ padding: 16, color: "var(--ink-soft)", fontSize: 13 }}>Không có dữ liệu điểm trạm.</div>
        </Cell>
      )}
    </div>
  );
}

/* ---------------------------------------------------------- section điểm --- */

function DiemSection({ D, allBps, label }: { D: Diem; allBps: string[]; label: string }) {
  const labelLo = lowerFirst(label);
  const bpColor = colorMap(allBps);

  // cột chồng theo bộ phận theo ngày — kỳ dài (>40 điểm) thì gộp theo tháng
  let daily: { byBp: Record<string, number>; sl: number }[];
  let labels: string[];
  if (D.daily.length > 40) {
    const m = new Map<string, { byBp: Record<string, number>; sl: number }>();
    for (const x of D.daily) {
      const ym = x.d.slice(0, 7);
      let e = m.get(ym);
      if (!e) {
        e = { byBp: {}, sl: 0 };
        m.set(ym, e);
      }
      for (const b in x.byBp) e.byBp[b] = (e.byBp[b] || 0) + x.byBp[b];
      e.sl += x.sl;
    }
    const entries = [...m.entries()];
    labels = entries.map(([ym]) => `${ym.slice(5, 7)}/${ym.slice(0, 4)}`);
    daily = entries.map(([, e]) => e);
  } else {
    labels = D.daily.map((x) => `${x.d.slice(8, 10)}/${x.d.slice(5, 7)}`);
    daily = D.daily.map((x) => ({ byBp: x.byBp, sl: x.sl }));
  }
  const series = D.bps.map((b) => ({ name: b, color: bpColor(b), data: daily.map((x) => x.byBp[b] || 0) }));

  // heat table Top 10 cửa hàng
  const maxDt = Math.max(1, ...D.stores.map((s) => s.dt));
  const maxSl = Math.max(1, ...D.stores.map((s) => s.sl));

  return (
    <Cell w={12} title={D.diem} note={`Trạm ${D.tram}`}>
      {/* 4 stat */}
      <Grid style={{ gridTemplateColumns: "repeat(4, 1fr)", marginBottom: 12 }}>
        <Stat nhan="Doanh thu" giaTri={tien(D.dt)} />
        <Stat nhan="Sản lượng" giaTri={`${so(D.sl)} sp`} />
        <Stat nhan="Số cửa hàng" giaTri={so(D.storeCount)} />
        <Stat nhan={`So ${labelLo}`} giaTri={fmtPct(D.momPct)} />
      </Grid>

      {/* note insightDiem */}
      <p style={{ fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.5, margin: "0 0 12px" }}>
        {insightDiem(D, labelLo)}
      </p>

      <Grid style={{ gridTemplateColumns: "1fr 1fr" }}>
        {/* cột chồng theo bộ phận */}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>Doanh thu theo bộ phận</div>
          <StackedSeries labels={labels} series={series} height={236} />
        </div>

        {/* heat table Top 10 cửa hàng */}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 6 }}>Top 10 cửa hàng</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
              <thead>
                <tr>
                  {["Cửa hàng", "Doanh thu", "Sản lượng", `So ${labelLo}`].map((h, i) => (
                    <th
                      key={h}
                      style={{
                        textAlign: i === 0 ? "left" : "right",
                        padding: "6px 8px",
                        borderBottom: "1px solid var(--line)",
                        color: "var(--ink-soft)",
                        fontSize: 11,
                        fontWeight: 600,
                        textTransform: "uppercase",
                        letterSpacing: "0.03em",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {D.stores.map((s, i) => {
                  const dtBg = rampColor(SEQUENTIAL_BLUE, s.dt / maxDt);
                  const slBg = rampColor(SEQUENTIAL_BLUE, s.sl / maxSl);
                  const momBg = s.momPct == null ? "transparent" : divBg(s.momPct);
                  return (
                    <tr key={s.store + i}>
                      <td
                        style={{
                          padding: "6px 8px",
                          maxWidth: 160,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          fontWeight: 600,
                          borderTop: i ? "1px solid var(--line)" : "none",
                        }}
                      >
                        {s.store}
                      </td>
                      <td style={{ padding: "6px 8px", textAlign: "right", background: dtBg, color: labelInk(dtBg) }} className="mono">
                        {tien(s.dt)}
                      </td>
                      <td style={{ padding: "6px 8px", textAlign: "right", background: slBg, color: labelInk(slBg) }} className="mono">
                        {so(s.sl)}
                      </td>
                      <td
                        style={{
                          padding: "6px 8px",
                          textAlign: "right",
                          background: momBg,
                          color: s.momPct == null ? "var(--ink-soft)" : labelInk(momBg),
                          fontWeight: 600,
                        }}
                        className="mono"
                      >
                        {fmtPct(s.momPct)}
                      </td>
                    </tr>
                  );
                })}
                {!D.stores.length && (
                  <tr>
                    <td colSpan={4} style={{ padding: 12, color: "var(--ink-soft)", textAlign: "center" }}>
                      —
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Grid>
    </Cell>
  );
}

/* ------------------------------------------------------------- diễn giải --- */

function insightCompare(ov: Overview, units: Unit[], base: BaseKey, label: string): string[] {
  const t = ov.total;
  const dd = delta(t.cur, t[base]);
  const lines: string[] = [];
  lines.push(
    `So với ${lowerFirst(label)}, doanh thu toàn Cty ${fmtPct(dd.pct)} (kỳ này ${tien(t.cur)} vs ${tien(t[base])}).`
  );
  const movers = units.map((u) => ({ name: u.name, de: u.cur - u[base] })).sort((a, b) => b.de - a.de);
  const up = movers.filter((x) => x.de > 0).slice(0, 2);
  const dn = movers.filter((x) => x.de < 0).slice(-2).reverse();
  if (up.length) lines.push(`Đơn vị tăng tốt nhất: ${up.map((x) => `${x.name} (+${tien(x.de)})`).join(", ")}.`);
  if (dn.length) lines.push(`Đơn vị giảm nhiều nhất: ${dn.map((x) => `${x.name} (${tien(x.de)})`).join(", ")}.`);
  return lines;
}

function insightDiem(D: Diem, labelLo: string): string {
  const list = (D.storesAll || []).filter((s) => s.momPct != null);
  const up = [...list].sort((a, b) => (b.momPct as number) - (a.momPct as number))[0];
  const dn = [...list].sort((a, b) => (a.momPct as number) - (b.momPct as number))[0];
  const lead = D.storesAll[0];
  let s = `${D.diem} đạt ${tien(D.dt)}`;
  if (D.momPct != null) s += `, ${fmtPct(D.momPct)} so ${labelLo} (${tien(D.dtPrev)})`;
  s += `. Sản lượng ${so(D.sl)} sp · ${D.storeCount} cửa hàng.`;
  if (lead) s += ` Dẫn đầu: ${lead.store} (${tien(lead.dt)}).`;
  if (up && (up.momPct as number) > 0) s += ` Tăng mạnh nhất: ${up.store} (${fmtPct(up.momPct)}).`;
  if (dn && (dn.momPct as number) < 0) s += ` Giảm nhiều nhất: ${dn.store} (${fmtPct(dn.momPct)}).`;
  return s;
}
