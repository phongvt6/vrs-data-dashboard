// Dashboard Doanh thu — bản mẫu để tham chiếu khi viết dashboard mới.
//
// Công thức của một trang dashboard:
//   1. Server component, `dynamic = "force-dynamic"` để luôn đọc số mới.
//   2. Query thẳng schema mart bằng SQL (dữ liệu do `npm run sync` kéo về).
//   3. Đổ vào <ChartTile> của thư viện chart, xếp trong <Luoi>/<O>.
//   4. Bọc tất cả bằng <BangKhung> để có nút "Về app chính" và mốc dữ liệu.

import ChartTile from "@/chart/ChartTile";
import { mart, moiNhat, toRows } from "@/lib/mart";
import BangKhung, { Luoi, O } from "../_components/BangKhung";

export const dynamic = "force-dynamic";
export const metadata = { title: "Doanh thu — VRS" };

const DATASETS = ["data_doanh_thu", "data_diem_kd"];

export default async function DoanhThuPage() {
  const [theoThang, theoNganh, topDiem, theoPhanLoai, tong, moc] = await Promise.all([
    mart(`SELECT to_char(date_trunc('month', ngay), 'MM/YYYY') AS thang,
                 sum(doanh_thu) AS dt
            FROM mart.data_doanh_thu
           WHERE ngay IS NOT NULL
           GROUP BY date_trunc('month', ngay)
           ORDER BY date_trunc('month', ngay)`),

    mart(`SELECT k.nganh, sum(d.doanh_thu) AS dt
            FROM mart.data_doanh_thu d
            JOIN mart.data_diem_kd k ON k.ma_cua_hang = d.ma_cua_hang
           WHERE k.nganh <> ''
           GROUP BY 1 ORDER BY dt DESC`),

    mart(`SELECT ten_diem_kd, sum(doanh_thu) AS dt
            FROM mart.data_doanh_thu
           WHERE ten_diem_kd <> ''
           GROUP BY 1 ORDER BY dt DESC LIMIT 12`),

    mart(`SELECT to_char(date_trunc('month', d.ngay), 'MM/YYYY') AS thang,
                 k.nganh, sum(d.doanh_thu) AS dt
            FROM mart.data_doanh_thu d
            JOIN mart.data_diem_kd k ON k.ma_cua_hang = d.ma_cua_hang
           WHERE d.ngay IS NOT NULL AND k.nganh <> ''
           GROUP BY date_trunc('month', d.ngay), k.nganh
           ORDER BY date_trunc('month', d.ngay)`),

    // KPI so tháng gần nhất với tháng trước — nhưng tháng gần nhất thường CHƯA
    // HẾT, so thẳng với một tháng đủ 30 ngày là sai (nhìn như sụt 40%). Nên cắt
    // cả hai kỳ về CÙNG SỐ NGÀY đầu tháng, và nói rõ đang so tới ngày nào.
    mart<{ thang: string; ngay_cuoi: string; ngay_thu: string; dt: string; dt_truoc: string; so_diem: string }>(`
      WITH ky AS (
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
        FROM ky k`),

    moiNhat(DATASETS),
  ]);

  const kpi = tong[0];
  const tien = { dinh_dang: "tien" as const };

  return (
    <BangKhung
      ten="Doanh thu"
      mo_ta="Toàn chuỗi điểm kinh doanh — theo tháng, ngành hàng và điểm bán"
      mocDuLieu={moc}
    >
      <Luoi>
        <O w={3} ghi_chu={kpi ? `${kpi.thang} tính đến ngày ${kpi.ngay_cuoi} · so với cùng ${kpi.ngay_thu} ngày đầu tháng trước` : undefined}>
          <ChartTile
            loai="stat-tile"
            config={tien}
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
          <ChartTile
            loai="donut"
            config={tien}
            rows={toRows(theoNganh, { label: "nganh", value: "dt" })}
            height={200}
          />
        </O>
      </Luoi>

      <Luoi>
        <O w={8} tieu_de="Doanh thu theo tháng" ghi_chu="Toàn chuỗi, cộng tất cả điểm bán">
          <ChartTile
            loai="area"
            config={tien}
            rows={toRows(theoThang, { label: "thang", value: "dt" })}
            height={300}
          />
        </O>
        <O w={4} tieu_de="Top 12 điểm bán">
          <ChartTile
            loai="bar"
            config={tien}
            rows={toRows(topDiem, { label: "ten_diem_kd", value: "dt" })}
            height={300}
          />
        </O>
      </Luoi>

      <Luoi>
        <O w={12} tieu_de="Ngành hàng theo tháng" ghi_chu="Cột chồng — vừa thấy tổng vừa thấy cơ cấu">
          <ChartTile
            loai="stacked-bar"
            config={tien}
            rows={toRows(theoPhanLoai, { label: "thang", series: "nganh", value: "dt" })}
            height={320}
          />
        </O>
      </Luoi>
    </BangKhung>
  );
}
