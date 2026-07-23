#!/usr/bin/env node
// Orchestrator: đọc scripts/sources.json, chạy collector cho từng nguồn đã bật,
// merge schema vào Supabase (GIỮ metadata người gõ trong admin), rồi validate.
//
//   npm run collect            # kéo + merge vào DB
//   npm run collect -- --dry-run   # chỉ in thay đổi, KHÔNG ghi DB
//
// Nguồn cấu hình ở scripts/sources.json. Relationships khai báo tay trong app
// (Quản trị → Liên kết) — collector không đụng tới.

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { mergeSchema } from "./lib/merge.mjs";
import { validateCatalog } from "./validate-catalog.mjs";
import { withClient, loadCatalog, upsertCatalog, hasDb } from "./lib/db.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const COLLECTORS = {
  postgres: () => import("./collectors/postgres.mjs"),
  bigquery: () => import("./collectors/bigquery.mjs"),
  airtable: () => import("./collectors/airtable.mjs"),
  sheets: () => import("./collectors/sheets.mjs"),
};

async function loadSources() {
  const path = resolve(here, "sources.json");
  try {
    return JSON.parse(await readFile(path, "utf8")).sources ?? [];
  } catch (e) {
    if (e.code === "ENOENT") {
      console.error("Không tìm thấy scripts/sources.json.");
      process.exit(1);
    }
    throw e;
  }
}

function isoNow() {
  return new Date().toISOString().slice(0, 16); // 2026-07-12T09:31
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  if (!hasDb()) {
    console.error("Chưa cấu hình DATABASE_URL / SUPABASE_DB_URL — không kết nối được Supabase.");
    process.exit(1);
  }

  const sources = (await loadSources()).filter((s) => s.enabled !== false);
  if (!sources.length) {
    console.log("Chưa có nguồn nào được bật trong scripts/sources.json.");
    return;
  }

  const collected = [];
  for (const source of sources) {
    const loader = COLLECTORS[source.type];
    if (!loader) {
      console.warn(`  · [${source.id}] bỏ qua: type "${source.type}" chưa hỗ trợ`);
      continue;
    }
    try {
      const mod = await loader();
      const tables = await mod.collect(source);
      console.log(`  · [${source.id}] ${source.type}: ${tables.length} bảng`);
      collected.push(...tables);
    } catch (e) {
      console.error(`  ✖ [${source.id}] lỗi: ${e.message}`);
      process.exitCode = 1;
    }
  }

  await withClient(async (client) => {
    const before = await loadCatalog(client);
    const { catalog, report } = mergeSchema(before, collected, { now: isoNow() });

    console.log("\nKết quả merge:");
    console.log(`  + thêm mới:  ${report.added.length}  ${report.added.join(", ")}`);
    console.log(`  ~ cập nhật:  ${report.updated.length}`);
    for (const c of report.columnsAdded) console.log(`      + cột [${c.id}]: ${c.cols.join(", ")}`);
    for (const c of report.columnsRemoved) console.log(`      - cột [${c.id}]: ${c.cols.join(", ")}`);
    if (report.orphaned.length)
      console.log(`  ⚠ nguồn không còn (giữ lại, cần xem): ${report.orphaned.join(", ")}`);

    const { errors } = validateCatalog(catalog);
    if (errors.length) {
      console.error("\n✖ Sau merge catalog KHÔNG hợp lệ — không ghi DB:");
      for (const e of errors) console.error(`  ❌ ${e}`);
      process.exit(1);
    }

    if (dryRun) {
      console.log("\n--dry-run: không ghi DB.");
      return;
    }
    await upsertCatalog(client, catalog);
    console.log("\n✓ Đã cập nhật Supabase.");
  });
}

main();
