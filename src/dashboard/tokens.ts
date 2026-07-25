// Cầu nối token: biến bảng màu + thang chữ trong `src/chart/lib/theme.ts` (nguồn
// sự thật duy nhất) thành các biến CSS `--ds-*` để CHROME của dashboard (sidebar,
// thẻ, bảng) và BIỂU ĐỒ dùng CHUNG một bảng màu — hết cảnh 3 hệ tô màu lệch nhau.
//
// Không sinh ra file CSS, không cần bước build: `dsVars()` trả về object style áp
// thẳng lên gốc <DashboardShell>. Mọi thứ bên trong shell đọc được `var(--ds-*)`.

import type { CSSProperties } from "react";
import { CHROME, SERIES, FONT, STATUS, type Mode } from "@/chart/lib/theme";

/**
 * Object các custom property `--ds-*` sinh từ theme.ts. Áp lên style của phần tử
 * bao ngoài dashboard; con cháu dùng `var(--ds-ink)`, `var(--ds-series-1)`…
 *
 * Quy ước accent: accent của dashboard = series-1 (xanh dương của biểu đồ) để
 * chrome và dữ liệu ĂN KHỚP màu. Đây là màu nhấn DUY NHẤT bên trong dashboard.
 */
export function dsVars(mode: Mode = "light"): CSSProperties {
  const c = CHROME[mode];
  const s = SERIES[mode];
  const vars: Record<string, string> = {
    // Nền & mặt phẳng
    "--ds-surface": c.surface,
    "--ds-plane": c.plane,
    "--ds-panel": mode === "light" ? "#ffffff" : c.surface,
    // Mực
    "--ds-ink": c.ink,
    "--ds-ink-2": c.inkSecondary,
    "--ds-ink-muted": c.inkMuted,
    // Đường kẻ
    "--ds-line": c.border,
    "--ds-line-strong": c.axis,
    "--ds-grid": c.grid,
    // Nhấn = series-1
    "--ds-accent": s[0],
    "--ds-accent-ink": "#ffffff",
    // Chênh lệch
    "--ds-good": c.deltaGood,
    "--ds-bad": c.deltaBad,
    // Trạng thái
    "--ds-status-good": STATUS.good,
    "--ds-status-warning": STATUS.warning,
    "--ds-status-critical": STATUS.critical,
    // Thang chữ (px) — để chrome đọc cùng thang với biểu đồ
    "--ds-fs-page": `${FONT.pageTitle}px`,
    "--ds-fs-card": `${FONT.cardTitle}px`,
    "--ds-fs-kpi": `${FONT.kpi}px`,
    "--ds-fs-stat": `${FONT.stat}px`,
    "--ds-fs-body": `${FONT.body}px`,
    "--ds-fs-caption": `${FONT.caption}px`,
  };
  // 8 slot màu series
  s.forEach((hex, i) => {
    vars[`--ds-series-${i + 1}`] = hex;
  });

  // Alias các biến CŨ của app → giá trị `--ds-*`. Được đặt inline trên gốc Shell
  // nên chỉ ghi đè TRONG phạm vi dashboard (ngoài dashboard, catalog/admin vẫn
  // giữ accent teal). Nhờ đó code cũ dùng var(--panel)/var(--line)/var(--accent)…
  // tự động khớp bảng màu thống nhất, không phải sửa từng chỗ.
  Object.assign(vars, {
    "--surface": c.surface,
    "--paper": c.plane,
    "--panel": vars["--ds-panel"],
    "--panel-2": c.plane,
    "--line": c.border,
    "--line-strong": c.axis,
    "--ink": c.ink,
    "--ink-soft": c.inkSecondary,
    "--accent": s[0],
    "--accent-soft": c.grid,
    "--delta-good": c.deltaGood,
    "--delta-bad": c.deltaBad,
  });
  return vars as CSSProperties;
}

/** Bán kính bo góc thống nhất cho thẻ / nút / ô. */
export const RADIUS = { card: 12, control: 9, pill: 999 } as const;

/** Khoảng cách thống nhất (px) giữa các ô trong lưới dashboard. */
export const GAP = 12;
