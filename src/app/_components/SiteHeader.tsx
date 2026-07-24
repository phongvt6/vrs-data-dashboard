"use client";

import Link from "next/link";
import { logoutAction } from "@/app/login/actions";

export default function SiteHeader({ authDisabled = false }: { authDisabled?: boolean }) {
  const linkStyle = { color: "var(--ink-soft)" as const };

  return (
    <header
      style={{
        borderBottom: "1px solid var(--line)",
        background: "var(--panel)",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}
    >
      <div
        style={{
          maxWidth: 1180, margin: "0 auto", padding: "0 24px", height: 58,
          display: "flex", alignItems: "center", gap: 28,
        }}
      >
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              width: 26, height: 26, borderRadius: 6, background: "var(--accent)",
              display: "grid", placeItems: "center", color: "#fff", fontWeight: 700, fontSize: 14,
            }}
          >D</span>
          <span style={{ fontWeight: 700, letterSpacing: "-0.01em" }}>Data &amp; Dashboard</span>
        </Link>
        <nav style={{ display: "flex", gap: 20, fontSize: 14 }}>
          <Link href="/" style={linkStyle}>Dữ liệu</Link>
          <Link href="/dashboards" style={linkStyle}>Dashboard</Link>
          <Link href="/charts" style={linkStyle}>Thư viện chart</Link>
          <Link href="/lineage" style={linkStyle}>Sơ đồ liên kết</Link>
          <Link href="/admin" style={linkStyle}>Quản trị</Link>
        </nav>
        {authDisabled ? (
          <span
            title="AUTH_DISABLED=1 trong .env.local — nhớ bỏ trước khi deploy"
            style={{
              marginLeft: "auto", fontSize: 12, fontWeight: 600, color: "var(--warn)",
              border: "1px dashed var(--warn)", borderRadius: 7, padding: "4px 10px",
            }}
          >
            Đăng nhập đang tắt
          </span>
        ) : (
          <form action={logoutAction} style={{ marginLeft: "auto" }}>
            <button
              type="submit"
              style={{
                fontSize: 13, color: "var(--ink-soft)", background: "none",
                border: "1px solid var(--line-strong)", borderRadius: 7,
                padding: "5px 12px", cursor: "pointer",
              }}
            >
              Đăng xuất
            </button>
          </form>
        )}
      </div>
    </header>
  );
}
