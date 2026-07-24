#!/usr/bin/env node
// Test suy kiểu và đổi giá trị ô Sheets. Đây là chỗ hỏng âm thầm nhất trong app:
// đoán sai dấu ngăn nghìn thì "280,000,000" thành 280 mà không có lỗi nào báo.
import assert from "node:assert/strict";
import { doiSo, doiNgay, suyKieu, tenCot, tachHeader, lenKeHoach } from "./lib/mart.mjs";

let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log(`  ✓ ${name}`); };

console.log("mart.test.mjs");

test("đọc được số cả kiểu Việt lẫn kiểu Mỹ", () => {
  assert.equal(doiSo(1234), 1234);
  assert.equal(doiSo("1.250.000"), 1250000);      // chấm ngăn nghìn (VN)
  assert.equal(doiSo("9,455,000"), 9455000);      // phẩy ngăn nghìn (US)
  assert.equal(doiSo("280,000,000"), 280000000);
  assert.equal(doiSo("550,000"), 550000);         // một dấu, nhóm đúng 3 chữ số
  assert.equal(doiSo("1.234"), 1234);
  assert.equal(doiSo("1,25"), 1.25);              // phẩy thập phân
  assert.equal(doiSo("1.25"), 1.25);              // chấm thập phân
  assert.equal(doiSo("0.025"), 0.025);            // nhóm đầu là 0 => không phải ngăn nghìn
  assert.equal(doiSo("1.234,5"), 1234.5);         // lẫn cả hai dấu
  assert.equal(doiSo("-2,5"), -2.5);
});

test("ô không phải số thì trả null, không trả 0", () => {
  // Quan trọng: null làm suyKieu hạ cột về text. Trả 0 sẽ nuốt mất dữ liệu.
  assert.equal(doiSo(""), null);
  assert.equal(doiSo("2.5%"), null);
  assert.equal(doiSo("V52SA1K04"), null);
  assert.equal(doiSo(null), null);
});

test("đọc được ngày ISO, ISO gạch chéo, và dd/mm/yyyy", () => {
  assert.equal(doiNgay("2026-04-28"), "2026-04-28");
  assert.equal(doiNgay("2026/05/13"), "2026-05-13");   // sheet để locale Mỹ
  assert.equal(doiNgay("13/5/2026"), "2026-05-13");
  assert.equal(doiNgay("32/1/2026"), null);
  assert.equal(doiNgay(""), null);
});

test("cột chỉ nhận numeric/date khi MỌI ô hợp lệ", () => {
  assert.equal(suyKieu(["1.000", "2.000", ""]), "numeric");
  assert.equal(suyKieu(["1.000", "n/a"]), "text");
  assert.equal(suyKieu(["2026-04-28", "13/5/2026"]), "date");
  assert.equal(suyKieu([]), "text");
  assert.equal(suyKieu(["2.5%", "15%"]), "text");
});

test("tên cột: bỏ dấu, không trùng, cột trống vẫn có tên", () => {
  assert.deepEqual(tenCot(["Mã cửa hàng", "%_duoi_moc", "", "Mã cửa hàng"]),
    ["ma_cua_hang", "duoi_moc", "cot_3", "ma_cua_hang_2"]);
});

test("tiêu đề là dòng có nội dung đầu tiên, không phải cứ dòng 1", () => {
  const { header, rows, boQua } = tachHeader([["", ""], ["a", "b"], ["1", "2"]]);
  assert.deepEqual(header, ["a", "b"]);
  assert.deepEqual(rows, [["1", "2"]]);
  assert.equal(boQua, 1);
});

test("kế hoạch bảng gộp đúng tên cột và kiểu", () => {
  const keHoach = lenKeHoach(["ngay", "doanh_thu"], [["2026-04-28", "9,455,000"]]);
  assert.deepEqual(keHoach.map((c) => [c.ten, c.kieu]), [["ngay", "date"], ["doanh_thu", "numeric"]]);
});

console.log(`${passed} test đạt\n`);
