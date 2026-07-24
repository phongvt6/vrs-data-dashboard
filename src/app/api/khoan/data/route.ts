import { mart } from "@/lib/mart";

// Nguồn dữ liệu cho dashboard Thưởng khoán (front-end tĩnh ở public/khoan/).
//
// Trả JSON ĐÚNG shape mà worker.js gốc trả ở /api/data, nhưng đọc từ
// mart.khoan_* (bản sao Google Sheet đã sync) thay vì fetch CSV mỗi lần. Nhờ vậy
// giao diện của nhân viên chạy y nguyên, engine tính thưởng vẫn ở client, và số
// giống hệt sheet vì mart là bản sao trung thực.
//
// Client (public/khoan/index.html) tự đổi ngay_thang/tu_ngay từ chuỗi "YYYY-MM-DD"
// về Date, nên ở đây chỉ cần trả chuỗi ISO.
//
// Không khai `export const dynamic` — cacheComponents từ chối. Route đọc DB nên
// đã là dynamic; freshness do header Cache-Control (CDN) lo, ?fresh=1 đổi cache
// key nên tự bỏ qua cache.

/** "2.5%" -> 0.025 ; "15%" -> 0.15 ; "0,15" -> 0.15. Giống pct() của worker. */
function pct(v: unknown): number {
  if (v == null || v === "") return 0;
  const s = String(v).trim();
  const co = s.includes("%");
  const n = Number(s.replace("%", "").replace(/\s/g, "").replace(",", "."));
  if (!Number.isFinite(n)) return 0;
  return co ? n / 100 : n > 1 ? n / 100 : n;
}

// Cột numeric của Postgres về JS là chuỗi ("1.5", "280000000") — không có dấu
// ngăn nghìn, nên Number() là đủ.
const so = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const s = (v: unknown) => String(v ?? "").trim();

export async function GET() {
  try {
    const [nhanVien, coChe, doanhThu, gioLam, sapNhap] = await Promise.all([
      mart<{ ma_nv: string; ho_ten: string; chuc_vu: string; he_so_kpi: string; ma_cua_hang: string; thang: string }>(
        `SELECT ma_nv, ho_ten, chuc_vu, he_so_kpi, ma_cua_hang, thang
           FROM mart.khoan_nhan_vien WHERE ma_nv <> ''`
      ),
      mart<{ ma_cua_hang: string; thang: string; moc_dt_kpi: string; duoi_moc: string; vuot_moc: string }>(
        `SELECT ma_cua_hang, thang, moc_dt_kpi, duoi_moc, vuot_moc
           FROM mart.khoan_co_che_thuong WHERE ma_cua_hang <> ''`
      ),
      mart<{ ngay_thang: string; ma_cua_hang: string; doanh_thu: string }>(
        `SELECT to_char(ngay_thang, 'YYYY-MM-DD') AS ngay_thang, ma_cua_hang, doanh_thu
           FROM mart.khoan_doanh_thu WHERE ngay_thang IS NOT NULL AND ma_cua_hang <> ''`
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

    const body = {
      meta: {
        // Sheet đã sync ra ISO nên định dạng ngày luôn là ISO ở đây.
        fmt_ngay: "iso",
        cap_nhat: new Date().toISOString(),
        dem: {
          nhan_vien: nhanVien.length,
          co_che: coChe.length,
          doanh_thu: doanhThu.length,
          gio_lam: gioLam.length,
        },
      },
      nhan_vien: nhanVien.map((r) => ({
        ma_nv: s(r.ma_nv), ho_ten: r.ho_ten, chuc_vu: s(r.chuc_vu),
        he_so_kpi: so(r.he_so_kpi), ma_cua_hang: s(r.ma_cua_hang),
        thang: so(r.thang), nam: null,
      })),
      co_che: coChe.map((r) => ({
        ma_cua_hang: s(r.ma_cua_hang), thang: so(r.thang), nam: null,
        moc_dt_kpi: so(r.moc_dt_kpi), pct_duoi_moc: pct(r.duoi_moc), pct_vuot_moc: pct(r.vuot_moc),
      })),
      doanh_thu: doanhThu.map((r) => ({
        ngay_thang: r.ngay_thang, ma_cua_hang: s(r.ma_cua_hang), doanh_thu: so(r.doanh_thu),
      })),
      gio_lam: gioLam
        .map((r) => ({
          ma_nv: s(r.ma_nv), ho_ten: r.ho_ten, gio_lam: so(r.gio_lam),
          ngay: so(r.ngay), thang: so(r.thang), nam: null,
          ma_cua_hang: s(r.ma_cua_hang), chuc_vu: s(r.chuc_vu),
        }))
        .filter((r) => r.ngay && r.thang),
      sap_nhap: sapNhap.map((r) => ({
        quay_cu: s(r.quay_cu), quay_moi: s(r.quay_moi), tu_ngay: r.tu_ngay,
      })),
    };

    return Response.json(body, {
      headers: { "Cache-Control": "public, s-maxage=180, stale-while-revalidate=180" },
    });
  } catch (e) {
    // Client đọc trường `loi` để hiện thông báo lỗi thay vì trắng màn hình.
    return Response.json({ loi: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
