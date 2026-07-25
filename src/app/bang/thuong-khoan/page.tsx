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
import BangKhung, { Luoi, OTrong } from "../_components/BangKhung";
import KhoanApp from "./KhoanApp";

export const metadata = { title: "Thưởng khoán — VRS" };

export default function KhoanNativePage() {
  return (
    <BangKhung
      ten="Thưởng khoán"
      mo_ta="Quỹ thưởng sinh từ doanh thu theo mốc KPI của từng quầy, chia cho nhân viên theo giờ làm × hệ số"
      mocDuLieu={
        <Suspense fallback={null}>
          <MocDuLieu />
        </Suspense>
      }
    >
      <Suspense
        fallback={
          <>
            <Luoi><OTrong w={2} cao={120} /><OTrong w={2} cao={120} /><OTrong w={3} cao={120} /><OTrong w={3} cao={120} /><OTrong w={2} cao={120} /></Luoi>
            <Luoi><OTrong w={6} cao={260} /><OTrong w={6} cao={260} /></Luoi>
          </>
        }
      >
        <NoiDung />
      </Suspense>
    </BangKhung>
  );
}

async function MocDuLieu() {
  await connection(); // Đọc DB tại request-time — build khỏi cần DATABASE_URL.
  const moc = await moiNhat(DATASETS_KHOAN);
  return moc ? <>Số liệu tính đến {moc}</> : null;
}

async function NoiDung() {
  await connection(); // Bail khỏi prerender: engine khoán chạy tại request-time.
  const raw = await docKhoanRaw();
  return <KhoanApp raw={raw} />;
}
