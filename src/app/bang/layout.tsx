import { Suspense } from "react";

/**
 * Layout của trang dashboard: TOÀN MÀN HÌNH, không header chung — mỗi dashboard
 * tự lo phần đầu trang và nút "Về app chính" qua <BangKhung>.
 */
export default function BangLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<DangTai />}>{children}</Suspense>;
}

function DangTai() {
  return (
    <div
      style={{
        display: "grid", placeItems: "center", minHeight: "100vh",
        background: "var(--paper)", color: "var(--ink-soft)", fontSize: 14,
      }}
    >
      Đang tải dashboard…
    </div>
  );
}
