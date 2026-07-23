"use client";

import { usePathname } from "next/navigation";
import SiteHeader from "./SiteHeader";

/**
 * Khung ngoài của app. Trang dashboard (/bang/…) chạy TOÀN MÀN HÌNH: không header
 * chung, không giới hạn bề ngang — mỗi dashboard tự lo phần đầu trang và nút quay
 * về. Các trang còn lại giữ header + khung 1180px như cũ.
 */
export default function AppShell({
  authDisabled,
  children,
}: {
  authDisabled: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  if (pathname?.startsWith("/bang/")) return <>{children}</>;

  return (
    <>
      <SiteHeader authDisabled={authDisabled} />
      <main style={{ maxWidth: 1180, margin: "0 auto", padding: "32px 24px 80px" }}>
        {children}
      </main>
    </>
  );
}
