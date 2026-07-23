import type { Metadata } from "next";
import "./globals.css";
import AppShell from "./_components/AppShell";

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
      <body>
        <AppShell authDisabled={process.env.AUTH_DISABLED === "1"}>{children}</AppShell>
      </body>
    </html>
  );
}
