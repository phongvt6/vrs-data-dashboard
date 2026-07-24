import { Suspense } from "react";
import SiteHeader from "@/app/_components/SiteHeader";

/**
 * Layout của app chính: header + khung 1180px.
 *
 * <Suspense> là ranh giới streaming — header và nền hiện NGAY, phần thân đợi
 * query xong mới chảy về. Không có nó thì một query chậm giữ trắng cả trang.
 */
export default function ChinhLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader authDisabled={process.env.AUTH_DISABLED === "1"} />
      <main style={{ maxWidth: 1180, margin: "0 auto", padding: "32px 24px 80px" }}>
        <Suspense fallback={<DangTai />}>{children}</Suspense>
      </main>
    </>
  );
}

function DangTai() {
  return (
    <div style={{ display: "grid", placeItems: "center", minHeight: 320, color: "var(--ink-soft)", fontSize: 14 }}>
      Đang tải…
    </div>
  );
}
