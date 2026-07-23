#!/usr/bin/env node
// Test offline bằng pg-mem: chạy schema.sql + migrations/001-dashboards.sql thật,
// rồi kiểm tra ràng buộc của phần Dashboard trước khi đụng vào Supabase thật.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { newDb } from "pg-mem";

const here = dirname(fileURLToPath(import.meta.url));
let passed = 0;
const test = async (name, fn) => { await fn(); passed++; console.log(`  ✓ ${name}`); };

async function freshClient() {
  const db = newDb();
  const { Client } = db.adapters.createPg();
  const client = new Client();
  await client.connect();
  for (const f of ["../supabase/schema.sql", "../supabase/migrations/001-dashboards.sql"]) {
    await client.query(await readFile(resolve(here, f), "utf8"));
  }
  return client;
}

// Một dataset để nối vào, dựng sẵn cho mỗi test.
async function seedDataset(client, id = "doanh_thu") {
  await client.query(
    `INSERT INTO catalog.datasets (id, ten, nguon) VALUES ($1, $2, 'BigQuery')`,
    [id, "Doanh thu"]
  );
  return id;
}

const addDashboard = (client, id = "bao_cao_ban_hang") =>
  client.query(
    `INSERT INTO catalog.dashboards (id, ten, cong_cu, url) VALUES ($1,$2,$3,$4)`,
    [id, "Báo cáo bán hàng", "Looker Studio", "https://example.com/d/1"]
  );

console.log("dashboards.test.mjs");

// pg-mem gộp mọi schema vào "public", nên chỉ đối chiếu theo tên bảng.
await test("schema.sql + migration chạy được, tạo đủ 4 bảng", async () => {
  const client = await freshClient();
  const { rows } = await client.query(`SELECT table_name FROM information_schema.tables`);
  const co = new Set(rows.map((r) => r.table_name));
  for (const b of ["dashboards", "dashboard_datasets", "charts", "chart_queries"]) {
    assert.ok(co.has(b), `thiếu bảng catalog.${b}`);
  }
});

await test("dashboard lưu và đọc lại đúng, có default hợp lý", async () => {
  const client = await freshClient();
  await addDashboard(client);
  const { rows } = await client.query(`SELECT * FROM catalog.dashboards WHERE id = 'bao_cao_ban_hang'`);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].ten, "Báo cáo bán hàng");
  assert.equal(rows[0].trang_thai, "prototype");
  assert.equal(rows[0].phan_loai_bao_mat, "Nội bộ");
  assert.equal(rows[0].mo_ta, "");
});

await test("nối dashboard ↔ dataset, không cho trùng cặp", async () => {
  const client = await freshClient();
  const dsId = await seedDataset(client);
  await addDashboard(client);
  await client.query(
    `INSERT INTO catalog.dashboard_datasets (dashboard_id, dataset_id) VALUES ($1,$2)`,
    ["bao_cao_ban_hang", dsId]
  );
  await assert.rejects(
    client.query(
      `INSERT INTO catalog.dashboard_datasets (dashboard_id, dataset_id) VALUES ($1,$2)`,
      ["bao_cao_ban_hang", dsId]
    ),
    "cặp dashboard+dataset trùng phải bị chặn"
  );
});

await test("không nối được vào dataset không tồn tại", async () => {
  const client = await freshClient();
  await addDashboard(client);
  await assert.rejects(
    client.query(
      `INSERT INTO catalog.dashboard_datasets (dashboard_id, dataset_id) VALUES ($1,$2)`,
      ["bao_cao_ban_hang", "khong_co_that"]
    ),
    "FK sang catalog.datasets phải chặn dataset lạ"
  );
});

await test("xóa dataset thì link tự rụng, dashboard vẫn còn", async () => {
  const client = await freshClient();
  const dsId = await seedDataset(client);
  await addDashboard(client);
  await client.query(
    `INSERT INTO catalog.dashboard_datasets (dashboard_id, dataset_id) VALUES ($1,$2)`,
    ["bao_cao_ban_hang", dsId]
  );
  await client.query(`DELETE FROM catalog.datasets WHERE id = $1`, [dsId]);

  const links = await client.query(`SELECT * FROM catalog.dashboard_datasets`);
  assert.equal(links.rows.length, 0, "link phải bị cascade");
  const dash = await client.query(`SELECT * FROM catalog.dashboards`);
  assert.equal(dash.rows.length, 1, "dashboard không được biến mất theo dataset");
});

await test("xóa dashboard thì chart và link của nó rụng theo", async () => {
  const client = await freshClient();
  const dsId = await seedDataset(client);
  await addDashboard(client);
  await client.query(
    `INSERT INTO catalog.dashboard_datasets (dashboard_id, dataset_id) VALUES ($1,$2)`,
    ["bao_cao_ban_hang", dsId]
  );
  await client.query(
    `INSERT INTO catalog.charts (id, dashboard_id, tieu_de, loai) VALUES ($1,$2,$3,$4)`,
    ["c1", "bao_cao_ban_hang", "Doanh thu theo tháng", "line_basic"]
  );
  await client.query(`DELETE FROM catalog.dashboards WHERE id = 'bao_cao_ban_hang'`);

  for (const t of ["dashboard_datasets", "charts"]) {
    const { rows } = await client.query(`SELECT * FROM catalog.${t}`);
    assert.equal(rows.length, 0, `catalog.${t} phải rỗng sau khi xóa dashboard`);
  }
});

await test("chart_queries trỏ được sang catalog.sources", async () => {
  const client = await freshClient();
  await addDashboard(client);
  await client.query(
    `INSERT INTO catalog.sources (id, type, label) VALUES ('bq_main', 'bigquery', 'BigQuery chính')`
  );
  await client.query(
    `INSERT INTO catalog.charts (id, dashboard_id, tieu_de) VALUES ('c1', 'bao_cao_ban_hang', 'Doanh thu')`
  );
  await client.query(
    `INSERT INTO catalog.chart_queries (chart_id, source_id, sql) VALUES ('c1', 'bq_main', 'select 1')`
  );
  const { rows } = await client.query(`SELECT source_id, cache_ttl_giay FROM catalog.chart_queries`);
  assert.equal(rows[0].source_id, "bq_main");
  assert.equal(rows[0].cache_ttl_giay, 900);
});

console.log(`\n${passed} test đã pass.`);
