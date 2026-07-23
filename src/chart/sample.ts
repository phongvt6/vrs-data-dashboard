// Dữ liệu mẫu cho từng loại chart.
//
// Giai đoạn 2 mọi chart đều vẽ bằng số ở đây, để chọn được loại chart và bố cục
// trước khi có tầng query. Giai đoạn 3 chỉ việc thay hàm này bằng kết quả query
// — mọi bộ render đã ăn chung ChartRow[] nên không phải sửa gì thêm.

import {
  WEEKDAY_LABELS,
  branchByCategory,
  dailyByBranch,
  dailyTotal,
  dates,
  funnelSteps,
  hourBands,
  hourlyHeat,
  kpis,
  ordersVsRevenue,
  profitBridge,
  revenueByBranch,
  revenueByCategory,
  shortDate,
  targetVsActual,
  CATEGORIES,
} from "./data/sample";
import type { ChartRow } from "./types";

const axisDates = dates.map(shortDate);

/** Ma trận [thành phần][nhóm] → ChartRow[] dạng dài. */
function fromMatrix(groups: string[], byS: Record<string, number[]>): ChartRow[] {
  return Object.entries(byS).flatMap(([series, vals]) =>
    groups.map((label, i) => ({ label, series, value: vals[i] ?? 0 }))
  );
}

export function sampleRows(loai: string): ChartRow[] {
  switch (loai) {
    case "stat-tile":
      return [
        {
          label: "Doanh thu hôm nay",
          value: kpis.todayRevenue,
          // Suy ngược ra số kỳ trước từ % chênh, để ô chỉ số tự tính lại delta.
          value2: kpis.todayRevenue / (1 + kpis.todayDelta / 100),
        },
      ];

    case "meter":
      return [{ label: targetVsActual[0].branch, value: targetVsActual[0].actual, value2: targetVsActual[0].target }];

    case "line":
      return revenueByBranch.slice(0, 3).flatMap(({ branch }) =>
        axisDates.map((label, i) => ({ label, series: branch, value: dailyByBranch[branch][i] }))
      );

    case "area":
      return dailyTotal.map((d) => ({ label: shortDate(d.date), value: d.revenue }));

    case "column":
      return revenueByCategory.map((r) => ({ label: r.category, value: r.revenue }));

    case "bar":
      return revenueByBranch.map((r) => ({ label: r.branch, value: r.revenue }));

    case "grouped-bar":
      return targetVsActual.flatMap((r) => [
        { label: r.branch, series: "Thực hiện", value: r.actual },
        { label: r.branch, series: "Chỉ tiêu", value: r.target },
      ]);

    case "stacked-bar":
    case "stacked-100":
      return fromMatrix(
        revenueByBranch.map((r) => r.branch),
        Object.fromEntries(CATEGORIES.map((c) => [c, branchByCategory[c]]))
      );

    case "donut":
      return revenueByCategory.map((r) => ({ label: r.category, value: r.revenue }));

    case "waterfall":
      // Giữ dòng mở đầu (doanh thu) làm khoản cộng đầu tiên, bỏ dòng tổng cuối
      // vì bộ render tự cộng dồn ra nó. Thiếu mốc mở đầu thì lũy kế âm — vô nghĩa.
      return profitBridge.slice(0, -1).map((r) => ({ label: r.label, value: r.delta }));

    case "funnel":
      return funnelSteps.map((s) => ({ label: s.label, value: s.value }));

    case "heatmap":
      return hourlyHeat.map((h) => ({
        label: hourBands[h.band],
        series: WEEKDAY_LABELS[h.weekday],
        value: h.value,
      }));

    case "scatter":
      return ordersVsRevenue
        .slice(0, 3)
        .flatMap(({ branch, points }) =>
          points.map(([orders, revenue]) => ({ label: branch, series: branch, value: orders, value2: revenue }))
        );

    default:
      return [];
  }
}

/** Chart nào cũng có mẫu — dùng để cảnh báo khi thêm loại mới mà quên. */
export const hasSample = (loai: string) => sampleRows(loai).length > 0;
