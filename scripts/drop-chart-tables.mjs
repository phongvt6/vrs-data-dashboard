#!/usr/bin/env node
// Xoá 2 bảng của cách ghép chart cũ (catalog.charts, catalog.chart_queries),
// nhưng SAO LƯU vào catalog.archive trước để lỡ cần còn lấy lại.
//
//   npm run db:drop-charts            # sao lưu rồi xoá
//   npm run db:drop-charts -- --check # chỉ đếm, không đụng gì

import pg from "pg";

const check = process.argv.includes("--check");
const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
if (!connectionString) {
  console.error("Thiếu DATABASE_URL.");
  process.exit(1);
}

const c = new pg.Client({
  connectionString,
  ssl: /localhost|127\.0\.0\.1/.test(connectionString) ? false : { rejectUnauthorized: false },
});
await c.connect();

async function coBang(ten) {
  const { rows } = await c.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema='catalog' AND table_name=$1`,
    [ten]
  );
  return rows.length > 0;
}

try {
  const cCharts = (await coBang("charts")) ? Number((await c.query("SELECT count(*) n FROM catalog.charts")).rows[0].n) : null;
  const cQ = (await coBang("chart_queries")) ? Number((await c.query("SELECT count(*) n FROM catalog.chart_queries")).rows[0].n) : null;
  console.log(`charts: ${cCharts === null ? "(không có bảng)" : cCharts + " dòng"} · chart_queries: ${cQ === null ? "(không có bảng)" : cQ + " dòng"}`);

  if (check) process.exit(0);

  await c.query("BEGIN");
  // Sao lưu nội dung 2 bảng vào archive nếu còn dữ liệu.
  if (cCharts) {
    const charts = (await c.query("SELECT * FROM catalog.charts")).rows;
    const queries = cQ ? (await c.query("SELECT * FROM catalog.chart_queries")).rows : [];
    await c.query(
      `INSERT INTO catalog.archive (loai, doi_tuong_id, ten, du_lieu, ghi_chu)
       VALUES ($1,$2,$3,$4,$5)`,
      ["charts_cu", "charts_cu", "Chart ghép qua form (cách cũ)",
       JSON.stringify({ charts, chart_queries: queries }),
       `${charts.length} chart · ${queries.length} truy vấn — sao lưu trước khi xoá bảng`]
    );
    console.log(`Đã sao lưu ${charts.length} chart + ${queries.length} truy vấn vào catalog.archive.`);
  }
  await c.query("DROP TABLE IF EXISTS catalog.chart_queries");
  await c.query("DROP TABLE IF EXISTS catalog.charts");
  await c.query("COMMIT");
  console.log("Đã xoá catalog.charts và catalog.chart_queries.");
} catch (e) {
  await c.query("ROLLBACK");
  console.error("LỖI:", e.message);
  process.exitCode = 1;
} finally {
  await c.end();
}
