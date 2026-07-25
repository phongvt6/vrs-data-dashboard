// Dashboard Thưởng khoán — bản NATIVE (dựng lại trên design system của app:
// ECharts <ChartTile> + theme.ts + lưới <Luoi>/<O>). Đây là bản chính thức ở
// route /bang/thuong-khoan.
//
// Bản gốc do team kinh doanh xây (SPA tĩnh port từ Cloudflare Worker) vẫn giữ
// song song ở /bang/thuong-khoan-cu để đối chiếu — xem rewrite trong next.config.ts
// và mục "Bảng thi đua (bản gốc)" trỏ sang đó trong KhoanApp.
//
// Kiến trúc: server tính KetQua MỘT LẦN (engine khoan.ts, mọi ngày đều ISO string
// nên serialize được), truyền sang client app; client lọc theo kỳ/chiều và vẽ.

import { Suspense } from "react";
import { connection } from "next/server";
import { docKhoanRaw, DATASETS_KHOAN } from "@/lib/khoan-data";
import { moiNhat } from "@/lib/mart";
import { Loading } from "@/dashboard/layout";
import KhoanApp from "./KhoanApp";

export const metadata = { title: "Thưởng khoán — VRS" };

// Chrome giờ nằm trong KhoanApp (DashboardShell — sidebar trái, thống nhất với
// các dashboard nhiều view khác). Trang chỉ lo lấy dữ liệu server rồi truyền vào.
export default function KhoanNativePage() {
  return (
    <Suspense fallback={<div style={{ padding: 40 }}><Loading cao={480} /></div>}>
      <NoiDung />
    </Suspense>
  );
}

async function NoiDung() {
  await connection(); // Bail khỏi prerender: engine khoán chạy tại request-time.
  const [raw, moc] = await Promise.all([docKhoanRaw(), moiNhat(DATASETS_KHOAN)]);
  return <KhoanApp raw={raw} moc={moc ?? null} />;
}
