"use client";

// Khung chuẩn cho MỌI dashboard native: sidebar trái + header + vùng nội dung.
// Một component duy nhất — không dashboard nào tự vẽ chrome nữa, nên không lệch
// và không lỗi lặt vặt. Áp dsVars() ở gốc để con cháu dùng chung bảng màu.

import { useState, type ReactNode } from "react";
import { dsVars, RADIUS } from "./tokens";

export type NavItem = {
  id: string;
  /** Emoji hoặc icon node. */
  icon: ReactNode;
  ten: string;
  /** Số hiển thị trong pill bên phải (ví dụ số cảnh báo). Bỏ qua nếu 0/undefined. */
  badge?: number;
  /** Nếu có: mục là LINK ngoài (mở tab mới) thay vì nút chuyển view. */
  href?: string;
};

export function DashboardShell({
  nav,
  active,
  onNavigate,
  title,
  subtitle,
  right,
  homeHref = "/dashboards",
  homeLabel = "Về app chính",
  children,
}: {
  nav: NavItem[];
  active: string;
  onNavigate: (id: string) => void;
  title: string;
  subtitle?: ReactNode;
  right?: ReactNode;
  homeHref?: string;
  homeLabel?: string;
  children: ReactNode;
}) {
  const [thuGon, setThuGon] = useState(false);
  const rong = thuGon ? 62 : 216;

  return (
    <div
      style={{
        ...dsVars("light"),
        display: "flex",
        minHeight: "100dvh",
        background: "var(--ds-surface)",
        color: "var(--ds-ink)",
      }}
    >
      {/* Sidebar */}
      <aside
        style={{
          width: rong,
          flexShrink: 0,
          borderRight: "1px solid var(--ds-line)",
          background: "var(--ds-plane)",
          display: "flex",
          flexDirection: "column",
          padding: "12px 10px",
          position: "sticky",
          top: 0,
          height: "100dvh",
          transition: "width .15s ease",
        }}
      >
        <a
          href={homeHref}
          title={homeLabel}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: "var(--ds-fs-caption)",
            color: "var(--ds-ink-muted)",
            textDecoration: "none",
            padding: "4px 8px",
            marginBottom: 10,
            whiteSpace: "nowrap",
            overflow: "hidden",
          }}
        >
          <span aria-hidden>←</span>
          {!thuGon && <span>{homeLabel}</span>}
        </a>

        <nav style={{ display: "grid", gap: 3, flex: 1, alignContent: "start" }}>
          {nav.map((n) => {
            const on = !n.href && n.id === active;
            const rowStyle = {
              display: "flex",
              alignItems: "center",
              gap: 11,
              padding: "9px 11px",
              borderRadius: RADIUS.control,
              border: "none",
              cursor: "pointer",
              textAlign: "left" as const,
              textDecoration: "none",
              fontSize: 13.5,
              lineHeight: 1.2,
              whiteSpace: "nowrap" as const,
              fontWeight: on ? 700 : 500,
              background: on ? "var(--ds-accent)" : "transparent",
              color: on ? "var(--ds-accent-ink)" : "var(--ds-ink-2)",
              justifyContent: thuGon ? "center" : "flex-start",
              transition: "background .1s",
            };
            const inner = (
              <>
                <span style={{ fontSize: 16, width: 18, textAlign: "center", flexShrink: 0 }} aria-hidden>
                  {n.icon}
                </span>
                {!thuGon && <span style={{ flex: 1 }}>{n.ten}{n.href ? " ↗" : ""}</span>}
                {!thuGon && n.badge ? (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      background: on ? "rgba(255,255,255,.28)" : "var(--ds-bad)",
                      color: "#fff",
                      borderRadius: RADIUS.pill,
                      padding: "1px 7px",
                    }}
                  >
                    {n.badge}
                  </span>
                ) : null}
              </>
            );
            const hover = {
              onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
                if (!on) e.currentTarget.style.background = "var(--ds-grid)";
              },
              onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
                if (!on) e.currentTarget.style.background = "transparent";
              },
            };
            return n.href ? (
              <a key={n.id} href={n.href} target="_blank" rel="noopener" title={n.ten} style={rowStyle} {...hover}>
                {inner}
              </a>
            ) : (
              <button
                key={n.id}
                onClick={() => onNavigate(n.id)}
                title={n.ten}
                aria-current={on ? "page" : undefined}
                style={rowStyle}
                {...hover}
              >
                {inner}
              </button>
            );
          })}
        </nav>

        <button
          onClick={() => setThuGon((v) => !v)}
          title={thuGon ? "Mở rộng" : "Thu gọn"}
          style={{
            marginTop: 8,
            fontSize: "var(--ds-fs-caption)",
            color: "var(--ds-ink-muted)",
            background: "none",
            border: "1px solid var(--ds-line)",
            borderRadius: RADIUS.control,
            padding: "7px",
            cursor: "pointer",
          }}
        >
          {thuGon ? "»" : "« Thu gọn"}
        </button>
      </aside>

      {/* Nội dung */}
      <main style={{ flex: 1, minWidth: 0, padding: "18px 22px 48px" }}>
        <header
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            flexWrap: "wrap",
            marginBottom: 14,
          }}
        >
          <div>
            <h1 style={{ fontSize: "var(--ds-fs-page)", fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }}>
              {title}
            </h1>
            {subtitle && (
              <p style={{ fontSize: "var(--ds-fs-caption)", color: "var(--ds-ink-muted)", margin: "3px 0 0" }}>
                {subtitle}
              </p>
            )}
          </div>
          {right}
        </header>
        {children}
      </main>
    </div>
  );
}
