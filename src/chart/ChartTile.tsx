"use client";

import { useMemo } from "react";
import { EChart } from "./EChart";
import { buildOption, formatter } from "./options";
import { CHROME, FONT_STACK, SERIES, vnPercent } from "./lib/theme";
import type { ChartConfig, ChartRow } from "./types";

const MODE = "light" as const; // app hiện chỉ có light; theme đã sẵn sàng cho dark.

/**
 * Một ô chart trong dashboard. Nhận dữ liệu đã chuẩn hoá về ChartRow[] —
 * giai đoạn 2 là số mẫu, giai đoạn 3 là kết quả query, bộ render không đổi.
 */
export default function ChartTile({
  loai,
  rows,
  config = {},
  height = 260,
}: {
  loai: string;
  rows: ChartRow[];
  config?: ChartConfig;
  height?: number;
}) {
  const option = useMemo(() => buildOption(loai, rows, config, MODE), [loai, rows, config]);

  if (!rows.length) return <Trong>Chưa có dữ liệu.</Trong>;

  // Hai loại này không phải biểu đồ ECharts — vẽ bằng HTML thì gọn và sắc nét hơn.
  if (loai === "stat-tile") return <StatTile rows={rows} config={config} />;
  if (loai === "meter") return <Meter rows={rows} config={config} />;

  if (!option) return <Trong>Chưa hỗ trợ vẽ loại “{loai}”.</Trong>;
  return <EChart option={option} height={height} resetKey={loai} />;
}

function Trong({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid", placeItems: "center", minHeight: 120, padding: 20,
        color: "var(--ink-soft)", fontSize: 13, textAlign: "center",
      }}
    >
      {children}
    </div>
  );
}

/** Con số to + mức chênh so với kỳ trước. */
function StatTile({ rows, config }: { rows: ChartRow[]; config: ChartConfig }) {
  const c = CHROME[MODE];
  const r = rows[0];
  const fmt = formatter(config);
  const truoc = r.value2;
  const delta = truoc ? (r.value / truoc - 1) * 100 : undefined;
  // Tăng không phải lúc nào cũng tốt, nhưng mặc định của app là tăng = tốt.
  const mauDelta = delta === undefined ? c.inkMuted : delta >= 0 ? c.deltaGood : c.deltaBad;

  return (
    <div style={{ padding: "6px 2px" }}>
      <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 6 }}>{r.label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 30, fontWeight: 700, letterSpacing: "-0.02em", fontFamily: FONT_STACK }}>
          {fmt(r.value)}
        </span>
        {config.don_vi && <span style={{ fontSize: 14, color: "var(--ink-soft)" }}>{config.don_vi}</span>}
      </div>
      {delta !== undefined && (
        <div style={{ marginTop: 8, fontSize: 13, fontWeight: 600, color: mauDelta }}>
          {delta >= 0 ? "▲" : "▼"} {vnPercent(Math.abs(delta))} so với kỳ trước
        </div>
      )}
    </div>
  );
}

/** Thanh ngang: đã đi được bao nhiêu phần của mốc trần. */
function Meter({ rows, config }: { rows: ChartRow[]; config: ChartConfig }) {
  const c = CHROME[MODE];
  const r = rows[0];
  const fmt = formatter(config);
  const tran = r.value2 ?? config.muc_tieu ?? 0;
  const tyLe = tran > 0 ? Math.min(r.value / tran, 1) : 0;
  const vuot = tran > 0 && r.value > tran;

  return (
    <div style={{ padding: "6px 2px" }}>
      <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 6 }}>{r.label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
        <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em" }}>{fmt(r.value)}</span>
        <span style={{ fontSize: 13, color: "var(--ink-soft)" }}>/ {fmt(tran)}</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: vuot ? c.deltaGood : "var(--ink-soft)" }}>
          {vnPercent(tran > 0 ? (r.value / tran) * 100 : 0)}
        </span>
      </div>
      <div style={{ height: 10, borderRadius: 5, background: c.grid, overflow: "hidden" }}>
        <div
          style={{
            width: `${tyLe * 100}%`, height: "100%", borderRadius: 5,
            background: vuot ? c.deltaGood : SERIES[MODE][0],
          }}
        />
      </div>
    </div>
  );
}
