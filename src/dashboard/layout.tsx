"use client";

// Primitive layout dùng chung cho mọi dashboard native: lưới 12 cột, thẻ (Card),
// thẻ KPI, thẻ số nhỏ. Mọi màu/chữ đọc từ biến `--ds-*` (xem tokens.ts) nên đồng
// bộ tuyệt đối với biểu đồ. Không app nào tự vẽ thẻ nữa.

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
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
 * Badge "mẫu chart" — chỉ ra ô này đang dùng loại nào trong thư viện. Bấm ⓘ mở
 * một popover nhẹ ngay tại chỗ (tên + mô tả + nên dùng / tránh + dữ liệu cần);
 * trong popover, bấm TÊN chart mới mở trang Thư viện chart /charts#<id>.
 */
export function MauBadge({ mau }: { mau: string }) {
  const t = chartType(mau);
  const ten = t?.ten ?? mau;
  const [mo, setMo] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);

  // Đóng khi bấm ra ngoài hoặc nhấn Esc.
  useEffect(() => {
    if (!mo) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setMo(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMo(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [mo]);

  return (
    <span ref={wrapRef} style={{ position: "relative", display: "inline-flex", flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => setMo((v) => !v)}
        title={`Mẫu: ${ten} — bấm xem thông tin`}
        aria-label={`Mẫu chart: ${ten}`}
        aria-expanded={mo}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 18,
          height: 18,
          borderRadius: RADIUS.pill,
          border: "1px solid var(--ds-line-strong)",
          background: mo ? "var(--ds-accent)" : "transparent",
          color: mo ? "var(--ds-accent-ink)" : "var(--ds-ink-muted)",
          fontSize: 11,
          fontWeight: 700,
          lineHeight: 1,
          cursor: "pointer",
          padding: 0,
        }}
      >
        i
      </button>
      {mo && t && <MauPopover t={t} onClose={() => setMo(false)} />}
    </span>
  );
}

function MauPopover({
  t,
  onClose,
}: {
  t: NonNullable<ReturnType<typeof chartType>>;
  onClose: () => void;
}) {
  return (
    <div
      role="dialog"
      aria-label={`Mẫu ${t.ten}`}
      style={{
        position: "absolute",
        top: "calc(100% + 6px)",
        right: 0,
        zIndex: 60,
        width: "max-content",
        maxWidth: "min(260px, 80vw)",
        background: "var(--ds-panel)",
        border: "1px solid var(--ds-line-strong)",
        borderRadius: RADIUS.card,
        boxShadow: "0 10px 30px rgba(0,0,0,.16)",
        padding: "10px 12px",
        textAlign: "left",
        cursor: "default",
        whiteSpace: "normal",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <a
          href={`/charts#${t.id}`}
          target="_blank"
          rel="noopener"
          title="Mở trang Thư viện chart"
          style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ds-accent)", textDecoration: "none" }}
        >
          {t.ten} ↗
        </a>
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng"
          style={{ border: "none", background: "none", cursor: "pointer", color: "var(--ds-ink-muted)", fontSize: 14, lineHeight: 1, padding: 0 }}
        >
          ✕
        </button>
      </div>
      <div style={{ fontSize: 11.5, color: "var(--ds-ink-muted)", fontFamily: "var(--mono, ui-monospace, monospace)", marginTop: 2 }}>{t.id}</div>
    </div>
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
