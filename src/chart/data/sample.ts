/**
 * Bộ dữ liệu mẫu dùng CHUNG cho toàn bộ catalog.
 *
 * ⚠️ Dữ liệu ở đây phải luôn TRUNG TÍNH — không gắn với bất kỳ dự án, ngành
 * nghề hay khách hàng cụ thể nào, vì app này dùng làm reference cho nhiều dự
 * án khác nhau. Quy ước dùng chung của app: đơn vị nghiệp vụ là
 * “chi nhánh” (CN-01…), danh mục là Thiết bị / Vật tư / Dịch vụ / Khác.
 *
 * Mọi biểu đồ vẽ trên cùng bộ số này, để so sánh trực tiếp được
 * “cùng một dữ liệu, N cách thể hiện — cách nào đọc ra nhanh nhất”.
 *
 * Số liệu sinh bằng PRNG có seed cố định → luôn giống nhau giữa các lần chạy.
 */

/* PRNG mulberry32 — deterministic, không phụ thuộc Math.random. */
function rng(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const BRANCHES = ['CN-01', 'CN-02', 'CN-03', 'CN-04', 'CN-05'] as const
export type Branch = (typeof BRANCHES)[number]

export const CATEGORIES = ['Thiết bị', 'Vật tư', 'Dịch vụ', 'Khác'] as const
export type Category = (typeof CATEGORIES)[number]

/** Quy mô tương đối của từng chi nhánh. */
const BRANCH_SCALE: Record<Branch, number> = {
  'CN-01': 1.0,
  'CN-02': 0.82,
  'CN-03': 0.61,
  'CN-04': 0.47,
  'CN-05': 0.35,
}

/** Tỷ trọng danh mục — một danh mục áp đảo, phần còn lại chia nhau. */
const CATEGORY_SHARE: Record<Category, number> = {
  'Thiết bị': 0.58,
  'Vật tư': 0.19,
  'Dịch vụ': 0.15,
  Khác: 0.08,
}

export const DAYS = 30
const ANCHOR = new Date('2026-06-22T00:00:00')

export const dates: string[] = Array.from({ length: DAYS }, (_, i) => {
  const d = new Date(ANCHOR)
  d.setDate(d.getDate() - (DAYS - 1 - i))
  return d.toISOString().slice(0, 10)
})

/** "2026-06-22" → "22/06" */
export function shortDate(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}`
}

export function weekdayOf(iso: string): number {
  return new Date(`${iso}T00:00:00`).getDay() // 0 = CN
}

export const WEEKDAY_LABELS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']

/* -------------------------------------------------------------------------- */
/* Bảng fact: doanh thu theo ngày × chi nhánh × danh mục (đồng)                 */
/* -------------------------------------------------------------------------- */

export interface FactRow {
  date: string
  branch: Branch
  category: Category
  revenue: number
  /** Số đơn trong ngày (chỉ gắn ở dòng danh mục đầu để tránh nhân đôi). */
  orders: number
}

const BASE_DAILY = 1_450_000_000 // tổng toàn chuỗi một ngày thường

export const facts: FactRow[] = (() => {
  const r = rng(20260622)
  const rows: FactRow[] = []
  for (const date of dates) {
    const wd = weekdayOf(date)
    // Cuối tuần cao hơn, thứ Ba thấp nhất — để dữ liệu có nhịp, không phẳng lì.
    const weekendLift = wd === 0 || wd === 6 ? 1.28 : wd === 2 ? 0.88 : 1
    for (const branch of BRANCHES) {
      const orders = Math.round(240 * BRANCH_SCALE[branch] * weekendLift * (0.9 + r() * 0.2))
      for (const category of CATEGORIES) {
        const noise = 0.85 + r() * 0.3
        const revenue = Math.round(
          BASE_DAILY * BRANCH_SCALE[branch] * CATEGORY_SHARE[category] * weekendLift * noise,
        )
        rows.push({
          date,
          branch,
          category,
          revenue,
          orders: category === CATEGORIES[0] ? orders : 0,
        })
      }
    }
  }
  return rows
})()

/* -------------------------------------------------------------------------- */
/* Các lát cắt dựng sẵn                                                        */
/* -------------------------------------------------------------------------- */

function sum(rows: FactRow[]): number {
  return rows.reduce((s, x) => s + x.revenue, 0)
}

/** Tổng doanh thu 30 ngày theo chi nhánh — đã sắp xếp giảm dần. */
export const revenueByBranch = BRANCHES.map((branch) => ({
  branch,
  revenue: sum(facts.filter((f) => f.branch === branch)),
})).sort((a, b) => b.revenue - a.revenue)

/** Tổng doanh thu 30 ngày theo danh mục. */
export const revenueByCategory = CATEGORIES.map((category) => ({
  category,
  revenue: sum(facts.filter((f) => f.category === category)),
}))

/** Doanh thu toàn chuỗi theo từng ngày. */
export const dailyTotal = dates.map((date) => ({
  date,
  revenue: sum(facts.filter((f) => f.date === date)),
}))

/** Doanh thu theo ngày, tách theo chi nhánh — ma trận [chi nhánh][ngày]. */
export const dailyByBranch: Record<Branch, number[]> = Object.fromEntries(
  BRANCHES.map((branch) => [
    branch,
    dates.map((date) => sum(facts.filter((f) => f.date === date && f.branch === branch))),
  ]),
) as Record<Branch, number[]>

/** Doanh thu theo ngày, tách theo danh mục — ma trận [danh mục][ngày]. */
export const dailyByCategory: Record<Category, number[]> = Object.fromEntries(
  CATEGORIES.map((category) => [
    category,
    dates.map((date) => sum(facts.filter((f) => f.date === date && f.category === category))),
  ]),
) as Record<Category, number[]>

/** Doanh thu 30 ngày, chi nhánh × danh mục — cho stacked / grouped bar. */
export const branchByCategory: Record<Category, number[]> = Object.fromEntries(
  CATEGORIES.map((category) => [
    category,
    revenueByBranch.map(({ branch }) =>
      sum(facts.filter((f) => f.branch === branch && f.category === category)),
    ),
  ]),
) as Record<Category, number[]>

/** Chỉ tiêu tháng và thực hiện theo chi nhánh — cho bullet / meter. */
export const targetVsActual = revenueByBranch.map(({ branch, revenue }, i) => ({
  branch,
  actual: revenue,
  target: Math.round(revenue * [0.94, 1.06, 1.18, 0.97, 1.31][i]),
}))

/** Tương quan số đơn ↔ doanh thu, mỗi điểm là một ngày của một chi nhánh. */
export const ordersVsRevenue = BRANCHES.map((branch) => ({
  branch,
  points: dates.map((date) => {
    const rows = facts.filter((f) => f.date === date && f.branch === branch)
    const orders = rows.reduce((s, x) => s + x.orders, 0)
    return [orders, sum(rows)] as [number, number]
  }),
}))

/** Cường độ doanh thu theo khung giờ × thứ trong tuần — cho heatmap. */
export const hourBands = ['0-3h', '3-6h', '6-9h', '9-12h', '12-15h', '15-18h', '18-21h', '21-24h']

export const hourlyHeat: { weekday: number; band: number; value: number }[] = (() => {
  const r = rng(77)
  // Hai đỉnh: đầu giờ sáng và cuối giờ chiều, đáy lúc rạng sáng.
  const bandShape = [0.18, 0.22, 1.0, 0.72, 0.86, 0.95, 0.7, 0.34]
  const out: { weekday: number; band: number; value: number }[] = []
  for (let wd = 0; wd < 7; wd++) {
    const weekendLift = wd === 0 || wd === 6 ? 1.3 : 1
    for (let b = 0; b < bandShape.length; b++) {
      out.push({
        weekday: wd,
        band: b,
        value: Math.round(BASE_DAILY * 0.14 * bandShape[b] * weekendLift * (0.9 + r() * 0.2)),
      })
    }
  }
  return out
})()

/* -------------------------------------------------------------------------- */
/* Chỉ số tổng hợp cho KPI tile                                                */
/* -------------------------------------------------------------------------- */

const today = dailyTotal[dailyTotal.length - 1]
const yesterday = dailyTotal[dailyTotal.length - 2]
const last7 = dailyTotal.slice(-7)
const prev7 = dailyTotal.slice(-14, -7)
const ordersToday = facts.filter((f) => f.date === today.date).reduce((s, x) => s + x.orders, 0)

export const kpis = {
  todayRevenue: today.revenue,
  todayDelta: (today.revenue / yesterday.revenue - 1) * 100,
  week: last7.reduce((s, x) => s + x.revenue, 0),
  weekDelta:
    (last7.reduce((s, x) => s + x.revenue, 0) / prev7.reduce((s, x) => s + x.revenue, 0) - 1) * 100,
  ordersToday,
  avgOrderValue: today.revenue / ordersToday,
  /** 12 điểm gần nhất — dùng làm sparkline trong stat tile. */
  spark: dailyTotal.slice(-12).map((d) => d.revenue),
}

/** Dòng cho bảng có sparkline: mỗi chi nhánh một dòng. */
export const tableRows = revenueByBranch.map(({ branch, revenue }) => {
  const series = dailyByBranch[branch]
  const last7Sum = series.slice(-7).reduce((s, x) => s + x, 0)
  const prev7Sum = series.slice(-14, -7).reduce((s, x) => s + x, 0)
  const t = targetVsActual.find((x) => x.branch === branch)!
  return {
    branch,
    revenue,
    delta: (last7Sum / prev7Sum - 1) * 100,
    completion: (t.actual / t.target) * 100,
    spark: series.slice(-14),
  }
})

/* ==========================================================================
   Các lát cắt cho dot plot, dumbbell, phân bố, luồng, thứ bậc
   ========================================================================== */

/** 14 mặt hàng — đủ nhiều để bar chart bắt đầu chật, hợp dot plot. */
export const PRODUCTS = [
  'Máy tính để bàn',
  'Màn hình 24"',
  'Máy in laser',
  'Máy chiếu',
  'Giấy A4',
  'Mực in',
  'Cáp mạng',
  'Đèn LED',
  'Bàn làm việc',
  'Ghế văn phòng',
  'Bảo trì định kỳ',
  'Vệ sinh công nghiệp',
  'Phần mềm bản quyền',
  'Vận chuyển',
] as const

/** Doanh thu mặt hàng: kỳ này và kỳ trước (cho dot plot & dumbbell). */
export const productRevenue = (() => {
  const r = rng(4242)
  // Vài mặt hàng áp đảo, phần còn lại là một cái đuôi dài.
  const weights = [
    0.22, 0.16, 0.14, 0.09, 0.07, 0.06, 0.05, 0.04, 0.045, 0.035, 0.03, 0.02, 0.015, 0.01,
  ]
  const total = revenueByBranch.reduce((s, x) => s + x.revenue, 0)
  return PRODUCTS.map((name, i) => {
    const current = Math.round(total * weights[i] * (0.92 + r() * 0.16))
    return {
      name,
      current,
      previous: Math.round(current / (0.82 + r() * 0.4)),
    }
  }).sort((a, b) => b.current - a.current)
})()

/** Doanh thu tuần đầu vs tuần cuối theo chi nhánh (dumbbell). */
export const weekFirstVsLast = BRANCHES.map((branch) => {
  const series = dailyByBranch[branch]
  return {
    branch,
    first: series.slice(0, 7).reduce((s, x) => s + x, 0),
    last: series.slice(-7).reduce((s, x) => s + x, 0),
  }
}).sort((a, b) => b.last / b.first - a.last / a.first)

/** Toàn bộ 150 quan sát chi-nhánh-ngày, dùng cho histogram. */
export const allBranchDays: number[] = BRANCHES.flatMap((b) => dailyByBranch[b])

/** Năm số tóm tắt phân bố + các điểm ngoại lệ (quy tắc 1,5 × IQR). */
export function fiveNumber(values: number[]) {
  const v = [...values].sort((a, b) => a - b)
  const q = (p: number) => {
    const idx = (v.length - 1) * p
    const lo = Math.floor(idx)
    const hi = Math.ceil(idx)
    return v[lo] + (v[hi] - v[lo]) * (idx - lo)
  }
  const q1 = q(0.25)
  const med = q(0.5)
  const q3 = q(0.75)
  const iqr = q3 - q1
  const loFence = q1 - 1.5 * iqr
  const hiFence = q3 + 1.5 * iqr
  const inliers = v.filter((x) => x >= loFence && x <= hiFence)
  return {
    box: [inliers[0], q1, med, q3, inliers[inliers.length - 1]] as number[],
    outliers: v.filter((x) => x < loFence || x > hiFence),
  }
}

/** Chia mảng giá trị thành các khoảng đều nhau (histogram). */
export function histogram(values: number[], binCount = 12) {
  const min = Math.min(...values)
  const max = Math.max(...values)
  const width = (max - min) / binCount
  const bins = Array.from({ length: binCount }, (_, i) => ({
    from: min + i * width,
    to: min + (i + 1) * width,
    count: 0,
  }))
  for (const v of values) {
    const i = Math.min(binCount - 1, Math.floor((v - min) / width))
    bins[i].count++
  }
  return bins
}

/** Phân rã doanh thu → lợi nhuận (waterfall). */
export const profitBridge = (() => {
  const revenue = revenueByBranch.reduce((s, x) => s + x.revenue, 0)
  return [
    { label: 'Doanh thu', delta: revenue, kind: 'total' as const },
    { label: 'Giá vốn hàng bán', delta: -Math.round(revenue * 0.63), kind: 'step' as const },
    { label: 'Chi phí bán hàng', delta: -Math.round(revenue * 0.11), kind: 'step' as const },
    { label: 'Nhân công', delta: -Math.round(revenue * 0.07), kind: 'step' as const },
    { label: 'Vận hành', delta: -Math.round(revenue * 0.04), kind: 'step' as const },
    { label: 'Thuê mặt bằng', delta: -Math.round(revenue * 0.03), kind: 'step' as const },
    { label: 'Thu nhập khác', delta: Math.round(revenue * 0.015), kind: 'step' as const },
    { label: 'Lợi nhuận trước thuế', delta: 0, kind: 'total' as const },
  ]
})()

/** Luồng chi nhánh → danh mục (sankey). */
export const sankeyFlows = revenueByBranch.flatMap(({ branch }) =>
  CATEGORIES.map((category) => ({
    source: branch as string,
    target: category as string,
    value: facts
      .filter((f) => f.branch === branch && f.category === category)
      .reduce((s, x) => s + x.revenue, 0),
  })),
)

/** Phễu chuyển đổi từ lượt truy cập đến đơn hàng có giá trị (funnel). */
export const funnelSteps = (() => {
  const visits = facts.reduce((s, x) => s + x.orders, 0) * 12
  const rates = [1, 0.71, 0.44, 0.26, 0.09]
  const labels = ['Lượt truy cập', 'Xem sản phẩm', 'Thêm vào giỏ', 'Tạo đơn', 'Đơn > 5 triệu']
  return labels.map((label, i) => ({ label, value: Math.round(visits * rates[i]) }))
})()

/** Cây danh mục → chi nhánh (treemap, sunburst). */
export const categoryTree = CATEGORIES.map((category) => ({
  name: category as string,
  children: revenueByBranch.map(({ branch }) => ({
    name: branch as string,
    value: facts
      .filter((f) => f.branch === branch && f.category === category)
      .reduce((s, x) => s + x.revenue, 0),
  })),
}))

/** Toạ độ của 5 chi nhánh (bubble map, không cần GeoJSON). */
export const branchGeo: Record<Branch, { lon: number; lat: number }> = {
  'CN-01': { lon: 105.85, lat: 21.02 },
  'CN-02': { lon: 106.68, lat: 20.86 },
  'CN-03': { lon: 108.22, lat: 16.05 },
  'CN-04': { lon: 106.7, lat: 10.78 },
  'CN-05': { lon: 105.78, lat: 10.03 },
}

/* ==========================================================================
   Các lát cắt cho nhóm bảng phân tích
   ========================================================================== */

export const REGIONS = ['Miền Bắc', 'Miền Trung', 'Miền Nam'] as const
export type Region = (typeof REGIONS)[number]

const BRANCH_REGION: Record<Branch, Region> = {
  'CN-01': 'Miền Bắc',
  'CN-02': 'Miền Bắc',
  'CN-03': 'Miền Trung',
  'CN-04': 'Miền Nam',
  'CN-05': 'Miền Nam',
}

export function regionOf(branch: Branch): Region {
  return BRANCH_REGION[branch]
}

/**
 * Ma trận cho bảng chéo: hàng = chi nhánh, cột = danh mục, ô = doanh thu.
 * Kèm sẵn tổng hàng và tổng cột để không phải tính lại ở tầng hiển thị.
 */
export const pivot = (() => {
  const rows = revenueByBranch.map(({ branch }) => {
    const cells = CATEGORIES.map((category) =>
      facts
        .filter((f) => f.branch === branch && f.category === category)
        .reduce((s, x) => s + x.revenue, 0),
    )
    return { branch, region: regionOf(branch), cells, total: cells.reduce((s, x) => s + x, 0) }
  })
  const colTotals = CATEGORIES.map((_, i) => rows.reduce((s, r) => s + r.cells[i], 0))
  return {
    rows,
    colTotals,
    grandTotal: colTotals.reduce((s, x) => s + x, 0),
  }
})()

/** Cây vùng → chi nhánh, mỗi cấp có tổng phụ (cho bảng phân cấp). */
export const regionRollup = REGIONS.map((region) => {
  const children = pivot.rows.filter((r) => r.region === region)
  return {
    region,
    children,
    cells: CATEGORIES.map((_, i) => children.reduce((s, c) => s + c.cells[i], 0)),
    total: children.reduce((s, c) => s + c.total, 0),
  }
})

/** Thực hiện / kế hoạch / cùng kỳ theo chi nhánh (bảng chênh lệch). */
export const varianceRows = (() => {
  const r = rng(915)
  return revenueByBranch.map(({ branch, revenue }) => {
    const t = targetVsActual.find((x) => x.branch === branch)!
    return {
      branch,
      actual: revenue,
      plan: t.target,
      priorPeriod: Math.round(revenue / (0.86 + r() * 0.34)),
    }
  })
})()

/**
 * Xếp hạng mặt hàng kỳ này so với kỳ trước.
 *
 * Cố tình xếp hạng MẶT HÀNG chứ không phải chi nhánh: quy mô các chi nhánh
 * chênh nhau đều đặn nên thứ hạng không bao giờ đảo, mà cột “thay đổi hạng”
 * mới là phần có giá trị của dạng bảng này.
 */
export const rankRows = (() => {
  const rankBy = (key: 'current' | 'previous') =>
    [...productRevenue]
      .sort((a, b) => b[key] - a[key])
      .reduce<Record<string, number>>((acc, p, i) => {
        acc[p.name] = i + 1
        return acc
      }, {})

  const now = rankBy('current')
  const before = rankBy('previous')
  return [...productRevenue]
    .map((p) => ({
      name: p.name,
      value: p.current,
      rank: now[p.name],
      /** Dương = leo hạng, âm = tụt hạng. */
      rankChange: before[p.name] - now[p.name],
    }))
    .sort((a, b) => a.rank - b.rank)
})()

/* ==========================================================================
   Lát cắt cho nhóm so sánh hai bên & nền tảng dashboard
   ========================================================================== */

/** Hai đối tượng đem ra đối chiếu trong bố cục 2 cột. */
export const VERSUS: [Branch, Branch] = ['CN-01', 'CN-03']

/** Cơ cấu danh mục của hai bên — cho tornado (hai nhánh quanh trục giữa). */
export const versusByCategory = CATEGORIES.map((category, i) => ({
  category,
  left: pivot.rows.find((r) => r.branch === VERSUS[0])!.cells[i],
  right: pivot.rows.find((r) => r.branch === VERSUS[1])!.cells[i],
}))

/** Một chỉ số kèm nhiều mốc tham chiếu — cho scorecard nhiều mốc. */
export const benchmark = (() => {
  const row = varianceRows[0]
  const groupAvg = Math.round(
    varianceRows.reduce((s, x) => s + x.actual, 0) / varianceRows.length,
  )
  return {
    branch: row.branch,
    actual: row.actual,
    plan: row.plan,
    priorPeriod: row.priorPeriod,
    groupAvg,
  }
})()

/** Mốc sự kiện để chú thích lên biểu đồ đường. */
export const events = [
  { date: dates[8], label: 'Đổi bảng giá' },
  { date: dates[21], label: 'Chiến dịch bán hàng' },
]

/** Ngưỡng mục tiêu doanh thu ngày — vẽ thành dải nền, không phải một đường trơ. */
export const targetBand = {
  min: 4_600_000_000,
  max: 5_400_000_000,
  label: 'Vùng mục tiêu ngày',
}

/**
 * Dự báo 7 ngày tiếp theo kèm khoảng tin cậy.
 * Khoảng loe rộng dần theo thời gian — càng xa càng ít chắc chắn.
 */
export const forecast = (() => {
  const r = rng(31337)
  const history = dailyTotal.map((d) => d.revenue)
  const last = history[history.length - 1]
  const avg = history.slice(-7).reduce((s, x) => s + x, 0) / 7
  const steps = 7
  const points = Array.from({ length: steps }, (_, i) => {
    const drift = (avg - last) * ((i + 1) / steps)
    const value = Math.round(last + drift + (r() - 0.5) * avg * 0.05)
    // Biên độ nới rộng theo căn bậc hai của số bước — quy ước phổ biến.
    const spread = Math.round(avg * 0.06 * Math.sqrt(i + 1))
    return { value, lower: value - spread, upper: value + spread }
  })
  const futureDates = Array.from({ length: steps }, (_, i) => {
    const d = new Date(ANCHOR)
    d.setDate(d.getDate() + i + 1)
    return d.toISOString().slice(0, 10)
  })
  return { dates: futureDates, points }
})()

/* ==========================================================================
   Lát cắt cho nhóm "Mẫu ghép phức tạp"
   ========================================================================== */

/** Kỳ 6 ngày — 30 ngày chia thành 5 kỳ đều nhau. */
export const PERIOD_LEN = 6
export const PERIOD_COUNT = Math.floor(DAYS / PERIOD_LEN)

export const periodLabels: string[] = Array.from(
  { length: PERIOD_COUNT },
  (_, p) => `${shortDate(dates[p * PERIOD_LEN])}–${shortDate(dates[p * PERIOD_LEN + PERIOD_LEN - 1])}`,
)

export const periodOfDate: Record<string, number> = Object.fromEntries(
  dates.map((d, i) => [d, Math.min(PERIOD_COUNT - 1, Math.floor(i / PERIOD_LEN))]),
)

export const revenueByPeriod: number[] = Array.from({ length: PERIOD_COUNT }, (_, p) =>
  sum(facts.filter((f) => periodOfDate[f.date] === p)),
)

/**
 * Báo cáo kết quả kinh doanh rút gọn theo 5 kỳ.
 *
 * `kind` quyết định cách trình bày dòng, KHÔNG phải màu:
 * - 'total'    → dòng tổng, in đậm, có nét kẻ phía trên
 * - 'step'     → dòng thành phần bình thường
 * - 'contra'   → dòng trừ đi (giá vốn, chi phí) — hiện dấu ngoặc đơn
 */
export interface PlRow {
  label: string
  kind: 'total' | 'step' | 'contra'
  values: number[]
  /** Hiện thêm dòng phụ "% doanh thu" bên dưới. */
  showPercent?: boolean
}

export const plByPeriod: PlRow[] = (() => {
  const r = rng(50607)
  /** Tỷ lệ có dao động nhẹ giữa các kỳ — nếu phẳng lì thì sparkline vô nghĩa. */
  const wobble = (base: number) => revenueByPeriod.map((v) => Math.round(v * base * (0.94 + r() * 0.12)))

  const revenue = revenueByPeriod.slice()
  const cogs = wobble(0.63)
  const gross = revenue.map((v, i) => v - cogs[i])
  const selling = wobble(0.11)
  const admin = wobble(0.07)
  const opex = selling.map((v, i) => v + admin[i])
  const operating = gross.map((v, i) => v - opex[i])
  const other = wobble(0.015)
  const preTax = operating.map((v, i) => v + other[i])

  return [
    { label: 'Doanh thu thuần', kind: 'total', values: revenue },
    { label: 'Giá vốn hàng bán', kind: 'contra', values: cogs, showPercent: true },
    { label: 'Lợi nhuận gộp', kind: 'total', values: gross, showPercent: true },
    { label: 'Chi phí bán hàng', kind: 'contra', values: selling, showPercent: true },
    { label: 'Chi phí quản lý', kind: 'contra', values: admin, showPercent: true },
    { label: 'Tổng chi phí hoạt động', kind: 'step', values: opex, showPercent: true },
    { label: 'Lợi nhuận hoạt động', kind: 'total', values: operating, showPercent: true },
    { label: 'Thu nhập khác', kind: 'step', values: other },
    { label: 'Lợi nhuận trước thuế', kind: 'total', values: preTax, showPercent: true },
  ]
})()

/** Kênh tiếp cận — trung tính, không gắn với nền tảng quảng cáo cụ thể nào. */
export const CHANNELS = [
  'Tìm kiếm',
  'Mạng hiển thị',
  'Mạng xã hội',
  'Email',
  'Đối tác',
  'Truy cập trực tiếp',
] as const
export type Channel = (typeof CHANNELS)[number]

export interface FunnelChannelRow {
  channel: Channel
  impressions: number
  clicks: number
  ctr: number
  orders: number
  convRate: number
  cost: number
  costPerOrder: number
}

/**
 * Phễu 4 nhóm chỉ số: hiển thị → tiếp cận → chuyển đổi → chi phí.
 * Mỗi nhóm có một chuỗi theo ngày (để vẽ dải) và các con số tổng hợp.
 */
export const adFunnel = (() => {
  const r = rng(8899)
  const ordersDaily = dates.map((d) =>
    facts.filter((f) => f.date === d).reduce((s, x) => s + x.orders, 0),
  )
  const clicks = ordersDaily.map((o) => Math.round(o * (19 + r() * 6)))
  const impressions = clicks.map((c) => Math.round(c * (58 + r() * 24)))
  const cost = ordersDaily.map((o) => Math.round(o * (95_000 + r() * 45_000)))

  const total = (xs: number[]) => xs.reduce((s, x) => s + x, 0)
  const totals = {
    impressions: total(impressions),
    clicks: total(clicks),
    orders: total(ordersDaily),
    cost: total(cost),
  }

  const weights = [0.31, 0.23, 0.18, 0.12, 0.1, 0.06]
  const channels: FunnelChannelRow[] = CHANNELS.map((channel, i) => {
    const imp = Math.round(totals.impressions * weights[i] * (0.9 + r() * 0.2))
    const clk = Math.round(imp * (0.008 + r() * 0.03))
    const ord = Math.round(clk * (0.02 + r() * 0.06))
    const cst = Math.round(totals.cost * weights[i] * (0.85 + r() * 0.3))
    return {
      channel,
      impressions: imp,
      clicks: clk,
      ctr: (clk / imp) * 100,
      orders: ord,
      convRate: (ord / clk) * 100,
      cost: cst,
      costPerOrder: ord ? cst / ord : 0,
    }
  }).sort((a, b) => b.orders - a.orders)

  return {
    daily: { impressions, clicks, orders: ordersDaily, cost },
    totals,
    ctr: (totals.clicks / totals.impressions) * 100,
    convRate: (totals.orders / totals.clicks) * 100,
    costPerOrder: totals.cost / totals.orders,
    /** Tỷ lệ hiển thị ở vị trí đầu — chỉ số phụ của nhóm "hiển thị". */
    topShare: 68.2,
    channels,
  }
})()

/** Doanh thu theo vùng × danh mục, kèm chuỗi ngày — cho bố cục panel lặp. */
export const regionPanels = REGIONS.map((region) => {
  const rows = facts.filter((f) => regionOf(f.branch) === region)
  const branches = BRANCHES.filter((b) => regionOf(b) === region)
  return {
    region,
    revenue: sum(rows),
    orders: rows.reduce((s, x) => s + x.orders, 0),
    byCategory: CATEGORIES.map((category) => ({
      category,
      revenue: sum(rows.filter((f) => f.category === category)),
    })),
    daily: dates.map((d) => sum(rows.filter((f) => f.date === d))),
    branches: branches
      .map((branch) => ({ branch, revenue: sum(rows.filter((f) => f.branch === branch)) }))
      .sort((a, b) => b.revenue - a.revenue),
  }
})
