"use client";

// Bộ chart tuỳ biến cho tự doanh native — vẽ bằng ECharts qua <EChart>, khớp
// token app (CHROME/SERIES/MARK/FONT_STACK). Các loại chuẩn (donut/area/stacked)
// có thể dùng ChartTile, nhưng port cần center-total + màu theo thực thể + combo
// hai trục, nên gom về đây cho nhất quán.

import type { EChartsOption } from "echarts";
import { EChart } from "@/chart/EChart";
import { CHROME, MARK, FONT, FONT_STACK } from "@/chart/lib/theme";
import { vnCompact, vnNumber } from "@/chart/lib/theme";

const C = CHROME.light;
const AXIS_TEXT = { color: C.inkSecondary, fontFamily: FONT_STACK, fontSize: FONT.axis };
const money = (v: number) => `${vnCompact(v)} ₫`;

const baseGrid = { left: 8, right: 12, top: 24, bottom: 8, containLabel: true };
function tip(extra: Record<string, unknown> = {}) {
  return {
    trigger: "axis" as const,
    backgroundColor: C.surface,
    borderColor: C.border,
    borderWidth: 1,
    textStyle: { color: C.ink, fontFamily: FONT_STACK, fontSize: FONT.tooltip },
    ...extra,
  };
}

/* ---------------------------------------------------------------- Donut --- */

export function DonutTotal({
  items,
  colorOf,
  height = 220,
  unit = "₫",
}: {
  items: { name: string; value: number }[];
  colorOf: (name: string) => string;
  height?: number;
  unit?: string;
}) {
  const total = items.reduce((s, r) => s + r.value, 0);
  const option: EChartsOption = {
    tooltip: {
      trigger: "item",
      backgroundColor: C.surface,
      borderColor: C.border,
      borderWidth: 1,
      textStyle: { color: C.ink, fontFamily: FONT_STACK, fontSize: FONT.tooltip },
      formatter: (p: { name: string; value: number; percent: number }) =>
        `${p.name}<br/><b>${unit === "₫" ? money(p.value) : vnNumber(p.value)}</b> · ${p.percent}%`,
    } as EChartsOption["tooltip"],
    legend: {
      type: "scroll",
      orient: "vertical",
      right: 0,
      top: "middle",
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { color: C.inkSecondary, fontFamily: FONT_STACK, fontSize: FONT.legend },
    },
    graphic: {
      type: "text",
      left: "34%",
      top: "middle",
      style: {
        text: unit === "₫" ? money(total) : vnNumber(total),
        textAlign: "center",
        fill: C.ink,
        fontFamily: FONT_STACK,
        fontSize: 16,
        fontWeight: 700,
      },
    } as EChartsOption["graphic"],
    series: [
      {
        type: "pie",
        radius: ["52%", "76%"],
        center: ["34%", "50%"],
        avoidLabelOverlap: true,
        label: { show: false },
        labelLine: { show: false },
        data: items.map((r) => ({ name: r.name, value: r.value, itemStyle: { color: colorOf(r.name) } })),
      },
    ],
  };
  return <EChart option={option} height={height} resetKey={`donut${items.length}`} />;
}

/* ----------------------------------------------------------- Bar + Line --- */

export function BarLineMonthly({
  labels,
  cur,
  prev,
  curName,
  prevName,
  highlightIdx,
  height = 300,
}: {
  labels: string[];
  cur: number[];
  prev: number[];
  curName: string;
  prevName: string;
  highlightIdx?: number;
  height?: number;
}) {
  const option: EChartsOption = {
    grid: baseGrid,
    tooltip: tip({ valueFormatter: (v: number) => money(v) }),
    legend: { top: 0, right: 0, textStyle: AXIS_TEXT, itemWidth: 14, itemHeight: 8 },
    xAxis: {
      type: "category",
      data: labels,
      axisLine: { lineStyle: { color: C.axis } },
      axisTick: { show: false },
      axisLabel: AXIS_TEXT,
    },
    yAxis: {
      type: "value",
      splitLine: { lineStyle: { color: C.grid } },
      axisLabel: { ...AXIS_TEXT, formatter: (v: number) => vnCompact(v) },
    },
    series: [
      {
        name: prevName,
        type: "line",
        data: prev,
        smooth: true,
        symbol: "none",
        lineStyle: { color: C.inkMuted, width: 2, type: "dashed" },
        itemStyle: { color: C.inkMuted },
        z: 3,
      },
      {
        name: curName,
        type: "bar",
        data: cur.map((v, i) => ({
          value: v,
          itemStyle: {
            color: i === highlightIdx ? CHROME.light.deltaGood : "#2a78d6",
            borderRadius: [MARK.barRadius, MARK.barRadius, 0, 0],
          },
        })),
        barMaxWidth: 28,
        z: 2,
      },
    ],
  };
  return <EChart option={option} height={height} resetKey="barline" />;
}

/* ------------------------------------------------------------ Area daily --- */

export function AreaDaily({
  points,
  height = 300,
}: {
  points: { label: string; value: number }[];
  height?: number;
}) {
  const option: EChartsOption = {
    grid: baseGrid,
    tooltip: tip({ valueFormatter: (v: number) => money(v) }),
    xAxis: {
      type: "category",
      data: points.map((p) => p.label),
      boundaryGap: false,
      axisLine: { lineStyle: { color: C.axis } },
      axisTick: { show: false },
      axisLabel: { ...AXIS_TEXT, interval: Math.max(0, Math.floor(points.length / 12) - 0) },
    },
    yAxis: {
      type: "value",
      splitLine: { lineStyle: { color: C.grid } },
      axisLabel: { ...AXIS_TEXT, formatter: (v: number) => vnCompact(v) },
    },
    series: [
      {
        type: "line",
        data: points.map((p) => p.value),
        smooth: true,
        symbol: "none",
        lineStyle: { color: "#2a78d6", width: 2 },
        areaStyle: { color: "#2a78d6", opacity: MARK.areaOpacity },
      },
    ],
  };
  return <EChart option={option} height={height} resetKey="area" />;
}

/* -------------------------------------------------------- Rank ngang (H) --- */

export function RankH({
  rows,
  height = 300,
  unit = "₫",
}: {
  rows: { name: string; value: number; color: string }[];
  height?: number;
  unit?: string;
}) {
  const data = [...rows].reverse(); // ECharts vẽ từ dưới lên → đảo để hạng 1 trên cùng
  const option: EChartsOption = {
    grid: { ...baseGrid, left: 8, right: 44 },
    tooltip: {
      trigger: "item",
      backgroundColor: C.surface,
      borderColor: C.border,
      borderWidth: 1,
      textStyle: { color: C.ink, fontFamily: FONT_STACK, fontSize: FONT.tooltip },
      formatter: (p: { name: string; value: number }) =>
        `${p.name}<br/><b>${unit === "₫" ? money(p.value) : vnNumber(p.value)}</b>`,
    } as EChartsOption["tooltip"],
    xAxis: { type: "value", show: false },
    yAxis: {
      type: "category",
      data: data.map((r) => r.name),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { ...AXIS_TEXT, width: 120, overflow: "truncate" },
    },
    series: [
      {
        type: "bar",
        data: data.map((r) => ({ value: r.value, itemStyle: { color: r.color, borderRadius: MARK.barRadius } })),
        barMaxWidth: 18,
        label: {
          show: true,
          position: "right",
          formatter: (p: { value: number }) => (unit === "₫" ? vnCompact(p.value) : vnNumber(p.value)),
          color: C.inkSecondary,
          fontFamily: FONT_STACK,
          fontSize: FONT.dataLabel,
        },
      },
    ] as EChartsOption["series"],
  };
  return <EChart option={option} height={height} resetKey={`rank${rows.length}`} />;
}

/* ----------------------------------------------------- Combo cột + line % --- */

export function ComboUnits({
  cats,
  cur,
  prev,
  curName,
  prevName,
  height = 320,
}: {
  cats: string[];
  cur: number[];
  prev: number[];
  curName: string;
  prevName: string;
  height?: number;
}) {
  const pct = cur.map((v, i) => (prev[i] ? (v / prev[i] - 1) * 100 : null));
  const option: EChartsOption = {
    grid: { ...baseGrid, right: 44 },
    tooltip: {
      trigger: "axis",
      backgroundColor: C.surface,
      borderColor: C.border,
      borderWidth: 1,
      textStyle: { color: C.ink, fontFamily: FONT_STACK, fontSize: FONT.tooltip },
    },
    legend: { top: 0, right: 0, textStyle: AXIS_TEXT, itemWidth: 14, itemHeight: 8 },
    xAxis: {
      type: "category",
      data: cats,
      axisLine: { lineStyle: { color: C.axis } },
      axisTick: { show: false },
      axisLabel: { ...AXIS_TEXT, interval: 0, rotate: cats.length > 6 ? 28 : 0, width: 90, overflow: "truncate" },
    },
    yAxis: [
      { type: "value", splitLine: { lineStyle: { color: C.grid } }, axisLabel: { ...AXIS_TEXT, formatter: (v: number) => vnCompact(v) } },
      { type: "value", splitLine: { show: false }, axisLabel: { ...AXIS_TEXT, formatter: (v: number) => `${v}%` } },
    ],
    series: [
      { name: prevName, type: "bar", data: prev, itemStyle: { color: C.deemphasis, borderRadius: [MARK.barRadius, MARK.barRadius, 0, 0] }, barMaxWidth: 22 },
      { name: curName, type: "bar", data: cur, itemStyle: { color: "#2a78d6", borderRadius: [MARK.barRadius, MARK.barRadius, 0, 0] }, barMaxWidth: 22 },
      {
        name: "% thay đổi",
        type: "line",
        yAxisIndex: 1,
        data: pct,
        smooth: true,
        symbolSize: 6,
        lineStyle: { color: "#eb6834", width: 2 },
        itemStyle: { color: "#eb6834" },
        connectNulls: true,
      },
    ],
  };
  return <EChart option={option} height={height} resetKey={`combo${cats.length}`} />;
}

/* --------------------------------------------------- Stacked theo bộ phận --- */

export function StackedSeries({
  labels,
  series,
  height = 260,
}: {
  labels: string[];
  series: { name: string; data: number[]; color: string }[];
  height?: number;
}) {
  const option: EChartsOption = {
    grid: baseGrid,
    tooltip: tip({ valueFormatter: (v: number) => money(v) }),
    legend: { top: 0, right: 0, type: "scroll", textStyle: AXIS_TEXT, itemWidth: 12, itemHeight: 8 },
    xAxis: {
      type: "category",
      data: labels,
      axisLine: { lineStyle: { color: C.axis } },
      axisTick: { show: false },
      axisLabel: { ...AXIS_TEXT, interval: Math.max(0, Math.floor(labels.length / 14)) },
    },
    yAxis: { type: "value", splitLine: { lineStyle: { color: C.grid } }, axisLabel: { ...AXIS_TEXT, formatter: (v: number) => vnCompact(v) } },
    series: series.map((s) => ({
      name: s.name,
      type: "bar",
      stack: "total",
      data: s.data,
      itemStyle: { color: s.color },
      barMaxWidth: 32,
    })),
  };
  return <EChart option={option} height={height} resetKey={`stack${series.length}x${labels.length}`} />;
}

/* -------------------------------------------------------- Hbars (top SKU) --- */

export function Hbars({
  rows,
  height = 300,
  unit = "₫",
}: {
  rows: { name: string; value: number; color: string }[];
  height?: number;
  unit?: string;
}) {
  return <RankH rows={rows} height={height} unit={unit} />;
}
