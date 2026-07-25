"use client";

// UI primitive cho tự doanh native — khớp CSS var của app (--panel/--line/--ink…).
// Tự viết (không import O/Luoi server component) để an toàn ranh giới client.

import type { CSSProperties, ReactNode } from "react";
import { fmtPct, tien, so, type Delta } from "./lib/format";

export function Grid({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 12, ...style }}>
      {children}
    </div>
  );
}

/** Ô lưới 12 cột. w = số cột (mặc định 6). */
export function Cell({
  w = 6,
  title,
  note,
  right,
  children,
  pad = true,
}: {
  w?: number;
  title?: string;
  note?: string;
  right?: ReactNode;
  children: ReactNode;
  pad?: boolean;
}) {
  return (
    <section
      style={{
        gridColumn: `span ${w}`,
        background: "var(--panel)",
        border: "1px solid var(--line)",
        borderRadius: 12,
        padding: pad ? "14px 16px" : 0,
        minWidth: 0,
      }}
    >
      {(title || right) && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: note ? 2 : 10, padding: pad ? 0 : "14px 16px 0" }}>
          {title && <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>{title}</h3>}
          {right}
        </div>
      )}
      {note && <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginBottom: 10, padding: pad ? 0 : "0 16px" }}>{note}</div>}
      {children}
    </section>
  );
}

/** Thẻ KPI: giá trị lớn + tối đa 2 mốc so sánh + phụ đề. */
export function Kpi({
  nhan,
  giaTri,
  dinhDang = tien,
  deltas = [],
  phu,
}: {
  nhan: string;
  giaTri: number;
  dinhDang?: (n: number) => string;
  deltas?: { nhan: string; d: Delta }[];
  phu?: ReactNode;
}) {
  return (
    <div
      style={{
        background: "var(--panel)",
        border: "1px solid var(--line)",
        borderRadius: 12,
        padding: "14px 16px",
        minWidth: 0,
      }}
    >
      <div style={{ fontSize: 12, color: "var(--ink-soft)", marginBottom: 4 }}>{nhan}</div>
      <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.1 }}>{dinhDang(giaTri)}</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 12px", marginTop: 6 }}>
        {deltas.map((x, i) => (
          <span key={i} style={{ fontSize: 12, color: x.d.pct == null ? "var(--ink-soft)" : x.d.good ? "var(--delta-good, #006300)" : "var(--delta-bad, #d03b3b)", fontWeight: 600 }}>
            {fmtPct(x.d.pct)} <span style={{ color: "var(--ink-soft)", fontWeight: 400 }}>{x.nhan}</span>
          </span>
        ))}
      </div>
      {phu && <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 6 }}>{phu}</div>}
    </div>
  );
}

/** Thẻ số nhỏ (stat tile) cho các section. */
export function Stat({ nhan, giaTri, phu }: { nhan: string; giaTri: string; phu?: ReactNode }) {
  return (
    <div style={{ background: "var(--panel-2, var(--panel))", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px", minWidth: 0 }}>
      <div style={{ fontSize: 11, color: "var(--ink-soft)", marginBottom: 3 }}>{nhan}</div>
      <div style={{ fontSize: 17, fontWeight: 700 }}>{giaTri}</div>
      {phu && <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 2 }}>{phu}</div>}
    </div>
  );
}

export function Loading({ cao = 200 }: { cao?: number }) {
  return (
    <div style={{ height: cao, display: "grid", placeItems: "center", color: "var(--ink-soft)", fontSize: 13 }}>
      Đang tải…
    </div>
  );
}

export function Loi({ e }: { e: string }) {
  return (
    <div style={{ padding: 16, color: "#d03b3b", fontSize: 13, background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 12 }}>
      Lỗi tải dữ liệu: {e}
    </div>
  );
}

/** Bảng đơn giản (header + rows). */
export function Bang({ cols, children }: { cols: { ten: string; canh?: "trai" | "phai" }[]; children: ReactNode }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
        <thead>
          <tr>
            {cols.map((c, i) => (
              <th
                key={i}
                style={{
                  textAlign: c.canh === "phai" ? "right" : "left",
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
                {c.ten}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export const num = so;
