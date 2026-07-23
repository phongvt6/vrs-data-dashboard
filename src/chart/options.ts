// Dựng option ECharts cho từng loại chart từ ChartRow[].
//
// Đây là phần KHÔNG bê được từ `ui-chart-catalog`: bên đó mỗi demo tự viết
// option với số liệu cứng. Ở đây option phải sinh ra từ dữ liệu, nhưng vẫn gọi
// đúng các primitive đã port (base/catAxis/valAxis/columnItem…) nên hình thức
// ra giống hệt bản gốc.

import type { EChartsOption } from "echarts";
import {
  areaFill,
  barItem,
  base,
  catAxis,
  columnItem,
  lineSeries,
  stackItem,
  tooltip,
  valAxis,
} from "./lib/echarts";
import {
  CHROME,
  FONT_STACK,
  MARK,
  SEQUENTIAL,
  SERIES,
  type Mode,
  vnCompact,
  vnNumber,
  vnPercent,
} from "./lib/theme";
import type { ChartConfig, ChartRow } from "./types";

/** Hàm định dạng số theo cấu hình của chart. */
export function formatter(cfg: ChartConfig): (v: number) => string {
  switch (cfg.dinh_dang) {
    case "tien":
      return (v) => `${vnCompact(v)} ₫`;
    case "phan_tram":
      return (v) => vnPercent(v);
    default:
      return (v) => vnCompact(v);
  }
}

/** Nhãn trục danh mục, giữ nguyên thứ tự xuất hiện trong dữ liệu. */
const labelsOf = (rows: ChartRow[]) => [...new Set(rows.map((r) => r.label))];
const seriesOf = (rows: ChartRow[]) => [...new Set(rows.map((r) => r.series ?? ""))];

/** Ma trận [series][label] — ô thiếu điền 0. */
function matrix(rows: ChartRow[], labels: string[], series: string[]): number[][] {
  const idx = new Map(labels.map((l, i) => [l, i]));
  return series.map((s) => {
    const out = new Array(labels.length).fill(0);
    for (const r of rows) {
      if ((r.series ?? "") !== s) continue;
      const i = idx.get(r.label);
      if (i !== undefined) out[i] += r.value;
    }
    return out;
  });
}

export function buildOption(
  loai: string,
  rows: ChartRow[],
  cfg: ChartConfig,
  mode: Mode = "light"
): EChartsOption | null {
  if (!rows.length) return null;
  const c = CHROME[mode];
  const fmt = formatter(cfg);
  const labels = labelsOf(rows);
  const names = seriesOf(rows);
  const nhieuSeries = names.length > 1 || names[0] !== "";

  const tip = { ...tooltip(mode), valueFormatter: (v: unknown) => fmt(Number(v)) };

  switch (loai) {
    case "line": {
      const m = matrix(rows, labels, names);
      return {
        ...base(mode, { legend: nhieuSeries }),
        tooltip: tip,
        xAxis: catAxis(mode, labels, {
          boundaryGap: false,
          axisLabel: {
            // Trục thời gian dài thì thưa nhãn ra cho khỏi chồng chữ.
            interval: Math.max(0, Math.ceil(labels.length / 8) - 1),
            color: c.inkMuted,
            fontSize: 11,
            fontFamily: FONT_STACK,
          },
        }),
        yAxis: valAxis(mode, fmt),
        series: names.map((s, i) => ({
          name: s || undefined,
          ...lineSeries(SERIES[mode][i % 8], mode),
          data: m[i],
        })),
      };
    }

    case "area": {
      const color = SERIES[mode][0];
      const m = matrix(rows, labels, names);
      return {
        ...base(mode),
        tooltip: tip,
        xAxis: catAxis(mode, labels, {
          boundaryGap: false,
          axisLabel: {
            interval: Math.max(0, Math.ceil(labels.length / 8) - 1),
            color: c.inkMuted,
            fontSize: 11,
            fontFamily: FONT_STACK,
          },
        }),
        yAxis: valAxis(mode, fmt),
        series: [{ ...lineSeries(color, mode), data: m[0], areaStyle: areaFill(color) }],
      };
    }

    case "column": {
      const m = matrix(rows, labels, names);
      return {
        ...base(mode),
        tooltip: tip,
        xAxis: catAxis(mode, labels),
        yAxis: valAxis(mode, fmt),
        series: [
          {
            type: "bar",
            data: m[0],
            barMaxWidth: MARK.barMaxWidth,
            itemStyle: columnItem(SERIES[mode][0]),
          },
        ],
      };
    }

    case "bar": {
      const m = matrix(rows, labels, names);
      // Thanh ngang đọc từ trên xuống, nên đảo thứ tự để hạng mục đầu nằm trên.
      const rev = [...labels].reverse();
      return {
        ...base(mode),
        tooltip: tip,
        xAxis: valAxis(mode, fmt),
        yAxis: catAxis(mode, rev, { splitLine: { show: false } }),
        series: [
          {
            type: "bar",
            data: [...m[0]].reverse(),
            barMaxWidth: MARK.barMaxWidth,
            itemStyle: barItem(SERIES[mode][0]),
          },
        ],
      };
    }

    case "grouped-bar": {
      const m = matrix(rows, labels, names);
      return {
        ...base(mode, { legend: true }),
        tooltip: tip,
        xAxis: catAxis(mode, labels),
        yAxis: valAxis(mode, fmt),
        series: names.map((s, i) => ({
          name: s || undefined,
          type: "bar" as const,
          data: m[i],
          barMaxWidth: MARK.barMaxWidth,
          barGap: "10%",
          itemStyle: columnItem(SERIES[mode][i % 8]),
        })),
      };
    }

    case "stacked-bar":
    case "stacked-100": {
      const m = matrix(rows, labels, names);
      const chuanHoa = loai === "stacked-100";
      const tong = labels.map((_, j) => names.reduce((s, __, i) => s + m[i][j], 0));
      const data = m.map((row) =>
        row.map((v, j) => (chuanHoa ? (tong[j] ? (v / tong[j]) * 100 : 0) : v))
      );
      const f = chuanHoa ? (v: number) => vnPercent(v) : fmt;
      return {
        ...base(mode, { legend: true }),
        tooltip: { ...tooltip(mode), valueFormatter: (v: unknown) => f(Number(v)) },
        xAxis: catAxis(mode, labels),
        yAxis: valAxis(mode, f, chuanHoa ? { max: 100 } : {}),
        series: names.map((s, i) => ({
          name: s || undefined,
          type: "bar" as const,
          stack: "total",
          data: data[i],
          barMaxWidth: MARK.barMaxWidth,
          itemStyle: stackItem(SERIES[mode][i % 8], mode),
        })),
      };
    }

    case "donut": {
      const m = matrix(rows, labels, names);
      const tong = m[0].reduce((s, v) => s + v, 0);
      return {
        ...base(mode, { legend: true }),
        tooltip: { ...tooltip(mode), trigger: "item", valueFormatter: (v: unknown) => fmt(Number(v)) },
        series: [
          {
            type: "pie",
            radius: ["58%", "82%"],
            center: ["50%", "58%"],
            avoidLabelOverlap: true,
            label: { show: false },
            // Lỗ giữa donut là chỗ đặt con số tổng — tận dụng nó.
            emphasis: { label: { show: false } },
            itemStyle: { borderColor: c.surface, borderWidth: MARK.gap },
            data: labels.map((l, i) => ({
              name: l,
              value: m[0][i],
              itemStyle: { color: SERIES[mode][i % 8] },
            })),
          },
        ],
        graphic: {
          type: "text",
          left: "center",
          top: "middle",
          style: {
            text: fmt(tong),
            fill: c.ink,
            // 15px để số lớn (vd "1,3 nghìn tỷ ₫") vẫn nằm gọn trong lỗ donut.
            fontSize: 15,
            fontWeight: 700,
            fontFamily: FONT_STACK,
          },
        },
      };
    }

    case "waterfall": {
      const m = matrix(rows, labels, names)[0];
      // Cột đệm trong suốt đẩy mỗi khoản lên đúng độ cao lũy kế.
      const dem: number[] = [];
      const than: number[] = [];
      let mocLuyKe = 0;
      for (const v of m) {
        dem.push(v >= 0 ? mocLuyKe : mocLuyKe + v);
        than.push(Math.abs(v));
        mocLuyKe += v;
      }
      const cot = [...labels, "Kết quả"];
      dem.push(0);
      than.push(mocLuyKe);
      return {
        ...base(mode),
        tooltip: {
          ...tooltip(mode),
          formatter: (p: unknown) => {
            const arr = p as { name: string; seriesName?: string; value: number }[];
            const than_ = arr.find((x) => x.seriesName === "than");
            return than_ ? `${than_.name}<br/>${fmt(than_.value)}` : "";
          },
        },
        xAxis: catAxis(mode, cot, { axisLabel: { color: c.inkMuted, fontSize: 11, fontFamily: FONT_STACK, interval: 0, rotate: cot.length > 6 ? 30 : 0 } }),
        yAxis: valAxis(mode, fmt),
        series: [
          {
            name: "dem",
            type: "bar",
            stack: "wf",
            silent: true,
            itemStyle: { color: "transparent" },
            data: dem,
          },
          {
            name: "than",
            type: "bar",
            stack: "wf",
            barMaxWidth: MARK.barMaxWidth,
            data: than.map((v, i) => ({
              value: v,
              itemStyle: columnItem(
                i === than.length - 1
                  ? SERIES[mode][0]
                  : m[i] >= 0
                    ? c.deltaGood
                    : c.deltaBad
              ),
            })),
          },
        ],
      };
    }

    case "funnel": {
      const m = matrix(rows, labels, names)[0];
      const dinh = m[0] || 1;
      return {
        ...base(mode),
        tooltip: {
          ...tooltip(mode),
          trigger: "item",
          formatter: (p: unknown) => {
            const x = p as { name: string; value: number };
            return `${x.name}<br/>${fmt(x.value)} · ${vnPercent((x.value / dinh) * 100)} so với bậc đầu`;
          },
        },
        series: [
          {
            type: "funnel",
            left: 0,
            right: 0,
            top: 8,
            bottom: 8,
            minSize: "24%",
            sort: "descending",
            gap: MARK.gap,
            label: {
              position: "inside",
              color: "#fff",
              fontSize: 12,
              fontFamily: FONT_STACK,
              formatter: (p: unknown) => (p as { name: string }).name,
            },
            data: labels.map((l, i) => ({
              name: l,
              value: m[i],
              itemStyle: { color: SERIES[mode][0], opacity: 1 - i * 0.14 },
            })),
          },
        ],
      };
    }

    case "heatmap": {
      const x = labels;
      const y = names;
      const data = rows.map((r) => [x.indexOf(r.label), y.indexOf(r.series ?? ""), r.value]);
      const max = Math.max(...rows.map((r) => r.value));
      return {
        ...base(mode),
        tooltip: {
          ...tooltip(mode),
          trigger: "item",
          formatter: (p: unknown) => {
            const v = (p as { value: [number, number, number] }).value;
            return `${y[v[1]]} · ${x[v[0]]}<br/>${fmt(v[2])}`;
          },
        },
        grid: { left: 8, right: 16, top: 8, bottom: 40, containLabel: true },
        xAxis: catAxis(mode, x, { splitArea: { show: false } }),
        yAxis: catAxis(mode, y, { splitArea: { show: false } }),
        // Sequential MỘT hue, nhạt → đậm. Không bao giờ cầu vồng.
        visualMap: {
          min: 0,
          max,
          calculable: false,
          orient: "horizontal",
          left: "center",
          bottom: 0,
          itemWidth: 10,
          itemHeight: 90,
          textStyle: { color: c.inkMuted, fontSize: 11, fontFamily: FONT_STACK },
          inRange: { color: SEQUENTIAL[mode] },
        },
        series: [
          {
            type: "heatmap",
            data,
            itemStyle: { borderColor: c.surface, borderWidth: MARK.gap },
          },
        ],
      };
    }

    case "scatter": {
      // Dạng "mọi cặp màu cùng xuất hiện": trần 3 màu.
      const nhom = names.slice(0, 3);
      return {
        ...base(mode, { legend: nhieuSeries }),
        tooltip: {
          ...tooltip(mode),
          trigger: "item",
          formatter: (p: unknown) => {
            const x = p as { seriesName: string; value: [number, number] };
            return `${x.seriesName}<br/>x: ${vnNumber(x.value[0])}<br/>y: ${fmt(x.value[1])}`;
          },
        },
        xAxis: valAxis(mode, (v) => vnNumber(v), { splitLine: { show: false } }),
        yAxis: valAxis(mode, fmt),
        series: nhom.map((s, i) => ({
          name: s || undefined,
          type: "scatter" as const,
          symbolSize: MARK.symbolSize,
          itemStyle: { color: SERIES[mode][i], opacity: 0.75 },
          data: rows
            .filter((r) => (r.series ?? "") === s)
            .map((r) => [r.value, r.value2 ?? 0]),
        })),
      };
    }

    default:
      return null;
  }
}
