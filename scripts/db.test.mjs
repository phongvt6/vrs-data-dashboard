#!/usr/bin/env node
// Test SQL offline bằng pg-mem (Postgres giả trong RAM): chạy schema.sql thật,
// upsert catalog rồi load lại, kiểm tra round-trip + merge preserve qua DB.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { newDb } from "pg-mem";
import { loadCatalog, upsertCatalog } from "./lib/db.mjs";
import { mergeSchema } from "./lib/merge.mjs";

const here = dirname(fileURLToPath(import.meta.url));
let passed = 0;
const test = async (name, fn) => { await fn(); passed++; console.log(`  ✓ ${name}`); };

async function freshClient() {
  const db = newDb();
  const { Client } = db.adapters.createPg();
  const client = new Client();
  await client.connect();
  const schema = await readFile(resolve(here, "../supabase/schema.sql"), "utf8");
  await client.query(schema);
  return client;
}

const sampleCatalog = {
  datasets: [
    {
      id: "orders", ten: "Orders", nguon: "Supabase", duong_dan: "supabase: public.orders",
      chu_so_huu: "Team Data", tan_suat: "Realtime", phan_loai_bao_mat: "Nội bộ - Nhạy cảm",
      trang_thai: "production", so_dong: 150000, mo_ta: "Đơn hàng", cap_nhat_lan_cuoi: "2026-07-12T09:00",
      nguon_ref: { type: "postgres", source: "supabase", path: "public.orders" },
      columns: [
        { ten: "id", kieu: "uuid", khoa: "PK", mo_ta: "Khóa chính" },
        { ten: "amount", kieu: "numeric", khoa: "", mo_ta: "Số tiền" },
      ],
    },
  ],
  relationships: [{ id: "r1", from: "orders", to: "orders", loai: "self", mo_ta: "demo" }],
};

await test("schema.sql chạy được trên Postgres + round-trip upsert/load", async () => {
  const client = await freshClient();
  await upsertCatalog(client, sampleCatalog);
  const back = await loadCatalog(client);
  assert.equal(back.datasets.length, 1);
  const d = back.datasets[0];
  assert.equal(d.id, "orders");
  assert.equal(d.so_dong, 150000, "so_dong (bigint) parse về number");
  assert.equal(d.columns.length, 2);
  assert.equal(d.columns[0].khoa, "PK", "thứ tự + khóa cột giữ đúng");
  assert.equal(d.nguon_ref.path, "public.orders", "nguon_ref (jsonb) round-trip");
  assert.equal(back.relationships[0].from, "orders");
  await client.end();
});

await test("upsert lại (idempotent) không nhân bản, cập nhật đúng", async () => {
  const client = await freshClient();
  await upsertCatalog(client, sampleCatalog);
  const changed = structuredClone(sampleCatalog);
  changed.datasets[0].mo_ta = "Đơn hàng (đã sửa)";
  changed.datasets[0].columns.push({ ten: "status", kieu: "text", khoa: "", mo_ta: "" });
  await upsertCatalog(client, changed);
  const back = await loadCatalog(client);
  assert.equal(back.datasets.length, 1, "không nhân bản dataset");
  assert.equal(back.datasets[0].mo_ta, "Đơn hàng (đã sửa)");
  assert.equal(back.datasets[0].columns.length, 3, "cột mới được thêm");
  await client.end();
});

await test("collector merge qua DB: đổi kiểu cột nhưng GIỮ khoa+mo_ta người gõ", async () => {
  const client = await freshClient();
  await upsertCatalog(client, sampleCatalog);

  // Mô phỏng collector kéo lại: id đổi uuid->bigint, amount còn, thêm created_at.
  const collected = [
    {
      nguon_ref: { type: "postgres", source: "supabase", path: "public.orders" },
      ten: "orders", nguon: "Supabase", duong_dan: "supabase: public.orders", so_dong: 160000,
      columns: [
        { ten: "id", kieu: "bigint" },
        { ten: "amount", kieu: "numeric" },
        { ten: "created_at", kieu: "timestamptz" },
      ],
    },
  ];
  const before = await loadCatalog(client);
  const { catalog } = mergeSchema(before, collected, { now: "2026-07-12T10:00" });
  await upsertCatalog(client, catalog);

  const back = await loadCatalog(client);
  const d = back.datasets.find((x) => x.id === "orders");
  const id = d.columns.find((c) => c.ten === "id");
  assert.equal(id.kieu, "bigint", "kiểu cập nhật từ nguồn");
  assert.equal(id.khoa, "PK", "KHÓA người gõ được giữ qua DB");
  assert.equal(id.mo_ta, "Khóa chính", "MÔ TẢ người gõ được giữ qua DB");
  assert.equal(d.so_dong, 160000);
  assert.equal(d.columns.length, 3, "created_at được thêm");
  await client.end();
});

console.log(`\n${passed} DB test PASS`);
