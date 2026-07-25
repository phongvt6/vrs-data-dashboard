import type { EChartsOption } from 'echarts'
import { CHROME, FONT, FONT_STACK, MARK, type Mode } from './theme'

/**
 * Khung mặc định dùng chung cho mọi biểu đồ ECharts trong catalog.
 *
 * Nguyên tắc đã nướng sẵn vào đây:
 * - Lưới/trục lùi về sau (hairline 1px, liền nét, màu chỉ hơn nền một bậc).
 * - Chỉ có splitLine NGANG. Lưới dọc là nhiễu.
 * - Chữ luôn mặc màu mực (primary/secondary/muted), KHÔNG bao giờ mặc màu series.
 * - Legend hình tròn, đặt trên đầu, canh trái.
 */
export function base(mode: Mode, opts: { legend?: boolean; grid?: Partial<GridOpt> } = {}) {
  const c = CHROME[mode]
  return {
    backgroundColor: 'transparent',
    textStyle: { fontFamily: FONT_STACK, color: c.inkSecondary },
    animationDuration: 420,
    grid: {
      left: 8,
      right: 16,
      top: opts.legend ? 44 : 16,
      bottom: 8,
      containLabel: true,
      ...opts.grid,
    },
    legend: opts.legend
      ? {
          show: true,
          top: 0,
          left: 0,
          icon: 'circle',
          itemWidth: 9,
          itemHeight: 9,
          itemGap: 18,
          textStyle: { color: c.inkSecondary, fontSize: FONT.legend, fontFamily: FONT_STACK },
        }
      : { show: false },
    tooltip: tooltip(mode),
  } satisfies EChartsOption
}

type GridOpt = { left: number; right: number; top: number; bottom: number }

export function tooltip(mode: Mode, trigger: 'item' | 'axis' = 'axis') {
  const c = CHROME[mode]
  return {
    trigger,
    backgroundColor: c.surface,
    borderColor: c.axis,
    borderWidth: 1,
    padding: [8, 12] as [number, number],
    textStyle: { color: c.ink, fontSize: FONT.tooltip, fontFamily: FONT_STACK },
    extraCssText: 'border-radius:8px; box-shadow:0 6px 20px rgba(0,0,0,.12);',
    axisPointer: {
      type: trigger === 'axis' ? ('line' as const) : ('none' as const),
      lineStyle: { color: c.axis, width: 1 },
      crossStyle: { color: c.axis },
      label: { backgroundColor: c.inkSecondary, fontFamily: FONT_STACK },
    },
  }
}

/** Trục danh mục (tên chi nhánh, tên tháng…): có baseline, không có lưới. */
export function catAxis(mode: Mode, data: string[], extra: Record<string, unknown> = {}) {
  const c = CHROME[mode]
  return {
    type: 'category' as const,
    data,
    axisLine: { lineStyle: { color: c.axis } },
    axisTick: { show: false },
    axisLabel: { color: c.inkMuted, fontSize: FONT.axis, fontFamily: FONT_STACK, hideOverlap: true },
    ...extra,
  }
}

/** Trục giá trị: không baseline, chỉ splitLine hairline. */
export function valAxis(
  mode: Mode,
  format?: (v: number) => string,
  extra: Record<string, unknown> = {},
) {
  const c = CHROME[mode]
  return {
    type: 'value' as const,
    axisLine: { show: false },
    axisTick: { show: false },
    splitLine: { lineStyle: { color: c.grid, width: 1, type: 'solid' as const } },
    axisLabel: {
      color: c.inkMuted,
      fontSize: FONT.axis,
      fontFamily: FONT_STACK,
      // Ô chart hẹp thì nhãn trục giá trị chen nhau — giấu bớt thay vì đè lên nhau.
      hideOverlap: true,
      ...(format ? { formatter: (v: number) => format(v) } : {}),
    },
    ...extra,
  }
}

/**
 * Bọc một hàm format số thành label formatter của ECharts.
 * (Kiểu tham số để `unknown` để tương thích với CallbackDataParams.)
 */
export function valueLabel(fn: (v: number) => string) {
  return (p: { value: unknown }) => fn(Number(p.value))
}

/** Cột dọc: bo 4px ở đỉnh, vuông ở chân. */
export function columnItem(color: string) {
  return { color, borderRadius: [MARK.barRadius, MARK.barRadius, 0, 0] as number[] }
}

/** Thanh ngang: bo 4px ở đầu phải, vuông ở gốc trục. */
export function barItem(color: string) {
  return { color, borderRadius: [0, MARK.barRadius, MARK.barRadius, 0] as number[] }
}

/**
 * Segment trong stacked bar: khe 2px màu nền tách các segment.
 * (Khe được vẽ bằng border màu surface — chính là "surface gap", không phải
 * viền trang trí.)
 */
export function stackItem(color: string, mode: Mode) {
  return {
    color,
    borderColor: CHROME[mode].surface,
    borderWidth: MARK.gap,
  }
}

/** Cấu hình chuẩn cho một series đường. */
export function lineSeries(color: string, mode: Mode, extra: Record<string, unknown> = {}) {
  return {
    type: 'line' as const,
    smooth: false,
    showSymbol: false,
    symbol: 'circle',
    symbolSize: MARK.symbolSize,
    lineStyle: { width: MARK.lineWidth, color, cap: 'round' as const, join: 'round' as const },
    itemStyle: { color, borderColor: CHROME[mode].surface, borderWidth: MARK.ring },
    emphasis: { focus: 'series' as const },
    ...extra,
  }
}

/** Nền area = hue của series ở 10% opacity, không bao giờ là khối đặc. */
export function areaFill(color: string) {
  return { color, opacity: MARK.areaOpacity }
}
