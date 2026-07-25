// Định dạng số + %± cho dashboard tự doanh native.
// Dùng lại token định dạng của app (vnCompact/vnNumber/vnPercent trong theme).

import { vnCompact, vnNumber } from "@/chart/lib/theme";

export { vnCompact, vnNumber };

/** Doanh thu rút gọn kèm "₫": 1_250_000_000 → "1,25 tỷ ₫". */
export function tien(n: number, digits = 1): string {
  return `${vnCompact(n, digits)} ₫`;
}

/** Số nguyên đủ chữ số: 1250000 → "1.250.000". */
export function so(n: number): string {
  return vnNumber(Math.round(n));
}

export type Delta = { pct: number | null; abs: number; good: boolean };

/**
 * %± của `cur` so với `base`. `pct = null` khi base = 0 (tránh chia 0 / vô nghĩa).
 * `good` = true nếu tăng (để tô xanh), false nếu giảm.
 */
export function delta(cur: number, base: number): Delta {
  const abs = cur - base;
  const pct = base ? (cur / base - 1) * 100 : null;
  return { pct, abs, good: abs >= 0 };
}

/** "+12,3%" / "−4,5%" / "—" (khi null). Luôn có dấu. */
export function fmtPct(pct: number | null, digits = 1): string {
  if (pct == null) return "—";
  const s = pct >= 0 ? "+" : "−";
  return `${s}${Math.abs(pct)
    .toLocaleString("vi-VN", { minimumFractionDigits: 0, maximumFractionDigits: digits })
    .replace(/,0+$/, "")}%`;
}

/** Cụm "±X ₫ (±Y%)" cho câu diễn giải. */
export function pctPhrase(cur: number, base: number): string {
  const d = delta(cur, base);
  return `${d.abs >= 0 ? "+" : "−"}${vnCompact(Math.abs(d.abs))} ₫ (${fmtPct(d.pct)})`;
}

/** Tỷ trọng: 0.234 → "23,4%". */
export function share(frac: number, digits = 1): string {
  return `${(frac * 100)
    .toLocaleString("vi-VN", { minimumFractionDigits: 0, maximumFractionDigits: digits })
    .replace(/,0+$/, "")}%`;
}

/** "dd/mm" từ "YYYY-MM-DD". */
export function ngayNgan(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}` : iso;
}

/** "dd/mm/yyyy" từ "YYYY-MM-DD". */
export function ngayDay(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}
