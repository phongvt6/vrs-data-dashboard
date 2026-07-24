// Dashboard Doanh thu (nguồn Google Sheets, đọc qua schema mart).
//
// KHUÔN MẪU cho dashboard viết bằng code. Công thức:
//   1. Server component. Không cần `force-dynamic` — cacheComponents lo phần đó.
//   2. Lấy số bằng duLieu(<nguồn>, sql) — có cache DÙNG CHUNG, không phải RAM.
//   3. Đổ vào <ChartTile>, xếp trong <Luoi>/<O>.
//   4. Tách mỗi hàng thành component async riêng, bọc <Suspense> — hàng nào
//      query xong trước thì hiện trước, khối nhẹ không phải chờ khối nặng.
//
// Xem /bang/tu-doanh cho bản đọc thẳng BigQuery.

import { Suspense } from "react";
import ChartTile from "@/chart/ChartTile";
import { MART, duLieu } from "@/lib/nguon";
import { moiNhat, toRows } from "@/lib/mart";
import BangKhung, { Luoi, O, OTrong } from "../_components/BangKhung";

export const metadata = { title: "Doanh thu — VRS" };

const DATASETS = ["data_doanh_thu", "data_diem_kd"];
const TIEN = { dinh_dang: "tien" as const };

export default function DoanhThuPage() {
  return (
    <BangKhung
      ten="Doanh thu"
      mo_ta="Toàn chuỗi điểm kinh doanh — theo tháng, ngành hàng và điểm bán"
      mocDuLieu={
        <Suspense fallback={null}>
          <MocDuLieu />
        </Suspense>
      }
    >
      <Suspense fallback={<Luoi><OTrong w={3} cao={130} /><OTrong w={3} cao={130} /><OTrong w={6} cao={130} /></Luoi>}>
        <HangDau />
      </Suspense>

      <Suspense fallback={<Luoi><OTrong w={8} cao={350} /><OTrong w={4} cao={350} /></Luoi>}>
        <HangGiua />
      </Suspense>

      <Suspense fallback={<Luoi><OTrong w={12} cao={370} /></Luoi>}>
        <HangCuoi />
      </Suspense>
    </BangKhung>
  );
}

async function MocDuLieu() {
  const moc = await moiNhat(DATASETS);
  return moc ? <>Số liệu tính đến {moc}</> : null;
}

async function HangDau() {
  const [tong, theoNganh] = await Promise.all([
    duLieu<{ thang: string; ngay_cuoi: string; ngay_thu: string; dt: string; dt_truoc: string; so_diem: string }>(
      MART,
      // Tháng gần nhất thường CHƯA HẾT — so thẳng với tháng đủ 30 ngày là sai
      // (nhìn như sụt 40%). Cắt cả hai kỳ về CÙNG SỐ NGÀY đầu tháng.
      `WITH ky AS (
         SELECT date_trunc('month', max(ngay))::date AS dau_thang,
                max(ngay) AS ngay_cuoi,
                (max(ngay) - date_trunc('month', max(ngay))::date + 1) AS so_ngay
           FROM mart.data_doanh_thu WHERE ngay IS NOT NULL
       )
       SELECT to_char(k.dau_thang, 'MM/YYYY') AS thang,
              to_char(k.ngay_cuoi, 'DD/MM') AS ngay_cuoi,
              k.so_ngay::text AS ngay_thu,
              (SELECT sum(d.doanh_thu) FROM mart.data_doanh_thu d
                WHERE d.ngay BETWEEN k.dau_thang AND k.ngay_cuoi) AS dt,
              (SELECT sum(d.doanh_thu) FROM mart.data_doanh_thu d
                WHERE d.ngay >= (k.dau_thang - interval '1 month')::date
                  AND d.ngay < (k.dau_thang - interval '1 month')::date + k.so_ngay) AS dt_truoc,
              (SELECT count(DISTINCT ma_cua_hang) FROM mart.data_doanh_thu) AS so_diem
         FROM ky k`
    ),
    duLieu(
      MART,
      `SELECT k.nganh, sum(d.doanh_thu) AS dt
         FROM mart.data_doanh_thu d
         JOIN mart.data_diem_kd k ON k.ma_cua_hang = d.ma_cua_hang
        WHERE k.nganh <> ''
        GROUP BY 1 ORDER BY dt DESC`
    ),
  ]);
  const kpi = tong[0];

  return (
    <Luoi>
      <O
        w={3}
        ghi_chu={kpi ? `${kpi.thang} tính đến ngày ${kpi.ngay_cuoi} · so với cùng ${kpi.ngay_thu} ngày đầu tháng trước` : undefined}
      >
        <ChartTile
          loai="stat-tile"
          config={TIEN}
          rows={[{ label: `Doanh thu ${kpi?.thang ?? ""}`, value: Number(kpi?.dt ?? 0), value2: Number(kpi?.dt_truoc ?? 0) }]}
        />
      </O>
      <O w={3}>
        <ChartTile
          loai="stat-tile"
          config={{ dinh_dang: "so", don_vi: "điểm" }}
          rows={[{ label: "Điểm kinh doanh có phát sinh", value: Number(kpi?.so_diem ?? 0) }]}
        />
      </O>
      <O w={6} tieu_de="Cơ cấu theo ngành hàng">
        <ChartTile loai="donut" config={TIEN} rows={toRows(theoNganh, { label: "nganh", value: "dt" })} height={200} />
      </O>
    </Luoi>
  );
}

async function HangGiua() {
  const [theoThang, topDiem] = await Promise.all([
    duLieu(
      MART,
      `SELECT to_char(date_trunc('month', ngay), 'MM/YYYY') AS thang, sum(doanh_thu) AS dt
         FROM mart.data_doanh_thu WHERE ngay IS NOT NULL
        GROUP BY date_trunc('month', ngay) ORDER BY date_trunc('month', ngay)`
    ),
    duLieu(
      MART,
      `SELECT ten_diem_kd, sum(doanh_thu) AS dt
         FROM mart.data_doanh_thu WHERE ten_diem_kd <> ''
        GROUP BY 1 ORDER BY dt DESC LIMIT 12`
    ),
  ]);

  return (
    <Luoi>
      <O w={8} tieu_de="Doanh thu theo tháng" ghi_chu="Toàn chuỗi, cộng tất cả điểm bán">
        <ChartTile loai="area" config={TIEN} rows={toRows(theoThang, { label: "thang", value: "dt" })} height={300} />
      </O>
      <O w={4} tieu_de="Top 12 điểm bán">
        <ChartTile loai="bar" config={TIEN} rows={toRows(topDiem, { label: "ten_diem_kd", value: "dt" })} height={300} />
      </O>
    </Luoi>
  );
}

async function HangCuoi() {
  const rows = await duLieu(
    MART,
    `SELECT to_char(date_trunc('month', d.ngay), 'MM/YYYY') AS thang, k.nganh, sum(d.doanh_thu) AS dt
       FROM mart.data_doanh_thu d
       JOIN mart.data_diem_kd k ON k.ma_cua_hang = d.ma_cua_hang
      WHERE d.ngay IS NOT NULL AND k.nganh <> ''
      GROUP BY date_trunc('month', d.ngay), k.nganh
      ORDER BY date_trunc('month', d.ngay)`
  );

  return (
    <Luoi>
      <O w={12} tieu_de="Ngành hàng theo tháng" ghi_chu="Cột chồng — vừa thấy tổng vừa thấy cơ cấu">
        <ChartTile loai="stacked-bar" config={TIEN} rows={toRows(rows, { label: "thang", series: "nganh", value: "dt" })} height={320} />
      </O>
    </Luoi>
  );
}
