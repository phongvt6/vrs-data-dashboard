#!/usr/bin/env node
// Test offline cho merge + validate (không cần credential). Chạy: npm test
import assert from "node:assert/strict";
import { mergeSchema, refKey } from "./lib/merge.mjs";
import { validateCatalog } from "./validate-catalog.mjs";
import { slugify } from "./lib/io.mjs";

let passed = 0;
const test = (name, fn) => {
  fn();
  passed++;
  console.log(`  ✓ ${name}`);
};

// Catalog gốc: 1 dataset có nguon_ref + metadata người gõ, + 1 quan hệ.
const baseCatalog = () => ({
  datasets: [
    {
      id: "orders",
      ten: "Orders",
      nguon: "Supabase",
      duong_dan: "supabase: public.orders",
      chu_so_huu: "Team Data",
      tan_suat: "Realtime",
      phan_loai_bao_mat: "Nội bộ - Nhạy cảm",
      trang_thai: "production",
      so_dong: 100,
      mo_ta: "Đơn hàng",
      nguon_ref: { type: "postgres", source: "supabase", path: "public.orders" },
      columns: [
        { ten: "id", kieu: "uuid", khoa: "PK", mo_ta: "Khóa chính" },
        { ten: "amount", kieu: "numeric", khoa: "", mo_ta: "Số tiền" },
      ],
    },
  ],
  relationships: [{ id: "r1", from: "orders", to: "orders", loai: "self", mo_ta: "demo" }],
});

test("giữ nguyên khoa + mo_ta của cột cũ khi kiểu đổi", () => {
  const collected = [
    {
      nguon_ref: { type: "postgres", source: "supabase", path: "public.orders" },
      ten: "orders",
      nguon: "Supabase",
      duong_dan: "supabase: public.orders",
      so_dong: 250,
      columns: [
        { ten: "id", kieu: "bigint" }, // kiểu đổi uuid -> bigint
        { ten: "amount", kieu: "numeric" },
      ],
    },
  ];
  const { catalog, report } = mergeSchema(baseCatalog(), collected, { now: "2026-07-12T09:00" });
  const ds = catalog.datasets[0];
  assert.equal(ds.columns[0].kieu, "bigint", "kiểu được cập nhật");
  assert.equal(ds.columns[0].khoa, "PK", "khoa PK giữ nguyên");
  assert.equal(ds.columns[0].mo_ta, "Khóa chính", "mo_ta giữ nguyên");
  assert.equal(ds.chu_so_huu, "Team Data", "metadata dataset giữ nguyên");
  assert.equal(ds.so_dong, 250, "so_dong cập nhật");
  assert.equal(ds.cap_nhat_lan_cuoi, "2026-07-12T09:00", "đóng dấu thời gian");
  assert.deepEqual(report.updated, ["orders"]);
});

test("cột mới thêm vào với mo_ta rỗng; cột mất bị report", () => {
  const collected = [
    {
      nguon_ref: { type: "postgres", source: "supabase", path: "public.orders" },
      ten: "orders",
      nguon: "Supabase",
      columns: [
        { ten: "id", kieu: "uuid" },
        { ten: "status", kieu: "text" }, // mới
        // 'amount' biến mất
      ],
    },
  ];
  const { catalog, report } = mergeSchema(baseCatalog(), collected);
  const cols = catalog.datasets[0].columns.map((c) => c.ten);
  assert.deepEqual(cols, ["id", "status"], "cột theo đúng nguồn");
  assert.equal(catalog.datasets[0].columns[1].mo_ta, "", "cột mới mo_ta rỗng");
  assert.deepEqual(report.columnsAdded, [{ id: "orders", cols: ["status"] }]);
  assert.deepEqual(report.columnsRemoved, [{ id: "orders", cols: ["amount"] }]);
});

test("bảng mới -> tạo stub, KHÔNG đụng relationships", () => {
  const collected = [
    {
      nguon_ref: { type: "postgres", source: "supabase", path: "public.customers" },
      ten: "customers",
      nguon: "Supabase",
      duong_dan: "supabase: public.customers",
      so_dong: 42,
      columns: [{ ten: "id", kieu: "uuid" }],
    },
  ];
  const { catalog, report } = mergeSchema(baseCatalog(), collected);
  assert.deepEqual(report.added, ["customers"]);
  const stub = catalog.datasets.find((d) => d.id === "customers");
  assert.equal(stub.chu_so_huu, "", "stub chờ người điền chủ sở hữu");
  assert.equal(stub.columns[0].khoa, "", "stub cột chưa gán khóa");
  assert.equal(catalog.relationships.length, 1, "relationships không đổi");
  // orders không có trong lần kéo này -> orphaned
  assert.deepEqual(report.orphaned, ["orders"]);
});

test("id stub không trùng id sẵn có", () => {
  const cat = baseCatalog();
  const collected = [
    {
      nguon_ref: { type: "sheets", source: "x", path: "s#Orders" },
      ten: "Orders", // trùng tên -> slug 'orders' đã dùng
      nguon: "Google Sheets",
      columns: [{ ten: "a", kieu: "" }],
    },
  ];
  const { catalog } = mergeSchema(cat, collected);
  const ids = catalog.datasets.map((d) => d.id);
  assert.equal(new Set(ids).size, ids.length, "id không trùng");
  assert.ok(ids.includes("orders_2"), "stub đổi thành orders_2");
});

test("refKey ổn định và phân biệt nguồn", () => {
  assert.equal(
    refKey({ type: "postgres", source: "supabase", path: "public.orders" }),
    "postgres:supabase:public.orders"
  );
  assert.equal(refKey(null), null);
});

test("slugify bỏ dấu tiếng Việt", () => {
  assert.equal(slugify("Tổng Hợp Đơn Vị"), "tong_hop_don_vi");
});

test("validator bắt from/to treo và id trùng", () => {
  const bad = {
    datasets: [
      { id: "a", ten: "A", nguon: "X", duong_dan: "p", trang_thai: "production", columns: [] },
      { id: "a", ten: "A2", nguon: "X", duong_dan: "p", trang_thai: "production", columns: [] },
    ],
    relationships: [{ id: "r1", from: "a", to: "ghost", loai: "x", mo_ta: "" }],
  };
  const { errors } = validateCatalog(bad);
  assert.ok(errors.some((e) => e.includes("id trùng")), "bắt id trùng");
  assert.ok(errors.some((e) => e.includes("ghost")), "bắt to treo");
});

console.log(`\n${passed} test PASS`);
