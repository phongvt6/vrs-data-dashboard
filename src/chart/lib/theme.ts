/**
 * Design token cho toàn bộ biểu đồ.
 *
 * Bảng màu categorical đã được kiểm định (colorblind-safe) ở CẢ light lẫn dark:
 * - worst adjacent CVD ΔE 9.1 (light) / 8.4 (dark)  — ngưỡng ≥ 8
 * - worst adjacent normal-vision ΔE 19.6 / 19.3     — ngưỡng ≥ 15
 *
 * QUY TẮC BẤT DI BẤT DỊCH khi dùng lại bộ này:
 * 1. Gán màu theo ĐÚNG THỨ TỰ slot 1→8, không bao giờ xoay vòng.
 *    Series thứ 9 không sinh màu mới — gộp vào "Khác" hoặc tách small multiples.
 * 2. Màu bám theo THỰC THỂ, không bám theo thứ hạng. Lọc bớt series thì các
 *    series còn lại giữ nguyên màu.
 * 3. Chart dạng "mọi cặp cùng xuất hiện" (scatter, bubble, choropleth) chỉ dùng
 *    tối đa 3 slot đầu.
 * 4. Sequential = 1 hue nhạt→đậm. Diverging = 2 hue + xám ở giữa. Không cầu vồng.
 */

export type Mode = 'light' | 'dark'

/** 8 slot categorical — dùng để phân biệt DANH TÍNH các series. */
export const SERIES: Record<Mode, string[]> = {
  light: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'],
  dark: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'],
}

export const SERIES_HUE_NAMES = [
  'blue',
  'orange',
  'aqua',
  'yellow',
  'magenta',
  'green',
  'violet',
  'red',
]

/** Ramp sequential (blue) — dùng cho ĐỘ LỚN liên tục: heatmap, choropleth. */
export const SEQUENTIAL_BLUE = [
  '#cde2fb',
  '#b7d3f6',
  '#9ec5f4',
  '#86b6ef',
  '#6da7ec',
  '#5598e7',
  '#3987e5',
  '#2a78d6',
  '#256abf',
  '#1c5cab',
  '#184f95',
  '#104281',
  '#0d366b',
]

/**
 * Ramp sequential theo mode.
 *
 * Ở dark mode ramp bị ĐẢO CHIỀU: nguyên tắc là "giá trị gần 0 thì lùi về phía
 * màu nền". Trên nền sáng, gần 0 = nhạt; trên nền tối, gần 0 = đậm. Nếu bê
 * nguyên ramp light sang dark thì ô giá trị THẤP lại sáng rực và nổi hơn ô giá
 * trị cao — đọc ngược hoàn toàn.
 */
export const SEQUENTIAL: Record<Mode, string[]> = {
  light: SEQUENTIAL_BLUE,
  dark: SEQUENTIAL_BLUE.slice().reverse(),
}

/**
 * Ramp ordinal (các mức rời rạc có thứ tự: bậc phễu, hạng mức).
 * Bước nhạt nhất vẫn phải đạt 2:1 so với nền — light bắt đầu từ step 250.
 */
export const ORDINAL_BLUE: Record<Mode, string[]> = {
  light: ['#0d366b', '#184f95', '#256abf', '#3987e5', '#6da7ec', '#86b6ef'],
  dark: ['#cde2fb', '#9ec5f4', '#6da7ec', '#3987e5', '#256abf', '#184f95'],
}

/** Diverging blue ↔ red, midpoint XÁM (không phải hue thứ ba). */
export const DIVERGING: Record<Mode, { neg: string; mid: string; pos: string }> = {
  light: { neg: '#2a78d6', mid: '#f0efec', pos: '#e34948' },
  dark: { neg: '#3987e5', mid: '#383835', pos: '#e66767' },
}

/**
 * Màu trạng thái — DÙNG RIÊNG, không bao giờ tái sử dụng làm "series thứ 4".
 * Luôn đi kèm icon + nhãn chữ, không để màu tự gánh nghĩa.
 */
export const STATUS = {
  good: '#0ca30c',
  warning: '#fab219',
  serious: '#ec835a',
  critical: '#d03b3b',
} as const

/** Chrome & mực — nền, lưới, trục, chữ. */
export const CHROME: Record<
  Mode,
  {
    surface: string
    plane: string
    ink: string
    inkSecondary: string
    inkMuted: string
    grid: string
    axis: string
    deltaGood: string
    deltaBad: string
    border: string
    deemphasis: string
  }
> = {
  light: {
    surface: '#fcfcfb',
    plane: '#f9f9f7',
    ink: '#0b0b0b',
    inkSecondary: '#52514e',
    inkMuted: '#898781',
    grid: '#e1e0d9',
    axis: '#c3c2b7',
    deltaGood: '#006300',
    deltaBad: '#d03b3b',
    border: 'rgba(11,11,11,0.10)',
    deemphasis: '#c9c8c1',
  },
  dark: {
    surface: '#1a1a19',
    plane: '#0d0d0d',
    ink: '#ffffff',
    inkSecondary: '#c3c2b7',
    inkMuted: '#898781',
    grid: '#2c2c2a',
    axis: '#383835',
    deltaGood: '#0ca30c',
    deltaBad: '#e66767',
    border: 'rgba(255,255,255,0.10)',
    deemphasis: '#4a4a46',
  },
}

/** Thông số hình học của mark — cố định cho MỌI biểu đồ. */
export const MARK = {
  /** Bar/column dày tối đa 24px — phần thừa của band để làm khoảng thở. */
  barMaxWidth: 24,
  /** Bo 4px ở ĐẦU dữ liệu, vuông ở chân baseline. */
  barRadius: 4,
  /** Đường 2px, bo đầu bo góc. */
  lineWidth: 2,
  /** Điểm ≥ 8px đường kính. */
  symbolSize: 8,
  /** Khe 2px màu nền tách các mark chạm nhau (stack, bar kề nhau). */
  gap: 2,
  /** Vòng 2px màu nền quanh dot để không dính nhau khi chồng lấn. */
  ring: 2,
  /** Area fill = hue của series ở ~10% opacity. */
  areaOpacity: 0.1,
} as const

export const FONT_STACK = 'system-ui, -apple-system, "Segoe UI", sans-serif'

/**
 * Chọn một bậc trên ramp theo giá trị đã chuẩn hoá t ∈ [0, 1].
 * Dùng cho ô bảng tô nền theo giá trị — cùng cơ chế với heatmap, chỉ khác là
 * nền nằm trong ô `<td>` chứ không phải trong canvas biểu đồ.
 */
export function rampColor(steps: string[], t: number): string {
  const clamped = Math.max(0, Math.min(1, t))
  return steps[Math.round(clamped * (steps.length - 1))]
}

/**
 * Trộn một màu về phía màu nền theo tỷ lệ t (0 = giữ nguyên, 1 = thành nền).
 * Dùng để sinh sắc độ cho các cấp con của treemap / sunburst — GIỮ NGUYÊN hue
 * của cấp cha, nên không tiêu thêm slot màu categorical nào.
 */
export function towardSurface(hex: string, mode: Mode, t: number): string {
  const to = CHROME[mode].surface
  const parse = (h: string) => {
    const s = h.replace('#', '')
    return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16))
  }
  const [r1, g1, b1] = parse(hex)
  const [r2, g2, b2] = parse(to)
  const mix = (a: number, b: number) => Math.round(a + (b - a) * t)
  return `#${[mix(r1, r2), mix(g1, g2), mix(b1, b2)]
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('')}`
}

/**
 * Chữ đặt BÊN TRONG một mảng màu (segment cột chồng, ô bản đồ): chọn trắng hay
 * mực theo độ sáng của chính mảng màu đó, để luôn đủ tương phản.
 * Đây là ngoại lệ duy nhất của quy tắc "chữ không mặc màu series".
 */
export function labelInk(bg: string): string {
  const hex = bg.replace('#', '')
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const lin = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  const L = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
  // Chọn bên nào cho tương phản CAO HƠN — không đoán bằng mắt.
  const onWhite = 1.05 / (L + 0.05)
  const onInk = (L + 0.05) / (0.0035 + 0.05)
  return onWhite >= onInk ? '#ffffff' : '#0b0b0b'
}

/* -------------------------------------------------------------------------- */
/* Định dạng số kiểu Việt Nam                                                  */
/* -------------------------------------------------------------------------- */

/** 1_250_000_000 → "1,25 tỷ". Dùng cho nhãn trục và giá trị lớn. */
export function vnCompact(n: number, digits = 1): string {
  const abs = Math.abs(n)
  const sign = n < 0 ? '-' : ''
  if (abs >= 1e12) return `${sign}${trim(abs / 1e12, digits)} nghìn tỷ`
  if (abs >= 1e9) return `${sign}${trim(abs / 1e9, digits)} tỷ`
  if (abs >= 1e6) return `${sign}${trim(abs / 1e6, digits)} tr`
  if (abs >= 1e3) return `${sign}${trim(abs / 1e3, digits)} k`
  return `${sign}${trim(abs, 0)}`
}

/** 1250000 → "1.250.000" (dấu chấm ngăn nghìn, dấu phẩy thập phân). */
export function vnNumber(n: number, digits = 0): string {
  return n.toLocaleString('vi-VN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
}

export function vnPercent(n: number, digits = 1): string {
  return `${trim(n, digits)}%`
}

function trim(n: number, digits: number): string {
  return n
    .toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: digits })
    .replace(/,0+$/, '')
}
