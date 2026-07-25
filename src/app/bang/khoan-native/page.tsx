// Dashboard Thưởng khoán — bản NATIVE (dựng lại trên design system của app:
// ECharts <ChartTile> + theme.ts + lưới <Luoi>/<O>), thay cho bản port tĩnh.
//
// Đang dựng ở route tạm /bang/khoan-native để bản port ở /bang/thuong-khoan vẫn
// chạy trong lúc làm. Khi đủ 10 trang + verify xong sẽ chuyển route và gỡ port.
//
// Kiến trúc: server tính KetQua MỘT LẦN (engine khoan.ts, mọi ngày đều ISO string
// nên serialize được), truyền sang client app; client lọc theo kỳ/chiều và vẽ.

import { Suspense } from "react";
import { connection } from "next/server";
import { docKhoanRaw, DATASETS_KHOAN } from "@/lib/khoan-data";
import { moiNhat } from "@/lib/mart";
import BangKhung, { Luoi, OTrong } from "../_components/BangKhung";
import KhoanApp from "./KhoanApp";

export const metadata = { title: "Thưởng khoán (native) — VRS" };

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
