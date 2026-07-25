// Gán màu categorical theo THỰC THỂ (không theo thứ hạng), Top-8 + "Khác".
// Tuân thủ quy tắc palette của app: slot 1→8 theo thứ tự, series thứ 9 gộp "Khác".

import { SERIES, CHROME } from "@/chart/lib/theme";

export const PALETTE = SERIES.light;
export const KHAC = CHROME.light.deemphasis; // xám cho phần "Khác"/tràn slot
export const NHAN_KHAC = "Khác";

/**
 * Tạo hàm tra màu ổn định cho một danh sách thực thể.
 * `keys` truyền theo thứ tự ưu tiên (vd đã sort theo doanh thu). 8 khoá đầu lấy
 * slot 1→8; khoá thứ 9 trở đi và tên "Khác" đều dùng màu xám.
 */
export function colorMap(keys: string[]): (key: string) => string {
  const map = new Map<string, string>();
  keys.forEach((k, i) => {
    if (i < PALETTE.length) map.set(k, PALETTE[i]);
  });
  return (key: string) => map.get(key) ?? KHAC;
}

/**
 * Gộp danh sách {name,value} về Top-N + "Khác" (cộng dồn phần đuôi).
 * Trả về mảng đã gộp, giữ thứ tự value giảm dần, "Khác" ở cuối.
 */
export function topNKhac<T extends { name: string; value: number }>(
  rows: T[],
  n = 8
): { name: string; value: number }[] {
  const sorted = [...rows].sort((a, b) => b.value - a.value);
  if (sorted.length <= n) return sorted.map((r) => ({ name: r.name, value: r.value }));
  const head = sorted.slice(0, n).map((r) => ({ name: r.name, value: r.value }));
  const tail = sorted.slice(n).reduce((s, r) => s + r.value, 0);
  if (tail > 0) head.push({ name: NHAN_KHAC, value: tail });
  return head;
}
