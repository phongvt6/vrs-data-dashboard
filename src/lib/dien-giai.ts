// Sinh phần "diễn giải" của dashboard bằng LUẬT, không gọi LLM.
//
// Đây là thứ khiến sếp đọc được dashboard mà không cần ai giải thích: nhìn ba
// khối Điểm sáng / Cảnh báo / Kiến nghị là biết chuyện gì đang xảy ra. Thuần,
// test được — dashboard chỉ đưa số vào, không tự viết câu.

export type MucSo = {
  ten: string;
  ky: number; // giá trị kỳ này
  truoc: number; // giá trị kỳ so sánh (0 nếu không có)
};

export type DienGiai = {
  diem_sang: string[];
  canh_bao: string[];
  kien_nghi: string[];
};

function pct(nay: number, truoc: number): number {
  return truoc ? (nay / truoc - 1) * 100 : 0;
}
function fmtPct(v: number): string {
  const s = v >= 0 ? "+" : "";
  return `${s}${v.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`;
}
function tien(v: number): string {
  const abs = Math.abs(v);
  const dau = v < 0 ? "-" : "";
  if (abs >= 1e9) return `${dau}${(abs / 1e9).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tỷ`;
  if (abs >= 1e6) return `${dau}${(abs / 1e6).toLocaleString("vi-VN", { maximumFractionDigits: 0 })} tr`;
  return `${dau}${abs.toLocaleString("vi-VN")}`;
}

/**
 * Sinh diễn giải cho một dashboard doanh thu.
 *
 * @param dv     đơn vị phân tích ("cửa hàng", "nhóm hàng"…)
 * @param muc    danh sách mục (mỗi cửa hàng/nhóm) với giá trị kỳ này & kỳ trước
 * @param tongKy tổng kỳ này
 * @param tongTruoc tổng kỳ so sánh
 * @param nhanKy nhãn kỳ so sánh ("so tháng trước")
 */
export function dienGiaiDoanhThu(
  dv: string,
  muc: MucSo[],
  tongKy: number,
  tongTruoc: number,
  nhanKy: string
): DienGiai {
  const g: DienGiai = { diem_sang: [], canh_bao: [], kien_nghi: [] };
  if (!muc.length) return g;

  const sapTheoKy = [...muc].sort((a, b) => b.ky - a.ky);

  // ---- Tổng quan + Pareto ----
  const dTong = pct(tongKy, tongTruoc);
  const luyKe: number[] = [];
  sapTheoKy.reduce((s, m, i) => (luyKe[i] = s + m.ky), 0);
  const nguong = tongKy * 0.8;
  const soTruCot = Math.max(1, luyKe.findIndex((v) => v >= nguong) + 1);
  g.diem_sang.push(
    `Tổng ${tien(tongKy)} ₫${tongTruoc ? `, ${fmtPct(dTong)} ${nhanKy}` : ""}. ` +
      `${soTruCot}/${muc.length} ${dv} tạo ~80% doanh thu (mức tập trung).`
  );

  // ---- Đầu tàu tăng trưởng ----
  const tang = muc
    .filter((m) => m.truoc > 0 && m.ky > m.truoc)
    .map((m) => ({ ...m, d: pct(m.ky, m.truoc), chenh: m.ky - m.truoc }))
    .sort((a, b) => b.chenh - a.chenh)
    .slice(0, 3);
  for (const t of tang) {
    g.diem_sang.push(`${t.ten} tăng ${tien(t.chenh)} ₫ (${fmtPct(t.d)}) — đầu kéo tăng trưởng.`);
  }

  // ---- Cảnh báo: giảm mạnh ----
  const giam = muc
    .filter((m) => m.truoc > 0 && m.ky < m.truoc)
    .map((m) => ({ ...m, d: pct(m.ky, m.truoc), chenh: m.ky - m.truoc }))
    .sort((a, b) => a.chenh - b.chenh)
    .slice(0, 3);
  for (const t of giam) {
    g.canh_bao.push(`${t.ten} giảm ${tien(t.chenh)} ₫ (${fmtPct(t.d)}) ${nhanKy} — cần rà soát nguyên nhân.`);
  }
  // Mục mới mất hẳn doanh thu.
  const mat = muc.filter((m) => m.truoc > 0 && m.ky === 0).slice(0, 2);
  for (const t of mat) {
    g.canh_bao.push(`${t.ten} không còn doanh thu kỳ này (kỳ trước ${tien(t.truoc)} ₫) — kiểm tra ngừng hoạt động?`);
  }

  // ---- Kiến nghị ----
  if (tang.length) {
    g.kien_nghi.push(`Nhân rộng cách làm của ${tang[0].ten} (đang tăng mạnh) sang các ${dv} tương đồng.`);
  }
  if (giam.length) {
    g.kien_nghi.push(`Lập kế hoạch phục hồi cho ${giam[0].ten}: rà lượng khách, giá, trưng bày, cạnh tranh khu vực.`);
  }
  if (soTruCot <= Math.ceil(muc.length * 0.25)) {
    g.kien_nghi.push(
      `Doanh thu phụ thuộc ít ${dv} (${soTruCot}/${muc.length}) — đặt mục tiêu cho nhóm đuôi để giảm rủi ro.`
    );
  }

  return g;
}
