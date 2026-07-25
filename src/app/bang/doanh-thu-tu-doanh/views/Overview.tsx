"use client";

// View "Tổng quan" — dữ liệu từ /api/tu-doanh/overview.
// KPI · diễn giải · cột-line theo tháng · 3 donut · rank cửa hàng · bảng chi
// tiết · area theo ngày · tiến độ KPI theo trạm.

import { useEffect, useState } from "react";
import type { Filter, Overview } from "../lib/api";
import { api, toQuery } from "../lib/api";
import type { PeriodType } from "../filter";
import { Grid, Cell, Kpi, Loading, Loi, Bang } from "../ui";
import { colorMap, topNKhac } from "../lib/colors";
import { DonutTotal, BarLineMonthly, AreaDaily, RankH } from "../charts";
import { delta, tien, so, fmtPct, share as pctShare, ngayDay } from "../lib/format";
import { Insight, Deep, deepUnits } from "./insight";

export default function OverviewView({ filter, periodType }: { filter: Filter; periodType: PeriodType }) {
  const [d, setD] = useState<Overview | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api<Overview>("overview", toQuery(filter))
      .then((r) => alive && (setD(r), setErr("")))
      .catch((e) => alive && setErr(String(e.message ?? e)))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [filter]);

  if (err) return <Loi e={err} />;
  if (loading || !d) return <Loading cao={400} />;

  const t = d.total;
  const baseM = periodType === "year" ? { nhan: "so cùng kỳ năm trước", v: t.prevY } : { nhan: "so tháng liền kề", v: t.prevM };
  const baseY = { nhan: "so cùng kỳ năm trước", v: t.prevY };

  // donut data
  const dTram = topNKhac(d.byTram.map((x) => ({ name: x.name, value: x.cur })));
  const dDiem = topNKhac(d.byDiem.map((x) => ({ name: x.name, value: x.cur })));
  const dNhom = topNKhac(d.groups.map((x) => ({ name: x.group, value: x.dt })));
  const cTram = colorMap(dTram.map((x) => x.name));
  const cDiem = colorMap(dDiem.map((x) => x.name));
  const cNhom = colorMap(dNhom.map((x) => x.name));

  // rank cửa hàng (màu theo điểm trạm)
  const stores = d.byStore.filter((s) => s.cur > 0).slice(0, 20);
  const diemKeys = colorMap([...new Set(d.byStore.map((s) => s.diem))]);
  const rankRows = stores.map((s) => ({ name: s.name, value: s.cur, color: diemKeys(s.diem) }));

  const baseLabelShort = periodType === "year" ? "năm trước" : "tháng trước";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* KPI */}
      <Grid>
        <div style={{ gridColumn: "span 4" }}>
          <Kpi
            nhan={`Doanh thu kỳ (${d.nDays} ngày)`}
            giaTri={t.cur}
            deltas={[{ nhan: baseM.nhan, d: delta(t.cur, baseM.v) }, { nhan: baseY.nhan, d: delta(t.cur, baseY.v) }]}
            phu={`Kỳ ${ngayDay(d.from)} – ${ngayDay(d.effTo)}`}
          />
        </div>
        <div style={{ gridColumn: "span 4" }}>
          <Kpi nhan="Sản lượng kỳ" giaTri={t.sl} dinhDang={(n) => `${so(n)} sp`}
            deltas={[{ nhan: baseLabelShort, d: delta(t.sl, periodType === "year" ? t.slPrevY : t.slPrevM) }]}
            phu={`Khuyến mãi: ${so(t.km)} sp`} />
        </div>
        <div style={{ gridColumn: "span 4" }}>
          <Kpi nhan="Số quầy có phát sinh" giaTri={d.byStore.filter((s) => s.cur > 0).length} dinhDang={(n) => `${so(n)} quầy`}
            phu={`${d.byTram.length} trạm · ${d.byDiem.length} điểm trạm`} />
        </div>
      </Grid>

      {/* Diễn giải */}
      <Insight lines={insightOverview(d, baseLabelShort)} />
      <Deep blocks={deepUnits(d.byStore.map((s) => ({ name: s.name, cur: s.cur, prev: periodType === "year" ? s.prevY : s.prevM })), "cửa hàng", t.cur, periodType === "year" ? t.prevY : t.prevM)} />

      {/* Bar+line theo tháng */}
      <Cell w={12} title="Doanh thu theo tháng" mau="column" note={`Cột: ${d.monthly.year} · đường đứt: ${d.monthly.year - 1}`}>
        <BarLineMonthly labels={d.monthly.labels} cur={d.monthly.cur} prev={d.monthly.prev}
          curName={String(d.monthly.year)} prevName={String(d.monthly.year - 1)}
          highlightIdx={Number(d.effTo.slice(5, 7)) - 1} height={300} />
      </Cell>

      {/* 3 donut */}
      <Grid>
        <Cell w={4} title="Cơ cấu theo trạm" mau="donut"><DonutTotal items={dTram} colorOf={cTram} /></Cell>
        <Cell w={4} title="Cơ cấu theo điểm trạm" mau="donut"><DonutTotal items={dDiem} colorOf={cDiem} /></Cell>
        <Cell w={4} title="Cơ cấu theo nhóm hàng" mau="donut"><DonutTotal items={dNhom} colorOf={cNhom} /></Cell>
      </Grid>

      {/* Rank cửa hàng + bảng */}
      <Grid>
        <Cell w={5} title="Doanh thu theo điểm bán" mau="bar" note="Top 20 · màu theo điểm trạm">
          <RankH rows={rankRows} height={Math.max(240, rankRows.length * 20)} />
        </Cell>
        <Cell w={7} title="Chi tiết theo cửa hàng">
          <Bang cols={[{ ten: "#" }, { ten: "Cửa hàng" }, { ten: "Điểm trạm" }, { ten: "DT kỳ", canh: "phai" }, { ten: `vs ${baseLabelShort}`, canh: "phai" }]}>
            {d.byStore.slice(0, 15).map((s, i) => {
              const dl = delta(s.cur, periodType === "year" ? s.prevY : s.prevM);
              return (
                <tr key={s.name} style={{ borderTop: i ? "1px solid var(--line)" : "none" }}>
                  <td style={{ padding: "6px 8px", color: "var(--ink-soft)" }}>{i + 1}</td>
                  <td style={{ padding: "6px 8px", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</td>
                  <td style={{ padding: "6px 8px", color: "var(--ink-soft)" }}>{s.diem}</td>
                  <td style={{ padding: "6px 8px", textAlign: "right", fontWeight: 600 }} className="mono">{tien(s.cur)}</td>
                  <td style={{ padding: "6px 8px", textAlign: "right", color: dl.pct == null ? "var(--ink-soft)" : dl.good ? "#006300" : "#d03b3b", fontWeight: 600 }} className="mono">{fmtPct(dl.pct)}</td>
                </tr>
              );
            })}
          </Bang>
        </Cell>
      </Grid>

      {/* Area theo ngày + tiến độ trạm */}
      <Grid>
        <Cell w={8} title="Doanh thu theo ngày" mau="area">
          <AreaDaily points={d.daily.map((x) => ({ label: x.d.slice(8, 10) + "/" + x.d.slice(5, 7), value: x.dt }))} />
        </Cell>
        <Cell w={4} title="Cơ cấu theo bộ phận" mau="donut">
          <DonutTotal items={topNKhac(d.byBp.map((x) => ({ name: x.name, value: x.cur })))} colorOf={colorMap(topNKhac(d.byBp.map((x) => ({ name: x.name, value: x.cur }))).map((x) => x.name))} />
        </Cell>
      </Grid>

      <p style={{ fontSize: 11, color: "var(--ink-soft)", margin: "2px" }}>
        Doanh thu tổng theo Top nhóm: {dNhom.slice(0, 3).map((g) => `${g.name} ${pctShare(g.value / (t.cur || 1))}`).join(" · ")}
      </p>
    </div>
  );
}

/* Diễn giải nhanh cho Tổng quan (theo mẫu insightOverview của port). */
function insightOverview(d: Overview, baseLabel: string): string[] {
  const t = d.total;
  const base = baseLabel === "năm trước" ? t.prevY : t.prevM;
  const dd = delta(t.cur, base);
  const lines: string[] = [];
  lines.push(`Doanh thu kỳ đạt ${tien(t.cur)} (${d.nDays} ngày), ${fmtPct(dd.pct)} ${baseLabel}.`);
  const movers = [...d.byStore].sort((a, b) => (b.cur - (baseLabel === "năm trước" ? b.prevY : b.prevM)) - (a.cur - (baseLabel === "năm trước" ? a.prevY : a.prevM)));
  const up = movers.slice(0, 2).filter((s) => s.cur > (baseLabel === "năm trước" ? s.prevY : s.prevM));
  const down = movers.slice(-2).filter((s) => s.cur < (baseLabel === "năm trước" ? s.prevY : s.prevM)).reverse();
  if (up.length) lines.push(`Kéo tăng: ${up.map((s) => s.name).join(", ")}.`);
  if (down.length) lines.push(`Kéo giảm: ${down.map((s) => s.name).join(", ")}.`);
  const top1 = d.byDiem[0];
  if (top1) lines.push(`Điểm bán dẫn dắt: ${top1.name} (${pctShare(top1.cur / (t.cur || 1))} tổng).`);
  return lines;
}
