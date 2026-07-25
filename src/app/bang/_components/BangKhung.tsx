import Link from "next/link";
import { MauBadge } from "@/dashboard/layout";

/**
 * Khung chung của một trang dashboard: thanh đầu mỏng có nút quay về app chính,
 * mốc dữ liệu, rồi phần thân toàn màn hình.
 *
 * Mọi dashboard trong /bang/ đều bọc bằng cái này để nhìn thống nhất và để có
 * đúng MỘT chỗ sửa khi muốn đổi cách hiển thị đầu trang.
 */
export default function BangKhung({
  ten,
  mo_ta,
  mocDuLieu,
  thanhLoc,
  children,
}: {
  ten: string;
  mo_ta?: string;
  /**
   * Dữ liệu kéo về lúc nào — người xem phải biết mình đang nhìn số của khi nào.
   * Nhận ReactNode để truyền được component async, cho nó chảy về sau phần khung.
   */
  mocDuLieu?: React.ReactNode;
  /** Thanh lọc, hiện ngay dưới header (tuỳ chọn). */
  thanhLoc?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)" }}>
      <header
        style={{
          borderBottom: "1px solid var(--line)", background: "var(--panel)",
          position: "sticky", top: 0, zIndex: 10,
        }}
      >
        <div
          style={{
            display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap",
            padding: "12px 26px",
          }}
        >
          <Link
            href="/dashboards"
            style={{
              fontSize: 13, fontWeight: 600, color: "var(--ink-soft)",
              border: "1px solid var(--line-strong)", borderRadius: 7, padding: "6px 13px",
              whiteSpace: "nowrap",
            }}
          >
            ← Về app chính
          </Link>
          <div style={{ minWidth: 0 }}>
            <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0, letterSpacing: "-0.01em" }}>{ten}</h1>
            {mo_ta && (
              <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "var(--ink-soft)" }}>{mo_ta}</p>
            )}
          </div>
          {mocDuLieu && (
            <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--ink-soft)", whiteSpace: "nowrap" }}>
              {mocDuLieu}
            </span>
          )}
        </div>
        {thanhLoc && (
          <div style={{ borderTop: "1px solid var(--line)", padding: "0 26px" }}>{thanhLoc}</div>
        )}
      </header>

      <main style={{ padding: "20px 26px 60px" }}>{children}</main>
    </div>
  );
}

/** Một ô trong lưới dashboard. `w` tính theo lưới 12 cột. */
export function O({
  tieu_de,
  ghi_chu,
  w = 6,
  mau,
  children,
}: {
  tieu_de?: string;
  ghi_chu?: string;
  w?: number;
  /** id loại chart trong thư viện (CHART_TYPES) → hiện badge ⓘ truy xuất mẫu. */
  mau?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        gridColumn: `span ${w}`, minWidth: 0,
        background: "var(--panel)", border: "1px solid var(--line)",
        borderRadius: 12, padding: "16px 18px",
      }}
    >
      {tieu_de && (
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 14.5, fontWeight: 700 }}>{tieu_de}</div>
            {ghi_chu && (
              <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 2 }}>{ghi_chu}</div>
            )}
          </div>
          {mau && <MauBadge mau={mau} />}
        </div>
      )}
      {children}
      {/* Ghi chú đặt DƯỚI ô chỉ số (nơi nó giải thích con số vừa đọc), nhưng
          trên chart (nơi nó dẫn dắt cách đọc). */}
      {ghi_chu && !tieu_de && (
        <div style={{ fontSize: 11.5, color: "var(--ink-soft)", marginTop: 10, lineHeight: 1.45 }}>
          {ghi_chu}
        </div>
      )}
    </div>
  );
}

/** Lưới 12 cột dùng chung. */
export function Luoi({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: 12, marginBottom: 12 }}>
      {children}
    </div>
  );
}

/** Ô giữ chỗ trong lúc chờ query — giữ đúng chiều cao để trang không nhảy. */
export function OTrong({ w = 6, cao = 260 }: { w?: number; cao?: number }) {
  return (
    <div
      style={{
        gridColumn: `span ${w}`, minWidth: 0, height: cao,
        background: "var(--panel)", border: "1px solid var(--line)",
        borderRadius: 12, opacity: 0.55,
      }}
    />
  );
}
