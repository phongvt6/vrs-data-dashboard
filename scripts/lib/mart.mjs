// Logic thuần của tầng mart: suy kiểu cột và đổi giá trị ô Sheets sang giá trị
// ghi được vào Postgres. Tách riêng khỏi script chạy để test được.

import { slugify } from "./io.mjs";

/** Ô rỗng theo nghĩa của Sheets: null, undefined, chuỗi trắng. */
export const oRong = (v) => v === null || v === undefined || String(v).trim() === "";

const SO_CHUOI = /^-?[\d.,\s]+$/;

/**
 * "1.250.000" → 1250000 ; "9,455,000" → 9455000 ; "1,25" → 1.25 ; số giữ nguyên.
 *
 * Không thể giả định quy ước Việt (chấm ngăn nghìn): sheet do người dùng tự
 * định dạng, và các sheet đang có trong công ty dùng CẢ HAI kiểu. Đoán sai
 * hướng thì "280,000,000" thành 280 — sai 6 chữ số mà không có lỗi nào báo.
 *
 * Nên phải suy từ chính chuỗi: dấu xuất hiện SAU CÙNG là ứng viên dấu thập
 * phân, trừ khi nó lặp lại nhiều lần (=> ngăn nghìn), hoặc nó chia chuỗi thành
 * đúng các nhóm 3 chữ số và không có dấu kia (=> cũng là ngăn nghìn).
 */
export function doiSo(v) {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const goc = String(v).trim();
  if (!goc || !SO_CHUOI.test(goc)) return null;

  let s = goc.replace(/\s/g, "");
  const cuoiCham = s.lastIndexOf("."), cuoiPhay = s.lastIndexOf(",");
  const thapPhan = cuoiCham > cuoiPhay ? "." : cuoiPhay > cuoiCham ? "," : "";
  if (thapPhan) {
    const kia = thapPhan === "." ? "," : ".";
    const soLan = s.split(thapPhan).length - 1;
    const laNganNghin =
      soLan > 1 ||
      (s.indexOf(kia) === -1 && new RegExp(`^-?[1-9]\\d{0,2}(\\${thapPhan}\\d{3})+$`).test(s));
    s = laNganNghin
      ? s.replace(/[.,]/g, "")
      : s.split(kia).join("").replace(thapPhan, ".");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

// yyyy-mm-dd, và cả yyyy/mm/dd — kiểu sau là mặc định khi sheet để locale Mỹ.
const ISO = /^(\d{4})[-/.](\d{2})[-/.](\d{2})/;
const DMY = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/;

/**
 * Đổi ô ngày về chuỗi ISO. Sheets trả ngày dạng "dd/mm/yyyy" khi ta yêu cầu
 * dateTimeRenderOption=FORMATTED_STRING — quy ước Việt là NGÀY trước tháng.
 */
export function doiNgay(v) {
  if (oRong(v)) return null;
  const s = String(v).trim();
  const iso = ISO.exec(s);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = DMY.exec(s);
  if (!dmy) return null;
  const [, d, m, y] = dmy;
  const dd = Number(d), mm = Number(m);
  if (dd < 1 || dd > 31 || mm < 1 || mm > 12) return null;
  return `${y}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}

/**
 * Suy kiểu một cột từ các giá trị đã lấy mẫu.
 * Chỉ nhận numeric/date khi MỌI ô không rỗng đều hợp lệ — sai một ô là về text,
 * vì mất dữ liệu âm thầm nguy hiểm hơn nhiều so với một cột text thừa.
 */
export function suyKieu(values) {
  const co = values.filter((v) => !oRong(v));
  if (!co.length) return "text";
  if (co.every((v) => doiNgay(v) !== null)) return "date";
  if (co.every((v) => doiSo(v) !== null)) return "numeric";
  return "text";
}

/** Đổi một ô sang giá trị ghi vào cột có kiểu đã chọn. */
export function doiO(v, kieu) {
  if (oRong(v)) return null;
  if (kieu === "numeric") return doiSo(v);
  if (kieu === "date") return doiNgay(v);
  return String(v);
}

/**
 * Tên cột Postgres từ header Sheets: bỏ dấu, snake_case, không trùng nhau.
 * Cột không có tiêu đề vẫn phải có tên để không lệch thứ tự cột.
 */
export function tenCot(header) {
  const da = new Set();
  return header.map((h, i) => {
    const base = String(h ?? "").trim() ? slugify(h, da) : slugify(`cot_${i + 1}`, da);
    da.add(base);
    return base;
  });
}

/**
 * Tách header khỏi dữ liệu. Có sheet chừa dòng trống ở trên (vd tab loai_luong),
 * nên dòng tiêu đề là dòng CÓ NỘI DUNG đầu tiên, không phải cứ dòng 1.
 */
export function tachHeader(values) {
  const i = values.findIndex((r) => Array.isArray(r) && r.some((o) => !oRong(o)));
  if (i < 0) return { header: [], rows: [], boQua: 0 };
  return { header: values[i], rows: values.slice(i + 1), boQua: i };
}

/** Kế hoạch tạo bảng: tên cột + kiểu, suy từ header và tối đa `mau` dòng đầu. */
export function lenKeHoach(header, rows, mau = 500) {
  const cols = tenCot(header);
  const sample = rows.slice(0, mau);
  return cols.map((ten, i) => ({
    ten,
    goc: String(header[i] ?? ""),
    kieu: suyKieu(sample.map((r) => r[i])),
  }));
}
