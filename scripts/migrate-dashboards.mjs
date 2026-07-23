// Chạy supabase/migrations/001-dashboards.sql lên DB đang cấu hình ở DATABASE_URL.
// Toàn bộ câu lệnh đều "if not exists" nên chạy lại nhiều lần vẫn an toàn.
//
//   npm run db:dashboards            # chạy thật
//   npm run db:dashboards -- --check # chỉ kiểm tra bảng đã có chưa
//
// Muốn tự tay hơn: mở Supabase → SQL Editor → dán nội dung file .sql → Run.

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import pg from "pg";

const here = path.dirname(fileURLToPath(import.meta.url));
const sqlPath = path.join(here, "..", "supabase", "migrations", "001-dashboards.sql");

const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
if (!connectionString) {
  console.error("Thiếu DATABASE_URL. Xem .env.example.");
  process.exit(1);
}

const BANG = ["dashboards", "dashboard_datasets", "charts", "chart_queries"];
const check = process.argv.includes("--check");

const client = new pg.Client({
  connectionString,
  ssl: /localhost|127\.0\.0\.1/.test(connectionString) ? false : { rejectUnauthorized: false },
});

await client.connect();
try {
  if (!check) {
    const sql = await readFile(sqlPath, "utf8");
    await client.query(sql);
    console.log("Đã chạy 001-dashboards.sql.");
  }

  const { rows } = await client.query(
    `SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'catalog' AND table_name = ANY($1)`,
    [BANG]
  );
  const co = new Set(rows.map((r) => r.table_name));
  for (const b of BANG) {
    console.log(`${co.has(b) ? "✓" : "✗"} catalog.${b}`);
  }
  if (co.size < BANG.length) process.exitCode = 1;
} finally {
  await client.end();
}
