#!/usr/bin/env node
import assert from "node:assert/strict";
import { dienGiaiDoanhThu } from "../src/lib/dien-giai.ts";
let passed = 0;
const test = (n, f) => { f(); passed++; console.log(`  ✓ ${n}`); };
console.log("dien-giai.test.mjs");

test("mảng rỗng → không sinh câu", () => {
  const g = dienGiaiDoanhThu("cửa hàng", [], 0, 0, "so tháng trước");
  assert.deepEqual(g, { diem_sang: [], canh_bao: [], kien_nghi: [] });
});

test("có tăng → điểm sáng + kiến nghị nhân rộng", () => {
  const muc = [
    { ten: "A", ky: 300, truoc: 200 },
    { ten: "B", ky: 100, truoc: 150 },
  ];
  const g = dienGiaiDoanhThu("cửa hàng", muc, 400, 350, "so tháng trước");
  assert.ok(g.diem_sang.some(s => s.includes("A")), "A phải là đầu tàu");
  assert.ok(g.canh_bao.some(s => s.includes("B")), "B giảm phải vào cảnh báo");
  assert.ok(g.kien_nghi.some(s => s.includes("A")), "kiến nghị nhân rộng A");
});

test("mục mất hẳn doanh thu → cảnh báo ngừng hoạt động", () => {
  const muc = [{ ten: "X", ky: 0, truoc: 500 }];
  const g = dienGiaiDoanhThu("quầy", muc, 0, 500, "so tháng trước");
  assert.ok(g.canh_bao.some(s => s.includes("X") && s.includes("không còn")));
});

test("tập trung cao → kiến nghị giảm rủi ro", () => {
  const muc = Array.from({length: 10}, (_, i) => ({ ten: "Q"+i, ky: i === 0 ? 900 : 10, truoc: 0 }));
  const g = dienGiaiDoanhThu("quầy", muc, 990, 0, "so kỳ trước");
  assert.ok(g.kien_nghi.some(s => s.includes("phụ thuộc")), "phải cảnh báo phụ thuộc ít quầy");
});

console.log(`\n${passed} test đã pass.`);
