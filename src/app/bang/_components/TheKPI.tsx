import { CHROME, vnCompact, vnPercent } from "@/chart/lib/theme";

// Thẻ KPI: một con số to + nhiều mốc so sánh (tuần trước, tháng trước, cùng kỳ
// năm trước…). Giàu hơn stat-tile — dùng cho ô dẫn đầu dashboard.

const c = CHROME.light;

export type Delta = {
  nhan: string; // "so tháng trước"
  truoc: number; // giá trị kỳ so sánh
};

function fmtTien(v: number) {
  return `${vnCompact(v)} ₫`;
}

export default function TheKPI({
  nhan,
  giaTri,
  deltas = [],
  ghiChu,
  dinhDang = fmtTien,
}: {
  nhan: string;
  giaTri: number;
  deltas?: Delta[];
  ghiChu?: string;
  dinhDang?: (v: number) => string;
}) {
  return (
    <div>
      <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 6 }}>{nhan}</div>
      <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: deltas.length ? 10 : 0 }}>
        {dinhDang(giaTri)}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {deltas.map((d) => {
          const co = d.truoc !== 0 || giaTri !== 0;
          const pct = d.truoc ? (giaTri / d.truoc - 1) * 100 : 0;
          const len = giaTri >= d.truoc;
          const mau = !co ? c.inkMuted : len ? c.deltaGood : c.deltaBad;
          return (
            <div key={d.nhan} style={{ fontSize: 12.5, display: "flex", gap: 6, alignItems: "baseline" }}>
              <span style={{ fontWeight: 600, color: mau, minWidth: 62 }}>
                {d.truoc ? `${len ? "▲" : "▼"} ${vnPercent(Math.abs(pct))}` : "—"}
              </span>
              <span style={{ color: "var(--ink-soft)" }}>{d.nhan}</span>
            </div>
          );
        })}
      </div>
      {ghiChu && (
        <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 8, lineHeight: 1.45 }}>{ghiChu}</div>
      )}
    </div>
  );
}
