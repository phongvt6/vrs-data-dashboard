// Dashboard Doanh thu tự doanh — nguồn BigQuery, query THẲNG không copy về.
//
// Khác /bang/doanh-thu đúng một chỗ: tham số đầu của duLieu() là id nguồn
// BigQuery thay vì MART. Còn lại giống hệt — đó là ý nghĩa của tầng đa nguồn.

import { Suspense } from "react";
import ChartTile from "@/chart/ChartTile";
import { duLieu } from "@/lib/nguon";
import { toRows } from "@/lib/mart";
import BangKhung, { Luoi, O, OTrong } from "../_components/BangKhung";

export const metadata = { title: "Doanh thu tự doanh — VRS" };

const NGUON = "src_d223440a";
const BANG = "`gwm-1673948129693.Revenue.doanh_thu_chi_tiet`";
const TIEN = { dinh_dang: "tien" as const };

// Nhóm hàng và mã cửa hàng bị lẫn mã hoá đơn (HD2351901…) rò từ hệ POS sang.
// Lọc ra để chart không đầy rác — xem ghi chú ở cuối trang.
const LOC_RAC = `nhom_hang_cu IS NOT NULL AND nhom_hang_cu <> ""
  AND NOT REGEXP_CONTAINS(nhom_hang_cu, r"^HD")
  AND NOT REGEXP_CONTAINS(nhom_hang_cu, r"\\{DEL\\}")`;

export default function TuDoanhPage() {
  return (
    <BangKhung
      ten="Doanh thu tự doanh"
      mo_ta="Chi tiết theo SKU · đọc trực tiếp BigQuery, không qua bản sao"
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

      <Suspense fallback={<Luoi><OTrong w={12} cao={340} /></Luoi>}>
        <HangCuoi />
      </Suspense>

      <p style={{ margin: "6px 2px 0", fontSize: 11.5, color: "var(--ink-soft)", lineHeight: 1.5 }}>
        Đã loại các bản ghi có nhóm hàng là mã hoá đơn (HD…) — lỗi rò dữ liệu từ
        hệ POS, chiếm khoảng 0,6% số dòng.
      </p>
    </BangKhung>
  );
}

async function MocDuLieu() {
  const [r] = await duLieu<{ den: { value: string } | string }>(
    NGUON,
    `SELECT FORMAT_DATE("%d/%m/%Y", MAX(ngay_thang)) den FROM ${BANG}`
  );
  const den = typeof r?.den === "object" ? r.den.value : r?.den;
  return den ? <>Số liệu đến ngày {den}</> : null;
}

async function HangDau() {
  const [tong, theoNganh] = await Promise.all([
    duLieu<{ thang: string; ngay_cuoi: string; ngay_thu: string; dt: string; dt_truoc: string; so_quay: string }>(
      NGUON,
      // Cùng cách so kỳ như dashboard kia: cắt hai kỳ về cùng số ngày đầu tháng,
      // vì tháng gần nhất chưa hết.
      `WITH ky AS (
         SELECT DATE_TRUNC(MAX(ngay_thang), MONTH) dau_thang, MAX(ngay_thang) ngay_cuoi,
                DATE_DIFF(MAX(ngay_thang), DATE_TRUNC(MAX(ngay_thang), MONTH), DAY) + 1 so_ngay
           FROM ${BANG}
       )
       SELECT FORMAT_DATE("%m/%Y", k.dau_thang) thang,
              FORMAT_DATE("%d/%m", k.ngay_cuoi) ngay_cuoi,
              CAST(k.so_ngay AS STRING) ngay_thu,
              (SELECT SUM(doanh_thu) FROM ${BANG} d
                WHERE d.ngay_thang BETWEEN k.dau_thang AND k.ngay_cuoi) dt,
              (SELECT SUM(doanh_thu) FROM ${BANG} d
                WHERE d.ngay_thang >= DATE_SUB(k.dau_thang, INTERVAL 1 MONTH)
                  AND d.ngay_thang < DATE_ADD(DATE_SUB(k.dau_thang, INTERVAL 1 MONTH), INTERVAL k.so_ngay DAY)) dt_truoc,
              (SELECT CAST(COUNT(DISTINCT ma_cua_hang) AS STRING) FROM ${BANG}) so_quay
         FROM ky k`
    ),
    duLieu(
      NGUON,
      `SELECT nhom_hang_cu nhom, SUM(doanh_thu) dt FROM ${BANG}
        WHERE ${LOC_RAC} GROUP BY 1 ORDER BY dt DESC LIMIT 6`
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
          config={{ dinh_dang: "so", don_vi: "quầy" }}
          rows={[{ label: "Quầy có phát sinh", value: Number(kpi?.so_quay ?? 0) }]}
        />
      </O>
      <O w={6} tieu_de="Top 6 nhóm hàng">
        <ChartTile loai="donut" config={TIEN} rows={toRows(theoNganh, { label: "nhom", value: "dt" })} height={200} />
      </O>
    </Luoi>
  );
}

async function HangGiua() {
  const [theoThang, topQuay] = await Promise.all([
    duLieu(
      NGUON,
      `SELECT FORMAT_DATE("%m/%Y", DATE_TRUNC(ngay_thang, MONTH)) thang, SUM(doanh_thu) dt
         FROM ${BANG} GROUP BY 1, DATE_TRUNC(ngay_thang, MONTH)
        ORDER BY DATE_TRUNC(ngay_thang, MONTH)`
    ),
    duLieu(
      NGUON,
      `SELECT ma_cua_hang, SUM(doanh_thu) dt FROM ${BANG}
        WHERE ma_cua_hang IS NOT NULL AND ma_cua_hang <> ""
        GROUP BY 1 ORDER BY dt DESC LIMIT 12`
    ),
  ]);

  return (
    <Luoi>
      <O w={8} tieu_de="Doanh thu theo tháng" ghi_chu="Toàn bộ lịch sử trong BigQuery">
        <ChartTile loai="area" config={TIEN} rows={toRows(theoThang, { label: "thang", value: "dt" })} height={300} />
      </O>
      <O w={4} tieu_de="Top 12 quầy">
        <ChartTile loai="bar" config={TIEN} rows={toRows(topQuay, { label: "ma_cua_hang", value: "dt" })} height={300} />
      </O>
    </Luoi>
  );
}

async function HangCuoi() {
  const rows = await duLieu(
    NGUON,
    // Chỉ 5 nhóm lớn nhất — cột chồng quá 5-6 thành phần là không đọc được nữa.
    `WITH top5 AS (
       SELECT nhom_hang_cu nhom FROM ${BANG} WHERE ${LOC_RAC}
        GROUP BY 1 ORDER BY SUM(doanh_thu) DESC LIMIT 5
     )
     SELECT FORMAT_DATE("%m/%Y", DATE_TRUNC(d.ngay_thang, MONTH)) thang,
            d.nhom_hang_cu nhom, SUM(d.doanh_thu) dt
       FROM ${BANG} d JOIN top5 t ON t.nhom = d.nhom_hang_cu
      WHERE d.ngay_thang >= DATE_SUB(CURRENT_DATE(), INTERVAL 24 MONTH)
      GROUP BY 1, 2, DATE_TRUNC(d.ngay_thang, MONTH)
      ORDER BY DATE_TRUNC(d.ngay_thang, MONTH)`
  );

  return (
    <Luoi>
      <O w={12} tieu_de="Top 5 nhóm hàng theo tháng" ghi_chu="24 tháng gần nhất">
        <ChartTile loai="stacked-bar" config={TIEN} rows={toRows(rows, { label: "thang", series: "nhom", value: "dt" })} height={300} />
      </O>
    </Luoi>
  );
}
