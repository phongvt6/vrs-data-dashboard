import type { Metadata } from "next";
import "./globals.css";

// Layout gốc chỉ dựng khung html/body. Phần chrome (header, bề ngang trang) nằm
// ở layout của từng nhóm route:
//   (chinh)/layout.tsx — app chính: header + khung 1180px
//   bang/layout.tsx    — dashboard: toàn màn hình, không header
export const metadata: Metadata = {
  title: "Data & Dashboard",
  description: "Danh mục dữ liệu và dashboard của công ty",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
