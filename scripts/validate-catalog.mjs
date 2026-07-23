#!/usr/bin/env node
// Kiểm tra tính toàn vẹn của catalog.json. Chạy tay: `npm run validate`,
// và tự chạy trước mỗi build (prebuild) để chặn "data mục ngầm".
//
// Bắt các lỗi mà mô hình JSON sửa tay dễ dính:
//   - id dataset trùng / thiếu
//   - relationship trỏ tới dataset không tồn tại (from/to treo)
//   - id relationship trùng
//   - khoa cột không thuộc {"", "PK", "FK"}
//   - thiếu field bắt buộc

import { pathToFileURL } from "node:url";
import { readCatalog } from "./lib/io.mjs";

const KHOA_HOP_LE = new Set(["", "PK", "FK"]);
const DATASET_FIELDS = ["id", "ten", "nguon", "duong_dan", "trang_thai", "columns"];

export function validateCatalog(catalog) {
  const errors = [];
  const warnings = [];
  const push = (arr, msg) => arr.push(msg);

  const ids = new Set();
  for (const [i, d] of (catalog.datasets ?? []).entries()) {
    const at = `datasets[${i}]${d?.id ? ` (${d.id})` : ""}`;
    for (const f of DATASET_FIELDS) {
      if (d[f] === undefined || d[f] === null || d[f] === "")
        push(errors, `${at}: thiếu field bắt buộc "${f}"`);
    }
    if (d.id) {
      if (ids.has(d.id)) push(errors, `${at}: id trùng "${d.id}"`);
      ids.add(d.id);
    }
    for (const [j, c] of (d.columns ?? []).entries()) {
      if (!c.ten) push(errors, `${at}.columns[${j}]: thiếu "ten"`);
      if (!KHOA_HOP_LE.has(c.khoa ?? ""))
        push(errors, `${at}.columns[${j}] (${c.ten}): khoa "${c.khoa}" không hợp lệ (chỉ PK/FK/rỗng)`);
    }
    if (!d.chu_so_huu) push(warnings, `${at}: chưa có chủ sở hữu`);
    if (!d.mo_ta) push(warnings, `${at}: chưa có mô tả`);
  }

  const relIds = new Set();
  for (const [i, r] of (catalog.relationships ?? []).entries()) {
    const at = `relationships[${i}]${r?.id ? ` (${r.id})` : ""}`;
    if (!r.id) push(errors, `${at}: thiếu "id"`);
    else if (relIds.has(r.id)) push(errors, `${at}: id trùng "${r.id}"`);
    relIds.add(r.id);
    if (!ids.has(r.from)) push(errors, `${at}: "from" trỏ tới dataset không tồn tại "${r.from}"`);
    if (!ids.has(r.to)) push(errors, `${at}: "to" trỏ tới dataset không tồn tại "${r.to}"`);
  }

  return { errors, warnings };
}

// Chạy trực tiếp -> in kết quả, exit 1 nếu có lỗi.
// (so sánh qua pathToFileURL để chịu được path có dấu cách, vd "Claude Apps")
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const catalog = await readCatalog();
  const { errors, warnings } = validateCatalog(catalog);

  for (const w of warnings) console.warn(`  ⚠️  ${w}`);
  if (errors.length) {
    for (const e of errors) console.error(`  ❌  ${e}`);
    console.error(`\n✖ catalog.json: ${errors.length} lỗi, ${warnings.length} cảnh báo.`);
    process.exit(1);
  }
  console.log(
    `✓ catalog.json hợp lệ — ${catalog.datasets.length} dataset, ` +
      `${catalog.relationships.length} liên kết, ${warnings.length} cảnh báo.`
  );
}
