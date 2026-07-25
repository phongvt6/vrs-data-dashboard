#!/usr/bin/env node
// Đồng bộ TAXONOMY chart từ app ui-chart-catalog (nguồn sự thật) sang đây.
//
//   npm run sync-charts               # đọc từ ../ui-chart-catalog (mặc định)
//   npm run sync-charts -- --from=/đường/dẫn/chart-catalog.meta.json
//
// Một chiều catalog → vrs: catalog định nghĩa "có những loại chart nào + hướng
// dẫn"; vrs chỉ RENDER được một tập con (mỗi loại cần một case trong options.ts).
// Script này:
//   1. copy snapshot metadata vào src/chart/catalog-meta.json (để diff/lịch sử);
//   2. sinh src/chart/catalog.generated.ts (JOBS + CHART_TYPES) cho các loại vrs
//      render được — tên/mã/hướng dẫn lấy thẳng từ catalog, hết lệch chữ nghĩa;
//   3. IN CẢNH BÁO: loại catalog có mà vrs chưa có renderer, và ngược lại.
//
// Muốn thêm một loại: viết renderer trong src/chart/options.ts + mẫu trong
// sample.ts, rồi thêm id vào SUPPORTED bên dưới, chạy lại script.

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

// --- Các loại vrs RENDER được (khớp options.ts + ChartTile) -----------------
const SUPPORTED = [
  "stat-tile", "meter", "line", "area", "column", "bar", "grouped-bar",
  "stacked-bar", "stacked-100", "donut", "waterfall", "funnel", "heatmap", "scatter",
];
// Chiều cao gợi ý (ô lưới) cho vài loại — catalog không có trường này.
const CAO = { "stat-tile": 1, "meter": 1 };

// --- Nguồn ------------------------------------------------------------------
const arg = process.argv.find((a) => a.startsWith("--from="));
const FROM = arg
  ? arg.slice("--from=".length)
  : path.resolve(process.cwd(), "../ui-chart-catalog/chart-catalog.meta.json");

let meta;
try {
  meta = JSON.parse(await readFile(FROM, "utf8"));
} catch (e) {
  console.error(`✗ Không đọc được metadata catalog tại:\n  ${FROM}\n  ${e.message}`);
  console.error(`  → Chạy \`node scripts/emit-chart-meta.mjs\` bên ui-chart-catalog trước,`);
  console.error(`    hoặc trỏ --from=<đường dẫn chart-catalog.meta.json>.`);
  process.exit(1);
}

const byId = new Map(meta.charts.map((c) => [c.id, c]));

// --- Đối chiếu (drift) ------------------------------------------------------
const thieuRenderer = meta.charts
  .filter((c) => c.status === "ready" && !SUPPORTED.includes(c.id))
  .map((c) => c.id);
const khongConTrongCatalog = SUPPORTED.filter((id) => !byId.has(id));
const planned = SUPPORTED.filter((id) => byId.get(id)?.status === "planned");

// --- Sinh dữ liệu cho các loại được hỗ trợ ----------------------------------
const supportedCharts = SUPPORTED.filter((id) => byId.has(id)).map((id) => {
  const c = byId.get(id);
  const t = {
    id: c.id,
    ten: c.nameVi,
    job: c.job,
    mo_ta: c.description,
    nen_dung: c.useWhen,
    tranh: c.avoidWhen,
    dang_du_lieu: c.dataShape,
  };
  if (CAO[id] != null) t.cao = CAO[id];
  return t;
});

// JOBS: chỉ các nhóm được loại hỗ trợ tham chiếu, giữ thứ tự của catalog.
const jobsDung = new Set(supportedCharts.map((t) => t.job));
const jobs = meta.jobs
  .filter((j) => jobsDung.has(j.id))
  .map((j) => ({ id: j.id, ten: j.nameVi, cau_hoi: j.question }));

// --- Ghi file ---------------------------------------------------------------
await writeFile("src/chart/catalog-meta.json", JSON.stringify(meta, null, 2) + "\n");

const banner = `// ⚙️ TỰ SINH từ ui-chart-catalog — chạy \`npm run sync-charts\`. ĐỪNG SỬA TAY.
//
// Nguồn sự thật của taxonomy chart (tên, mã, nên/tránh dùng, dạng dữ liệu) là app
// ui-chart-catalog. File này chỉ chứa các loại vrs RENDER được (xem SUPPORTED
// trong scripts/sync-chart-catalog.mjs). Sửa hướng dẫn → sửa bên catalog rồi sync.
`;

const ts = `${banner}
import type { Job, ChartType } from "./types";

export const JOBS: Job[] = ${JSON.stringify(jobs, null, 2)};

export const CHART_TYPES: ChartType[] = ${JSON.stringify(supportedCharts, null, 2)};
`;
await writeFile("src/chart/catalog.generated.ts", ts);

// --- Báo cáo ----------------------------------------------------------------
console.log(`✓ Đồng bộ từ ${path.relative(process.cwd(), FROM)}`);
console.log(`  Catalog: ${meta.chartCount} loại · vrs render: ${supportedCharts.length} loại`);
console.log(`  → src/chart/catalog.generated.ts, src/chart/catalog-meta.json`);
if (thieuRenderer.length) {
  console.log(`\n⚠ ${thieuRenderer.length} loại catalog có mà vrs CHƯA có renderer (thêm vào SUPPORTED + viết options.ts nếu muốn vẽ):`);
  console.log(`  ${thieuRenderer.join(", ")}`);
}
if (khongConTrongCatalog.length) {
  console.log(`\n⚠ ${khongConTrongCatalog.length} loại vrs render nhưng KHÔNG còn trong catalog (id đổi/bỏ?):`);
  console.log(`  ${khongConTrongCatalog.join(", ")}`);
}
if (planned.length) {
  console.log(`\n⚠ ${planned.length} loại vrs render nhưng catalog đánh 'planned':`);
  console.log(`  ${planned.join(", ")}`);
}
if (!thieuRenderer.length && !khongConTrongCatalog.length && !planned.length) {
  console.log(`\n✓ Không lệch: mọi loại vrs render đều khớp catalog.`);
}
