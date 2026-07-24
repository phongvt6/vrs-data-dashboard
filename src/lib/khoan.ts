// Engine tính thưởng khoán — bản port từ tool Cloudflare Worker của team kinh doanh.
//
// Vì sao phải port nguyên logic thay vì viết vài câu SQL: quỹ thưởng không phải
// một phép SUM. Nó sinh ra theo NGÀY, phụ thuộc luỹ kế doanh thu từ đầu tháng so
// với mốc KPI của quầy, rồi mới chia cho người theo giờ làm × hệ số, qua hai
// tầng (quầy / cụm quầy) và một luật 30/70 riêng cho Partime. Viết bằng SQL sẽ
// thành một khối window function không ai đọc lại được.
//
// File THUẦN, không đụng DB (phần đọc số ở khoan-data.ts) để test bằng node.
// Mọi ngày ở đây là chuỗi "YYYY-MM-DD" — so sánh chuỗi ISO là so sánh đúng thứ
// tự thời gian, và tránh sạch mọi lỗi lệch múi giờ.

export type DongDoanhThu = { ngay_thang: string; ma_cua_hang: string; doanh_thu: number };
export type DongCoChe = {
  ma_cua_hang: string; thang: number;
  moc_dt_kpi: number; pct_duoi_moc: number; pct_vuot_moc: number;
};
export type DongNhanVien = {
  ma_nv: string; ho_ten: string; chuc_vu: string;
  he_so_kpi: number; ma_cua_hang: string; thang: number;
};
export type DongGioLam = {
  ma_nv: string; ho_ten: string; gio_lam: number;
  ngay: number; thang: number; ma_cua_hang: string; chuc_vu: string;
};
export type DongSapNhap = { quay_cu: string; quay_moi: string; tu_ngay: string };

export type DuLieuTho = {
  doanh_thu: DongDoanhThu[];
  co_che: DongCoChe[];
  nhan_vien: DongNhanVien[];
  gio_lam: DongGioLam[];
  sap_nhap: DongSapNhap[];
};

/** Một ngày-quầy: doanh thu, luỹ kế so mốc, quỹ thưởng sinh ra. */
export type NgayQuay = {
  ngay: string; nam: number; thang: number; nam_thang: string;
  ma_cua_hang: string; bo_phan: string; cum: string; tram: string;
  doanh_thu: number; moc: number; thua_huong: number;
  truoc_ngay: number; luy_ke: number; vuot_moc: number;
  quy_thuong: number; ht_kpi: number;
};

/** Một ngày-người: giờ làm, điểm, và thưởng chia được. */
export type NgayNguoi = {
  ma_nv: string; ho_ten: string; chuc_vu: string; cv: string;
  ngay: string; nam: number; thang: number; nam_thang: string;
  ma_cua_hang: string; bo_phan: string; cum: string; tram: string;
  gio_lam: number; he_so: number; diem: number;
  thuong_ql: number; thuong_cum: number; thuong_nv: number;
  thuong_pt30: number; quy_thuong_vrs: number; thuc_nhan: number;
  thieu_khai_bao: boolean;
};

export type CanhBao = {
  loai: string; ngay?: string; ma_nv?: string; ma_cua_hang?: string;
  chi_tiet: string; muc?: "info" | "loi";
};

export type DoiSoat = {
  quyPhatSinh: number; quyDangChia: number; quyTreo: number;
  tongThucNhan: number; tongVrs: number; chenhLech: number; dat: boolean;
  treoChiTiet: { ma_cua_hang: string; so_ngay: number; quy: number }[];
};

export type KetQua = { rows: NgayNguoi[]; dt: NgayQuay[]; canhBao: CanhBao[]; doiSoat: DoiSoat };

// Nhóm quản lý chia thưởng theo QUẦY; các chức danh khác ở Siêu thị chia theo CỤM.
const QL = ["truong ca", "pho truong ca"];
const TQ = "truong quay";
const PARTIME = "partime";

export function norm(s: unknown): string {
  return String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d").replace(/Đ/g, "D")
    .toLowerCase().trim().replace(/\s+/g, " ");
}

const key = (...a: unknown[]) => a.map((x) => String(x ?? "")).join("|");
const ymKey = (nam: number, thang: number) => `${nam}/${String(thang).padStart(2, "0")}`;

/**
 * Bộ phận suy từ mã cửa hàng. Kiểm tra K|X TRƯỚC, vì mã nào cũng chứa chữ S
 * của tên trạm — đảo thứ tự là mọi kiosk thành siêu thị.
 */
export function boPhan(maCH: string): string {
  const s = String(maCH || "").toUpperCase();
  if (/[KX]/.test(s)) return "Kiosk";
  if (/S/.test(s)) return "Siêu thị";
  return "";
}

/** Cụm quầy = mã trạm + 3 ký tự cuối, để không gộp nhầm V52S01 với V23S01. */
export function cumQuay(maCH: string): string {
  const s = String(maCH || "");
  return s.length >= 6 ? s.slice(0, 3) + s.slice(-3) : s;
}

export const tram = (maCH: string) => String(maCH || "").slice(0, 3);

export function tinhThuong(raw: DuLieuTho, namMacDinh = new Date().getFullYear()): KetQua {
  const canhBao: CanhBao[] = [];

  // ===== 1. Năm cho từng tháng — chỉ doanh thu mới có ngày thật =====
  const namTheoThang: Record<number, number> = {};
  for (const r of raw.doanh_thu) {
    const [y, m] = r.ngay_thang.split("-").map(Number);
    if (y && m) namTheoThang[m] = y;
  }
  const namCua = (t: number) => namTheoThang[Number(t)] ?? namMacDinh;

  // ===== 2. Chính sách khoán: (quầy, năm/tháng) -> mốc + tỷ lệ trích =====
  const coChe = new Map<string, { moc: number; pDuoi: number; pVuot: number }>();
  for (const r of raw.co_che) {
    coChe.set(key(r.ma_cua_hang, ymKey(namCua(r.thang), r.thang)), {
      moc: r.moc_dt_kpi, pDuoi: r.pct_duoi_moc, pVuot: r.pct_vuot_moc,
    });
  }

  // ===== 3. Danh mục nhân sự — hai mức khoá, chặt trước lỏng sau =====
  type RecNv = { ho_ten: string; chuc_vu: string; he_so: number; ma_cua_hang: string };
  const nvChat = new Map<string, RecNv>();
  const nvLong = new Map<string, RecNv>();
  for (const r of raw.nhan_vien) {
    const rec: RecNv = {
      ho_ten: r.ho_ten, chuc_vu: r.chuc_vu, he_so: r.he_so_kpi, ma_cua_hang: r.ma_cua_hang,
    };
    nvChat.set(key(r.ma_nv, Number(r.thang), norm(r.chuc_vu), r.ma_cua_hang), rec);
    nvLong.set(key(r.ma_nv, Number(r.thang)), rec);
  }

  // ===== 4. Doanh thu -> quỹ thưởng theo ngày =====
  const dt: NgayQuay[] = raw.doanh_thu
    .filter((r) => r.ma_cua_hang && /^\d{4}-\d{2}-\d{2}$/.test(r.ngay_thang))
    .map((r) => {
      const [nam, thang] = r.ngay_thang.split("-").map(Number);
      return {
        ngay: r.ngay_thang, nam, thang, nam_thang: ymKey(nam, thang),
        ma_cua_hang: r.ma_cua_hang, bo_phan: boPhan(r.ma_cua_hang),
        cum: cumQuay(r.ma_cua_hang), tram: tram(r.ma_cua_hang),
        doanh_thu: r.doanh_thu,
        moc: 0, thua_huong: 0, truoc_ngay: 0, luy_ke: 0, vuot_moc: 0, quy_thuong: 0, ht_kpi: 0,
      };
    })
    .sort((a, b) => a.ma_cua_hang.localeCompare(b.ma_cua_hang) || a.ngay.localeCompare(b.ngay));

  // ===== 4b. Sáp nhập quầy — quầy tiếp nhận thừa hưởng luỹ kế của quầy cũ =====
  const carry = new Map<string, { tuNgay: string; soTien: number }>();
  for (const sn of raw.sap_nhap) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(sn.tu_ngay)) continue;
    const ym = ymKey(Number(sn.tu_ngay.slice(0, 4)), Number(sn.tu_ngay.slice(5, 7)));
    const soTien = dt
      .filter((r) => r.ma_cua_hang === sn.quay_cu && r.nam_thang === ym && r.ngay < sn.tu_ngay)
      .reduce((s, r) => s + r.doanh_thu, 0);
    const k = key(sn.quay_moi, ym);
    const cur = carry.get(k) ?? { tuNgay: sn.tu_ngay, soTien: 0 };
    cur.soTien += soTien;
    cur.tuNgay = sn.tu_ngay < cur.tuNgay ? sn.tu_ngay : cur.tuNgay;
    carry.set(k, cur);
    canhBao.push({
      loai: "Sáp nhập quầy", ngay: sn.tu_ngay, ma_cua_hang: sn.quay_moi, muc: "info",
      chi_tiet: `${sn.quay_cu} sáp nhập vào ${sn.quay_moi} từ ${sn.tu_ngay} — cộng ${Math.round(soTien).toLocaleString("vi-VN")} đ doanh thu luỹ kế vào mốc KPI`,
    });
  }

  const luyKe = new Map<string, number>();
  for (const r of dt) {
    const cs = coChe.get(key(r.ma_cua_hang, r.nam_thang));
    if (!cs) {
      canhBao.push({
        loai: "Thiếu cơ chế khoán", ngay: r.ngay, ma_cua_hang: r.ma_cua_hang,
        chi_tiet: `Quầy ${r.ma_cua_hang} có doanh thu tháng ${r.nam_thang} nhưng không có dòng nào trong cơ chế khoán → quỹ thưởng = 0`,
      });
    }
    r.moc = cs?.moc ?? 0;
    const pDuoi = cs?.pDuoi ?? 0;
    const pVuot = cs?.pVuot ?? 0;

    const k = key(r.ma_cua_hang, r.nam_thang);
    const cr = carry.get(k);
    r.thua_huong = cr && r.ngay >= cr.tuNgay ? cr.soTien : 0;

    const truocGoc = luyKe.get(k) ?? 0;
    luyKe.set(k, truocGoc + r.doanh_thu);

    r.truoc_ngay = truocGoc + r.thua_huong;
    r.luy_ke = truocGoc + r.doanh_thu + r.thua_huong;

    // Phần doanh thu của RIÊNG hôm nay nằm trên mốc KPI tháng.
    if (!cs || r.luy_ke <= r.moc) r.vuot_moc = 0;
    else if (r.truoc_ngay >= r.moc) r.vuot_moc = r.doanh_thu;
    else r.vuot_moc = r.luy_ke - r.moc;

    r.quy_thuong = (r.doanh_thu - r.vuot_moc) * pDuoi + r.vuot_moc * pVuot;
    r.ht_kpi = r.moc ? r.luy_ke / r.moc : 0;
  }

  const quyTheoQuay = new Map<string, number>();
  const quyTheoCum = new Map<string, number>();
  for (const r of dt) {
    quyTheoQuay.set(key(r.ngay, r.ma_cua_hang), r.quy_thuong);
    if (r.bo_phan === "Siêu thị") {
      const k = key(r.ngay, r.cum);
      quyTheoCum.set(k, (quyTheoCum.get(k) ?? 0) + r.quy_thuong);
    }
  }

  // ===== 5. Giờ làm -> điểm thưởng =====
  const rows: NgayNguoi[] = raw.gio_lam
    .filter((r) => r.ma_nv && r.ngay && r.thang)
    .map((r) => {
      const thang = Number(r.thang);
      const nam = namCua(thang);
      const ngay = `${nam}-${String(thang).padStart(2, "0")}-${String(Number(r.ngay)).padStart(2, "0")}`;

      let nv: RecNv | undefined;
      let lech = false;
      if (r.chuc_vu && r.ma_cua_hang) nv = nvChat.get(key(r.ma_nv, thang, norm(r.chuc_vu), r.ma_cua_hang));
      if (!nv) {
        nv = nvLong.get(key(r.ma_nv, thang));
        if (nv && r.chuc_vu && r.ma_cua_hang) lech = true;
      }

      const ma_cua_hang = r.ma_cua_hang || nv?.ma_cua_hang || "";
      const chuc_vu = r.chuc_vu || nv?.chuc_vu || "";
      // Thiếu khai báo thì hệ số 0 + cảnh báo — KHÔNG để một ô hỏng lan ra cả quầy.
      const he_so = nv ? nv.he_so : 0;

      const o: NgayNguoi = {
        ma_nv: r.ma_nv, ho_ten: r.ho_ten || nv?.ho_ten || "",
        chuc_vu, cv: norm(chuc_vu),
        ngay, nam, thang, nam_thang: ymKey(nam, thang),
        ma_cua_hang, bo_phan: boPhan(ma_cua_hang), cum: cumQuay(ma_cua_hang), tram: tram(ma_cua_hang),
        gio_lam: r.gio_lam, he_so, diem: r.gio_lam * he_so,
        thuong_ql: 0, thuong_cum: 0, thuong_nv: 0,
        thuong_pt30: 0, quy_thuong_vrs: 0, thuc_nhan: 0,
        thieu_khai_bao: !nv,
      };
      if (!nv) {
        canhBao.push({
          loai: "Thiếu khai báo nhân sự", ngay, ma_nv: o.ma_nv, ma_cua_hang,
          chi_tiet: `Không tìm thấy ${o.ma_nv} (tháng ${thang}) trong danh mục nhân viên → hệ số 0, thưởng 0`,
        });
      }
      if (lech && nv) {
        canhBao.push({
          loai: "Khai báo lệch", ngay, ma_nv: o.ma_nv, ma_cua_hang,
          chi_tiet: `Khai "${r.chuc_vu} @ ${r.ma_cua_hang}" nhưng danh mục tháng ${thang} ghi "${nv.chuc_vu} @ ${nv.ma_cua_hang}" → đang lấy hệ số ${nv.he_so} theo danh mục`,
        });
      }
      if (o.bo_phan === "Siêu thị" && o.cv === TQ) {
        canhBao.push({
          loai: "Trưởng quầy ở Siêu thị", ngay, ma_nv: o.ma_nv, ma_cua_hang,
          chi_tiet: "Cơ chế chưa quy định cách chia cho Trưởng quầy tại Siêu thị — cần BGĐ chốt",
        });
      }
      return o;
    });

  // ===== 6. Mẫu số =====
  const tongDiemQuay = new Map<string, number>();
  const tongDiemNvCum = new Map<string, number>();
  for (const r of rows) {
    const kq = key(r.ngay, r.ma_cua_hang);
    tongDiemQuay.set(kq, (tongDiemQuay.get(kq) ?? 0) + r.diem);
    if (r.bo_phan === "Siêu thị" && !QL.includes(r.cv) && r.cv !== TQ) {
      const kc = key(r.ngay, r.cum);
      tongDiemNvCum.set(kc, (tongDiemNvCum.get(kc) ?? 0) + r.diem);
    }
  }
  const laQuayLevel = (r: NgayNguoi) => r.bo_phan === "Kiosk" || QL.includes(r.cv);

  // ===== 7. Tầng 1 — chia theo QUẦY (Kiosk mọi chức danh + TC/PTC Siêu thị) =====
  for (const r of rows) {
    const M = tongDiemQuay.get(key(r.ngay, r.ma_cua_hang)) ?? 0;
    r.thuong_ql = laQuayLevel(r) && M > 0
      ? (r.diem / M) * (quyTheoQuay.get(key(r.ngay, r.ma_cua_hang)) ?? 0)
      : 0;
  }

  // ===== 8. Tầng 2 — chia theo CỤM (nhân viên Siêu thị), sau khi trừ phần quản lý =====
  const qlTheoCum = new Map<string, number>();
  for (const r of rows) {
    if (r.bo_phan !== "Siêu thị") continue;
    const k = key(r.ngay, r.cum);
    qlTheoCum.set(k, (qlTheoCum.get(k) ?? 0) + r.thuong_ql);
  }
  for (const r of rows) {
    if (laQuayLevel(r)) r.thuong_cum = 0;
    else {
      const k = key(r.ngay, r.cum);
      const quyConLai = (quyTheoCum.get(k) ?? 0) - (qlTheoCum.get(k) ?? 0);
      const mau = tongDiemNvCum.get(k) ?? 0;
      r.thuong_cum = mau > 0 ? (r.diem / mau) * quyConLai : 0;
    }
    r.thuong_nv = r.thuong_ql + r.thuong_cum;
  }

  // ===== 9. Partime 30/70 — tầng 1 =====
  // Partime không nhận thưởng: 30% phần của họ chia lại cho người còn lại trong
  // quầy/cụm, 70% về công ty. Mọi đồng đều phải đi đúng một trong hai đường đó.
  const sPtQuay = new Map<string, number>();
  const mNonPtQuay = new Map<string, number>();
  for (const r of rows) {
    const k = key(r.ngay, r.ma_cua_hang);
    if (r.cv === PARTIME) sPtQuay.set(k, (sPtQuay.get(k) ?? 0) + r.thuong_nv);
    else mNonPtQuay.set(k, (mNonPtQuay.get(k) ?? 0) + r.diem);
  }
  for (const r of rows) {
    const k = key(r.ngay, r.ma_cua_hang);
    const potPt = (sPtQuay.get(k) ?? 0) * 0.3;
    let v = 0;
    if (r.cv === PARTIME) v = 0;
    else if (r.bo_phan === "Kiosk") {
      const d = mNonPtQuay.get(k) ?? 0;
      v = d > 0 ? (potPt * r.diem) / d : 0;
    } else if (QL.includes(r.cv)) {
      const M = tongDiemQuay.get(k) ?? 0;
      v = M > 0 ? (r.diem / M) * potPt : 0;
    }
    r.thuong_pt30 = v; // tạm giữ phần tầng 1, cộng tầng 2 ở bước sau
  }

  // ===== 10. Partime 30/70 — tầng 2 (nhân viên Siêu thị nhận phần còn lại của cụm) =====
  const sPtCum = new Map<string, number>();
  const tCum = new Map<string, number>();
  const mNvCum = new Map<string, number>();
  for (const r of rows) {
    if (r.bo_phan !== "Siêu thị") continue;
    const k = key(r.ngay, r.cum);
    if (r.cv === PARTIME) sPtCum.set(k, (sPtCum.get(k) ?? 0) + r.thuong_nv);
    tCum.set(k, (tCum.get(k) ?? 0) + r.thuong_pt30);
    if (!QL.includes(r.cv) && r.cv !== PARTIME && r.cv !== TQ) {
      mNvCum.set(k, (mNvCum.get(k) ?? 0) + r.diem);
    }
  }
  for (const r of rows) {
    const pt30_ql = r.thuong_pt30;
    let pt30_cum = 0;
    if (r.cv !== PARTIME && !laQuayLevel(r)) {
      const k = key(r.ngay, r.cum);
      const conLai = (sPtCum.get(k) ?? 0) * 0.3 - (tCum.get(k) ?? 0);
      const d = mNvCum.get(k) ?? 0;
      pt30_cum = d > 0 ? (r.diem / d) * conLai : 0;
    }
    r.thuong_pt30 = pt30_ql + pt30_cum;
    r.quy_thuong_vrs = r.cv === PARTIME ? r.thuong_nv * 0.7 : 0;
    r.thuc_nhan = r.cv === PARTIME ? 0 : r.thuong_nv + r.thuong_pt30;
  }

  // ===== 11. Đối soát — bất biến: Σ quỹ đang chia = Σ thực nhận + Σ công ty giữ =====
  const coGioLam = new Set(rows.map((r) => key(r.ngay, r.ma_cua_hang)));
  let quyPhatSinh = 0, quyDangChia = 0, quyTreo = 0;
  const treoChiTiet = new Map<string, { so_ngay: number; quy: number }>();
  for (const r of dt) {
    quyPhatSinh += r.quy_thuong;
    if (coGioLam.has(key(r.ngay, r.ma_cua_hang))) quyDangChia += r.quy_thuong;
    else {
      quyTreo += r.quy_thuong;
      const t = treoChiTiet.get(r.ma_cua_hang) ?? { so_ngay: 0, quy: 0 };
      t.so_ngay++; t.quy += r.quy_thuong;
      treoChiTiet.set(r.ma_cua_hang, t);
      if (r.quy_thuong > 0) {
        canhBao.push({
          loai: "Quỹ treo", ngay: r.ngay, ma_cua_hang: r.ma_cua_hang,
          chi_tiet: `Có doanh thu ${Math.round(r.doanh_thu).toLocaleString("vi-VN")} đ nhưng không ai khai giờ làm → quỹ ${Math.round(r.quy_thuong).toLocaleString("vi-VN")} đ không đến tay ai`,
        });
      }
    }
  }

  // Chiều ngược lại: có khai giờ mà quầy không có doanh thu ngày đó.
  const coDoanhThu = new Set(dt.map((r) => key(r.ngay, r.ma_cua_hang)));
  const daBao = new Set<string>();
  for (const r of rows) {
    if (r.gio_lam <= 0) continue;
    const k = key(r.ngay, r.ma_cua_hang);
    if (coDoanhThu.has(k) || daBao.has(k)) continue;
    daBao.add(k);
    const nguoi = rows.filter((x) => x.ngay === r.ngay && x.ma_cua_hang === r.ma_cua_hang && x.gio_lam > 0);
    canhBao.push({
      loai: "Khai giờ nhưng quầy không có doanh thu", ngay: r.ngay, ma_cua_hang: r.ma_cua_hang,
      ma_nv: nguoi.map((x) => x.ma_nv).join(", "),
      chi_tiet: `${nguoi.length} người khai tổng ${nguoi.reduce((s, x) => s + x.gio_lam, 0)} giờ, nhưng quầy ${r.ma_cua_hang} không có dòng doanh thu ngày này → thưởng = 0`,
    });
  }

  const tongThucNhan = rows.reduce((s, r) => s + r.thuc_nhan, 0);
  const tongVrs = rows.reduce((s, r) => s + r.quy_thuong_vrs, 0);
  const chenhLech = quyDangChia - tongThucNhan - tongVrs;

  return {
    rows, dt, canhBao,
    doiSoat: {
      quyPhatSinh, quyDangChia, quyTreo, tongThucNhan, tongVrs, chenhLech,
      dat: Math.abs(chenhLech) < 1,
      treoChiTiet: [...treoChiTiet.entries()]
        .map(([ma_cua_hang, v]) => ({ ma_cua_hang, ...v }))
        .sort((a, b) => b.quy - a.quy),
    },
  };
}

/** Gộp một mảng theo khoá, cộng dồn vài trường số. Dùng chung cho mọi bảng tổng hợp. */
export function gop<T>(
  rows: T[],
  khoa: (r: T) => string,
  cong: (acc: Record<string, number>, r: T) => void,
  nhan?: (r: T) => Record<string, string>
): Array<Record<string, string | number>> {
  const m = new Map<string, Record<string, string | number>>();
  for (const r of rows) {
    const k = khoa(r);
    let o = m.get(k);
    if (!o) {
      o = { _k: k, ...(nhan ? nhan(r) : {}) };
      m.set(k, o);
    }
    cong(o as unknown as Record<string, number>, r);
  }
  return [...m.values()];
}
