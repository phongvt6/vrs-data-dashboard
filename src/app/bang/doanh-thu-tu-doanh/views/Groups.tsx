"use client";

// View "Nhóm hàng" — dữ liệu từ /api/tu-doanh/groups (+ /skus khi drill).
// Diễn giải · donut cơ cấu · top 10 SKU · xếp hạng nhóm (bấm để drill) ·
// panel SKU Pareto (Top 80% / 20% còn lại) · cột chồng theo tháng.
// Port 1:1 renderGroups/loadDrill của bản native (public/tu-doanh/index.html).

import { useEffect, useMemo, useState } from "react";
import type { Filter, Groups, Skus } from "../lib/api";
import { api, toQuery } from "../lib/api";
import type { PeriodType } from "../filter";
import { Grid, Cell, Loading, Loi, Bang } from "../ui";
import { colorMap, topNKhac, PALETTE, KHAC } from "../lib/colors";
import { DonutTotal, Hbars, StackedSeries } from "../charts";
import { delta, tien, so, fmtPct, share as pctShare, ngayDay } from "../lib/format";
import { Insight, Deep, deepUnits } from "./insight";

type GrpBase = "prevW" | "prevWY" | "prevM" | "prevY" | "ytd";

const BASE_LABEL: Record<GrpBase, string> = {
  prevW: "Tuần trước",
  prevWY: "Tuần cùng kỳ năm trước",
  prevM: "Tháng liền kề",
  prevY: "Cùng kỳ năm trước",
  ytd: "Lũy kế năm",
};
const BASE_ORDER: GrpBase[] = ["prevW", "prevWY", "prevM", "prevY", "ytd"];

const spanStr = (s?: { from: string; to: string }) =>
  s ? `${ngayDay(s.from)} – ${ngayDay(s.to)}` : "—";

export default function GroupsView({ filter, periodType }: { filter: Filter; periodType: PeriodType }) {
  const [d, setD] = useState<Groups | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  const [grpBase, setGrpBase] = useState<GrpBase>(periodType === "year" ? "prevY" : "prevM");
  const [groupSel, setGroupSel] = useState<string | null>(null);

  const [skus, setSkus] = useState<Skus | null>(null);
  const [skusLoading, setSkusLoading] = useState(false);
  const [tabDrill, setTabDrill] = useState<"core" | "rest">("core");

  // ---- groups (KHÔNG gửi chiều "group": view này luôn tất cả nhóm) ----
  useEffect(() => {
    let alive = true;
    setLoading(true);
    api<Groups>("groups", toQuery(filter, {}, ["tram", "diem", "bp", "store"]))
      .then((r) => {
        if (!alive) return;
        setD(r);
        setErr("");
        // auto-chọn nhóm top1 nếu chưa chọn / nhóm cũ không còn
        setGroupSel((prev) =>
          prev && r.table.some((t) => t.group === prev) ? prev : r.structure[0]?.group ?? null
        );
      })
      .catch((e) => alive && setErr(String(e.message ?? e)))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [filter]);

  // ---- skus (drill): đổi khi groupSel | grpBase | filter ----
  useEffect(() => {
    if (!groupSel) return;
    let alive = true;
    setSkusLoading(true);
    api<Skus>("skus", toQuery(filter, { group: groupSel, base: grpBase }, ["tram", "diem", "bp", "store"]))
      .then((r) => {
        if (!alive) return;
        setSkus(r);
        if (!r.rest.length) setTabDrill("core"); // không có mã đuôi → ép về tab core
      })
      .catch(() => alive && setSkus(null))
      .finally(() => alive && setSkusLoading(false));
    return () => {
      alive = false;
    };
  }, [groupSel, grpBase, filter]);

  // ---- dẫn xuất ----
  const rows = useMemo(() => (d ? [...d.table].sort((a, b) => b.dt - a.dt) : []), [d]);
  const totDt = useMemo(() => rows.reduce((a, g) => a + g.dt, 0) || 1, [rows]);

  // cơ cấu (Top-8 + "Khác") + hàm màu theo nhóm (dùng chung donut + top10)
  const donutItems = useMemo(() => topNKhac(rows.map((g) => ({ name: g.group, value: g.dt }))), [rows]);
  const colorOf = useMemo(() => colorMap(donutItems.map((x) => x.name)), [donutItems]);

  if (err) return <Loi e={err} />;
  if (loading || !d) return <Loading cao={400} />;

  const baseLabel = BASE_LABEL[grpBase];
  const sp = d.spans;
  const baseSpan = grpBase === "ytd" ? undefined : sp[grpBase as "prevW" | "prevWY" | "prevM" | "prevY"];

  const top10 = d.top10Sku ?? [];

  // cột chồng theo tháng: Top-8 nhóm theo tổng data + "Nhóm khác"
  const nM = d.trend.labels.length;
  const trendSorted = [...d.trend.series]
    .map((s) => ({ group: s.group, data: s.data, total: s.data.reduce((a, b) => a + b, 0) }))
    .sort((a, b) => b.total - a.total);
  const trendTop = trendSorted.slice(0, 8);
  const trendRest = trendSorted.slice(8);
  const stackColor = colorMap(trendTop.map((s) => s.group));
  const stackSeries: { name: string; data: number[]; color: string }[] = trendTop.map((s) => ({
    name: s.group,
    data: s.data,
    color: stackColor(s.group),
  }));
  if (trendRest.length) {
    const rd = Array.from({ length: nM }, (_, m) => trendRest.reduce((a, s) => a + (s.data[m] || 0), 0));
    if (rd.some((v) => v > 0))
      stackSeries.push({ name: `Nhóm khác (${trendRest.length} nhóm)`, data: rd, color: KHAC });
  }

  const rangeLabel = `${ngayDay(d.from)} – ${ngayDay(d.effTo)}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Toggle mốc so sánh */}
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <span style={{ fontSize: 12, color: "var(--ink-soft)" }}>Mốc so sánh:</span>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {BASE_ORDER.map((b) => {
            const active = b === grpBase;
            return (
              <button
                key={b}
                onClick={() => setGrpBase(b)}
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  padding: "5px 11px",
                  borderRadius: 8,
                  cursor: "pointer",
                  border: `1px solid ${active ? "var(--accent)" : "var(--line-strong, var(--line))"}`,
                  background: active ? "var(--accent)" : "var(--panel)",
                  color: active ? "#fff" : "var(--ink)",
                }}
              >
                {BASE_LABEL[b]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Mô tả kỳ/mốc */}
      <div style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>
        Mốc so sánh (đều lấy đúng số ngày có dữ liệu, đến {ngayDay(d.effTo)}): <b>Kỳ này</b> {spanStr(sp.cur)}
        {grpBase === "ytd" ? (
          <>
            {" · "}
            <b>so {baseLabel}</b> lũy kế từ đầu năm đến {ngayDay(d.effTo)}
          </>
        ) : (
          <>
            {" · "}
            <b>so {baseLabel}</b> {spanStr(baseSpan)}
          </>
        )}
        .
      </div>

      {/* Diễn giải */}
      <Insight lines={insightGroups(rows, totDt, grpBase, baseLabel)} />
      <Deep
        blocks={deepUnits(
          rows.map((g) => ({ name: g.group, cur: g.dt, prev: g[grpBase] })),
          "nhóm hàng",
          totDt,
          rows.reduce((a, g) => a + g[grpBase], 0)
        )}
      />

      {/* Cơ cấu + Top 10 SKU */}
      <Grid>
        <Cell w={5} title="Cơ cấu nhóm hàng" mau="donut" note={`Kỳ ${rangeLabel}`}>
          <DonutTotal items={donutItems} colorOf={colorOf} height={250} />
        </Cell>
        <Cell w={7} title="Top 10 mặt hàng có doanh thu cao nhất" mau="bar" note={`Kỳ ${rangeLabel} · màu theo nhóm hàng`}>
          <Hbars
            rows={top10.map((s) => ({ name: s.ten, value: s.dt, color: colorOf(s.group) }))}
            height={Math.max(240, top10.length * 26)}
          />
        </Cell>
      </Grid>

      {/* Xếp hạng nhóm (drill) + chi tiết SKU */}
      <Grid>
        <Cell w={6} title="Xếp hạng nhóm hàng" note="Bấm một nhóm để xem chi tiết SKU (Pareto)">
          <Bang
            cols={[
              { ten: "#" },
              { ten: "Nhóm" },
              { ten: "Doanh thu", canh: "phai" },
              { ten: "Tỷ trọng", canh: "phai" },
              { ten: "Sản lượng", canh: "phai" },
              { ten: `so ${baseLabel}`, canh: "phai" },
            ]}
          >
            {rows.map((g, i) => {
              const dl = delta(g.dt, g[grpBase]);
              const sel = g.group === groupSel;
              return (
                <tr
                  key={g.group}
                  onClick={() => setGroupSel(g.group)}
                  style={{
                    borderTop: i ? "1px solid var(--line)" : "none",
                    cursor: "pointer",
                    background: sel ? "var(--accent-soft)" : undefined,
                  }}
                >
                  <td style={{ padding: "6px 8px", color: sel ? "var(--accent)" : "var(--ink-soft)" }}>{i + 1}</td>
                  <td
                    style={{
                      padding: "6px 8px",
                      fontWeight: 600,
                      color: sel ? "var(--accent)" : undefined,
                      maxWidth: 160,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {g.group}
                  </td>
                  <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 600, color: sel ? "var(--accent)" : undefined }} className="mono">
                    {tien(g.dt)}
                  </td>
                  <td style={{ padding: "6px 8px", textAlign: "right", color: sel ? "var(--accent)" : "var(--ink-soft)" }} className="mono">
                    {pctShare(g.dt / totDt)}
                  </td>
                  <td style={{ padding: "6px 8px", textAlign: "right", color: sel ? "var(--accent)" : "var(--ink-soft)" }} className="mono">
                    {so(g.sl)}
                  </td>
                  <td
                    style={{
                      padding: "6px 8px",
                      textAlign: "right",
                      fontWeight: 600,
                      color: dl.pct == null ? "var(--ink-soft)" : dl.good ? "#006300" : "#d03b3b",
                    }}
                    className="mono"
                  >
                    {fmtPct(dl.pct)}
                  </td>
                </tr>
              );
            })}
          </Bang>
        </Cell>

        <Cell
          w={6}
          mau="bar"
          title={`Chi tiết SKU · ${groupSel ?? ""}`}
          right={
            skus && skus.rest.length ? (
              <div style={{ display: "flex", gap: 6 }}>
                {(["core", "rest"] as const).map((t) => {
                  const active = t === tabDrill;
                  const label = t === "core" ? `Top 80% (${skus.topN})` : `20% còn lại (${skus.rest.length})`;
                  return (
                    <button
                      key={t}
                      onClick={() => setTabDrill(t)}
                      style={{
                        fontSize: 11.5,
                        fontWeight: 600,
                        padding: "3px 9px",
                        borderRadius: 7,
                        cursor: "pointer",
                        border: `1px solid ${active ? "var(--accent)" : "var(--line-strong, var(--line))"}`,
                        background: active ? "var(--accent)" : "var(--panel)",
                        color: active ? "#fff" : "var(--ink)",
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            ) : undefined
          }
        >
          {!groupSel || skusLoading || !skus ? (
            <Loading cao={260} />
          ) : (
            <DrillPanel skus={skus} tab={tabDrill} baseLabel={baseLabel} />
          )}
        </Cell>
      </Grid>

      {/* Cột chồng theo tháng */}
      <Cell w={12} title="Doanh thu nhóm hàng theo tháng" mau="stacked-bar" note="Top 8 nhóm · phần còn lại gộp “Nhóm khác”">
        <StackedSeries labels={d.trend.labels} series={stackSeries} height={290} />
      </Cell>
    </div>
  );
}

/* ---- panel drill SKU (Pareto / đuôi) ---- */
function DrillPanel({ skus, tab, baseLabel }: { skus: Skus; tab: "core" | "rest"; baseLabel: string }) {
  const list = tab === "rest" ? skus.rest : skus.skus;

  const cap =
    tab === "core"
      ? `${skus.topN}/${skus.count} mã mang lại ~80% doanh thu nhóm (Pareto). Nhóm bán ${tien(skus.groupTotal)} · ${skus.topN} mã này chiếm ${pctShare(skus.groupTotal ? skus.shownTotal / skus.groupTotal : 0)} · so ${baseLabel}.`
      : `${skus.rest.length} mã còn lại chỉ chiếm ~20% doanh thu nhóm (${tien(skus.restTotal)} = ${pctShare(skus.groupTotal ? skus.restTotal / skus.groupTotal : 0)}) — bán chậm, cần rà soát tinh gọn.`;

  // khuyến nghị: 🚀 nên phát triển · ✂️ cân nhắc bỏ/gộp
  const dev = skus.skus
    .filter((s) => s.momPct != null && s.momPct > 0)
    .sort((a, b) => b.dt - a.dt)
    .slice(0, 3);
  let cut = skus.rest.filter((s) => s.momPct != null && s.momPct < 0).sort((a, b) => a.dt - b.dt);
  if (cut.length < 3)
    cut = cut.concat(skus.rest.filter((s) => !cut.includes(s)).sort((a, b) => a.dt - b.dt)).slice(0, 4);
  else cut = cut.slice(0, 4);

  const hbRows = list.map((s, i) => ({
    name: s.ten,
    value: s.dt,
    color: tab === "rest" ? KHAC : PALETTE[i % PALETTE.length],
  }));

  return (
    <div>
      <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 8 }}>{cap}</div>
      {list.length ? (
        <Hbars rows={hbRows} height={Math.max(200, Math.min(list.length, 10) * 28)} />
      ) : (
        <div style={{ padding: 16, color: "var(--ink-soft)", fontSize: 12 }}>Không có mã nào.</div>
      )}
      {(dev.length > 0 || cut.length > 0) && (
        <div style={{ marginTop: 10, display: "grid", gap: 5, fontSize: 12, lineHeight: 1.5 }}>
          {dev.length > 0 && (
            <div>
              <b style={{ color: "#006300" }}>🚀 Nên phát triển:</b>{" "}
              {dev
                .map((s) => `${s.ten} (${tien(s.dt)}${s.momPct != null ? `, ${fmtPct(s.momPct, 0)}` : ""})`)
                .join("; ")}{" "}
              — mã đang tăng &amp; đóng góp lớn, nên tăng nhập/trưng bày, mở thêm điểm bán.
            </div>
          )}
          {cut.length > 0 && (
            <div>
              <b style={{ color: "#b02a2a" }}>✂️ Cân nhắc bỏ/gộp:</b>{" "}
              {cut
                .map((s) => `${s.ten} (${tien(s.dt)}${s.momPct != null ? `, ${fmtPct(s.momPct, 0)}` : ""})`)
                .join("; ")}{" "}
              — thuộc đuôi 20%, doanh thu thấp{cut.some((s) => (s.momPct ?? 0) < 0) ? "/đang giảm" : ""}; rà soát cắt
              hoặc gộp để giải phóng vốn (giữ lại nếu biên lợi nhuận cao hoặc mang tính chiến lược).
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---- diễn giải nhanh: nhóm hàng ---- */
function insightGroups(rows: Groups["table"], totDt: number, grpBase: GrpBase, baseLabel: string): string[] {
  const lines: string[] = [];
  const big = rows[0];
  if (big) {
    const dl = delta(big.dt, big[grpBase]);
    lines.push(
      `Nhóm ${big.group} dẫn đầu với doanh thu ${tien(big.dt)} (${pctShare(big.dt / totDt)} tổng), ${fmtPct(dl.pct)} so ${baseLabel}.`
    );
  }
  const wc = rows
    .filter((g) => g[grpBase] > 0)
    .map((g) => ({ group: g.group, de: g.dt - g[grpBase], pct: ((g.dt - g[grpBase]) / g[grpBase]) * 100 }));
  const up = [...wc].sort((a, b) => b.de - a.de)[0];
  const dn = [...wc].sort((a, b) => a.de - b.de)[0];
  const parts: string[] = [];
  if (up && up.de > 0) parts.push(`tăng mạnh nhất ${up.group} (${fmtPct(up.pct)}, +${tien(up.de)})`);
  if (dn && dn.de < 0) parts.push(`giảm nhiều nhất ${dn.group} (${fmtPct(dn.pct)}, ${tien(dn.de)})`);
  if (parts.length) lines.push(`So ${baseLabel}: ${parts.join("; ")}.`);
  lines.push("Bấm một nhóm ở bảng xếp hạng để xem các mã mang lại 80% doanh thu của nhóm (Pareto).");
  return lines;
}
