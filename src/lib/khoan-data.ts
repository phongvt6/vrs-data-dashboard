import "server-only";
import { mart } from "./mart";
import { tinhThuong, type DuLieuTho, type KetQua } from "./khoan";

// Đọc 5 bảng khoán từ schema mart rồi chạy engine.
//
// Toàn bộ dữ liệu vào RAM một lần (cỡ 14k dòng — không đáng kể) vì engine cần
// nhìn cả tháng để tính luỹ kế; query từng mẩu sẽ vừa chậm vừa sai.
//
// Ngày luôn ép về chuỗi 'YYYY-MM-DD' ngay trong SQL: cột date của Postgres về
// tới JS sẽ thành Date theo múi giờ máy chủ, và Vercel chạy UTC — đủ để lệch
// một ngày, tức là lệch cả tháng khoán ở ranh giới đầu/cuối tháng.

export const DATASETS_KHOAN = [
  "khoan_doanh_thu", "khoan_co_che_thuong", "khoan_nhan_vien",
  "khoan_gio_lam", "khoan_sap_nhap",
];

/** "2.5%" -> 0.025 ; "15%" -> 0.15 ; "0,15" -> 0.15. */
export function tyLe(v: unknown): number {
  if (v == null || v === "") return 0;
  const s = String(v).trim();
  const coPhanTram = s.includes("%");
  const n = Number(s.replace("%", "").replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(n)) return 0;
  return coPhanTram ? n / 100 : n > 1 ? n / 100 : n;
}

const so = (v: unknown) => {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

export async function docKhoan(): Promise<{ ketQua: KetQua; datasets: string[] }> {
  const [doanhThu, coChe, nhanVien, gioLam, sapNhap] = await Promise.all([
    mart<{ ngay_thang: string; ma_cua_hang: string; doanh_thu: string }>(
      `SELECT to_char(ngay_thang, 'YYYY-MM-DD') AS ngay_thang, ma_cua_hang, doanh_thu
         FROM mart.khoan_doanh_thu WHERE ngay_thang IS NOT NULL AND ma_cua_hang <> ''`
    ),
    mart<{ ma_cua_hang: string; thang: string; moc_dt_kpi: string; duoi_moc: string; vuot_moc: string }>(
      `SELECT ma_cua_hang, thang, moc_dt_kpi, duoi_moc, vuot_moc
         FROM mart.khoan_co_che_thuong WHERE ma_cua_hang <> ''`
    ),
    mart<{ ma_nv: string; ho_ten: string; chuc_vu: string; he_so_kpi: string; ma_cua_hang: string; thang: string }>(
      `SELECT ma_nv, ho_ten, chuc_vu, he_so_kpi, ma_cua_hang, thang
         FROM mart.khoan_nhan_vien WHERE ma_nv <> ''`
    ),
    mart<{ ma_nv: string; ho_ten: string; gio_lam: string; ngay: string; thang: string; ma_cua_hang: string; chuc_vu: string }>(
      `SELECT ma_nv, ho_ten, gio_lam, ngay, thang, ma_cua_hang, chuc_vu
         FROM mart.khoan_gio_lam WHERE ma_nv <> '' AND ngay IS NOT NULL AND thang IS NOT NULL`
    ),
    mart<{ quay_cu: string; quay_moi: string; tu_ngay: string }>(
      `SELECT quay_cu, quay_moi, to_char(tu_ngay, 'YYYY-MM-DD') AS tu_ngay
         FROM mart.khoan_sap_nhap WHERE quay_cu <> '' AND quay_moi <> ''`
    ),
  ]);

  const raw: DuLieuTho = {
    doanh_thu: doanhThu.map((r) => ({
      ngay_thang: r.ngay_thang, ma_cua_hang: String(r.ma_cua_hang).trim(), doanh_thu: so(r.doanh_thu),
    })),
    co_che: coChe.map((r) => ({
      ma_cua_hang: String(r.ma_cua_hang).trim(), thang: so(r.thang),
      moc_dt_kpi: so(r.moc_dt_kpi), pct_duoi_moc: tyLe(r.duoi_moc), pct_vuot_moc: tyLe(r.vuot_moc),
    })),
    nhan_vien: nhanVien.map((r) => ({
      ma_nv: String(r.ma_nv).trim(), ho_ten: String(r.ho_ten ?? "").trim(),
      chuc_vu: String(r.chuc_vu ?? "").trim(), he_so_kpi: so(r.he_so_kpi),
      ma_cua_hang: String(r.ma_cua_hang ?? "").trim(), thang: so(r.thang),
    })),
    gio_lam: gioLam.map((r) => ({
      ma_nv: String(r.ma_nv).trim(), ho_ten: String(r.ho_ten ?? "").trim(),
      gio_lam: so(r.gio_lam), ngay: so(r.ngay), thang: so(r.thang),
      ma_cua_hang: String(r.ma_cua_hang ?? "").trim(), chuc_vu: String(r.chuc_vu ?? "").trim(),
    })),
    sap_nhap: sapNhap.map((r) => ({
      quay_cu: String(r.quay_cu).trim(), quay_moi: String(r.quay_moi).trim(), tu_ngay: r.tu_ngay,
    })),
  };

  return { ketQua: tinhThuong(raw), datasets: DATASETS_KHOAN };
}
