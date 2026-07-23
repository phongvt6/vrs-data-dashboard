#!/usr/bin/env node
// Seed 1 lần: tạo schema (nếu chưa có) + đổ dữ liệu từ src/data/catalog.json vào
// Supabase. An toàn chạy lại (upsert). Cần DATABASE_URL/SUPABASE_DB_URL trong .env.local.
//   npm run db:init
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { readCatalog } from "./lib/io.mjs";
import { withClient, upsertCatalog } from "./lib/db.mjs";

const here = dirname(fileURLToPath(import.meta.url));

await withClient(async (client) => {
  const schema = await readFile(resolve(here, "../supabase/schema.sql"), "utf8");
  await client.query(schema);
  console.log("✓ Schema sẵn sàng (catalog.datasets / columns / relationships / settings)");

  const catalog = await readCatalog();
  await upsertCatalog(client, catalog);
  console.log(
    `✓ Đã đổ ${catalog.datasets.length} dataset, ${catalog.relationships.length} liên kết vào Supabase.`
  );
});
