"use client";

// Primitive layout dùng chung cho mọi dashboard native: lưới 12 cột, thẻ (Card),
// thẻ KPI, thẻ số nhỏ. Mọi màu/chữ đọc từ biến `--ds-*` (xem tokens.ts) nên đồng
// bộ tuyệt đối với biểu đồ. Không app nào tự vẽ thẻ nữa.

import type { CSSProperties, ReactNode } from "react";
import { chartType } from "@/chart/types";
import { RADIUS, GAP } from "./tokens";

/** Lưới 12 cột. */
export function Grid({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: GAP, ...style }}>
      {children}
    </div>
  );
}

/**
 * Thẻ nội dung trong lưới. `w` = số cột (mặc định 6).
 * `mau` = id loại chart trong thư viện (CHART_TYPES) → hiện badge ⓘ ở góc, bấm
 * ra tên mẫu + link tới /charts để tra "nên dùng / tránh".
 */
export function Card({
  w = 6,
  title,
  note,
  right,
  mau,
  children,
  pad = true,
  style,
}: {
  w?: number;
  title?: string;
  note?: string;
  right?: ReactNode;
  mau?: string;
  children: ReactNode;
  pad?: boolean;
  style?: CSSProperties;
}) {
  const coHeader = title || right || mau;
  return (
    <section
      data-chart-type={mau}
      style={{
        gridColumn: `span ${w}`,
        background: "var(--ds-panel)",
        border: "1px solid var(--ds-line)",
        borderRadius: RADIUS.card,
        padding: pad ? "14px 16px" : 0,
        minWidth: 0,
        ...style,
      }}
    >
      {coHeader && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            marginBottom: note ? 2 : 10,
            padding: pad ? 0 : "14px 16px 0",
          }}
        >
          {title ? (
            <h3 style={{ fontSize: "var(--ds-fs-card)", fontWeight: 700, margin: 0 }}>{title}</h3>
          ) : (
            <span />
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {right}
            {mau && <MauBadge mau={mau} />}
          </div>
        </div>
      )}
      {note && (
        <div style={{ fontSize: "var(--ds-fs-caption)", color: "var(--ds-ink-muted)", marginBottom: 10, padding: pad ? 0 : "0 16px" }}>
          {note}
        </div>
      )}
      {children}
    </section>
  );
}

/**
 * Badge "mẫu chart" — chỉ ra ô này đang dùng loại nào trong thư viện, link tới
 * trang /charts để đọc hướng dẫn của loại đó. Đây là cách "truy xuất mẫu".
 */
export function MauBadge({ mau }: { mau: string }) {
  const t = chartType(mau);
  const ten = t?.ten ?? mau;
  return (
    <a
      href={`/charts#${mau}`}
      target="_blank"
      rel="noopener"
      title={`Mẫu: ${ten} (${mau}) — bấm để xem hướng dẫn trong Thư viện chart`}
      aria-label={`Mẫu chart: ${ten}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 18,
        height: 18,
        borderRadius: RADIUS.pill,
        border: "1px solid var(--ds-line-strong)",
        color: "var(--ds-ink-muted)",
        fontSize: 11,
        fontWeight: 700,
        lineHeight: 1,
        textDecoration: "none",
        flexShrink: 0,
      }}
    >
      i
    </a>
  );
}

/** Thẻ KPI: giá trị lớn + tối đa 2 mốc so sánh + phụ đề. */
export function Kpi({
  nhan,
  giaTri,
  deltas = [],
  phu,
  mau = "stat-tile",
}: {
  nhan: string;
  giaTri: string;
  deltas?: { nhan: string; pct: number | null; good?: boolean }[];
  phu?: ReactNode;
  /** Mặc định là ô chỉ số; đặt "" để ẩn badge. */
  mau?: string;
}) {
  return (
    <div
      data-chart-type={mau || undefined}
      style={{
        background: "var(--ds-panel)",
        border: "1px solid var(--ds-line)",
        borderRadius: RADIUS.card,
        padding: "14px 16px",
        minWidth: 0,
        position: "relative",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 6 }}>
        <div style={{ fontSize: "var(--ds-fs-caption)", color: "var(--ds-ink-muted)", marginBottom: 4 }}>{nhan}</div>
        {mau && <MauBadge mau={mau} />}
      </div>
      <div style={{ fontSize: "var(--ds-fs-kpi)", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.1 }}>
        {giaTri}
      </div>
      {deltas.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "2px 12px", marginTop: 6 }}>
          {deltas.map((x, i) => (
            <span
              key={i}
              style={{
                fontSize: "var(--ds-fs-caption)",
                fontWeight: 600,
                color: x.pct == null ? "var(--ds-ink-muted)" : x.good ? "var(--ds-good)" : "var(--ds-bad)",
              }}
            >
              {x.pct == null ? "—" : `${x.pct >= 0 ? "▲" : "▼"} ${Math.abs(x.pct).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`}{" "}
              <span style={{ color: "var(--ds-ink-muted)", fontWeight: 400 }}>{x.nhan}</span>
            </span>
          ))}
        </div>
      )}
      {phu && <div style={{ fontSize: "var(--ds-fs-caption)", color: "var(--ds-ink-muted)", marginTop: 6 }}>{phu}</div>}
    </div>
  );
}

/** Thẻ số nhỏ (stat tile) cho các section. */
export function Stat({ nhan, giaTri, phu }: { nhan: string; giaTri: string; phu?: ReactNode }) {
  return (
    <div style={{ background: "var(--ds-plane)", border: "1px solid var(--ds-line)", borderRadius: RADIUS.control, padding: "10px 12px", minWidth: 0 }}>
      <div style={{ fontSize: "var(--ds-fs-caption)", color: "var(--ds-ink-muted)", marginBottom: 3 }}>{nhan}</div>
      <div style={{ fontSize: "var(--ds-fs-stat)", fontWeight: 700 }}>{giaTri}</div>
      {phu && <div style={{ fontSize: "var(--ds-fs-caption)", color: "var(--ds-ink-muted)", marginTop: 2 }}>{phu}</div>}
    </div>
  );
}

export function Loading({ cao = 200 }: { cao?: number }) {
  return (
    <div style={{ height: cao, display: "grid", placeItems: "center", color: "var(--ds-ink-muted)", fontSize: "var(--ds-fs-body)" }}>
      Đang tải…
    </div>
  );
}

export function Loi({ e }: { e: string }) {
  return (
    <div style={{ padding: 16, color: "var(--ds-bad)", fontSize: "var(--ds-fs-body)", background: "var(--ds-panel)", border: "1px solid var(--ds-line)", borderRadius: RADIUS.card }}>
      Lỗi tải dữ liệu: {e}
    </div>
  );
}
