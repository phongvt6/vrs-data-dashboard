"use client";

import ChartTile from "@/chart/ChartTile";
import { sampleRows } from "@/chart/sample";
import { chartTypeName, type ChartRow } from "@/chart/types";
import type { Chart } from "@/lib/types";

/** Kết quả lấy số cho một chart, do server chuẩn bị sẵn. */
export type DuLieuChart = { rows: ChartRow[]; laMau: boolean; loi?: string };

/** Lưới 12 cột. Ô nào chưa cấu hình nguồn thì vẫn vẽ bằng số liệu mẫu. */
export default function DashboardGrid({
  charts,
  duLieu = {},
}: {
  charts: Chart[];
  duLieu?: Record<string, DuLieuChart>;
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 12 }}>
      {charts.map((ch) => {
        const d = duLieu[ch.id];
        const laMau = d?.laMau ?? true;
        const rows = d && !laMau ? d.rows : sampleRows(ch.loai);
        return (
        <div
          key={ch.id}
          style={{
            gridColumn: `span ${ch.w}`,
            background: "var(--panel)",
            border: "1px solid var(--line)",
            borderRadius: 12,
            padding: "16px 18px",
            minWidth: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
            <span style={{ fontSize: 14.5, fontWeight: 700 }}>{ch.tieu_de}</span>
            <span style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>{chartTypeName(ch.loai)}</span>
            {laMau && (
              <span
                title="Chart này chưa nối nguồn dữ liệu"
                style={{
                  fontSize: 10.5, fontWeight: 600, padding: "1px 7px", borderRadius: 4,
                  color: "var(--warn)", border: "1px dashed var(--warn)",
                }}
              >
                số liệu mẫu
              </span>
            )}
          </div>
          {d?.loi && (
            <p style={{
              margin: "0 0 10px", fontSize: 12, color: "#b5423a",
              border: "1px solid #e0b4b0", borderRadius: 7, padding: "7px 10px",
            }}>
              Không lấy được số thật: {d.loi} — đang hiện số liệu mẫu.
            </p>
          )}
          <ChartTile
            loai={ch.loai}
            rows={rows}
            config={ch.config ?? {}}
            height={ch.w <= 4 ? 220 : 280}
          />
          {ch.mo_ta && (
            <p style={{ margin: "12px 0 0", fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.5 }}>
              {ch.mo_ta}
            </p>
          )}
        </div>
        );
      })}
    </div>
  );
}
