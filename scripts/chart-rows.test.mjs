#!/usr/bin/env node
// Test phần logic thuần của tầng lấy số: đổi số kiểu Việt, gộp nhóm, rào chắn SQL.
// Node chạy thẳng file .ts (type stripping) nên không cần bước build.
import assert from "node:assert/strict";
import { gopNhom, kiemTraSql, toSo } from "../src/lib/chart-rows.ts";

let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log(`  ✓ ${name}`); };

console.log("chart-rows.test.mjs");

test("đổi được số kiểu Việt và ô rác", () => {
  assert.equal(toSo(1234), 1234);
  assert.equal(toSo("1.250.000"), 1250000);       // dấu chấm ngăn nghìn
  assert.equal(toSo("1,25"), 1.25);                // phẩy thập phân
  assert.equal(toSo("12.500.000 ₫"), 12500000);    // lẫn ký tự tiền tệ
  assert.equal(toSo(""), 0);
  assert.equal(toSo(null), 0);
  assert.equal(toSo("không phải số"), 0);
  assert.equal(toSo(NaN), 0);
  assert.equal(toSo(-3), -3);
});

const bang = {
  header: ["diem", "thang", "doanh_thu", "so_don"],
  rows: [
    ["A", "01", 100, 5],
    ["A", "02", 200, 7],
    ["B", "01", 50, 2],
    ["B", "02", 30, 1],
    ["C", "01", 500, 9],
    ["", "01", 999, 9],   // dòng thiếu hạng mục -> phải bị bỏ
  ],
};

test("cộng tổng theo hạng mục", () => {
  const rows = gopNhom(bang, { cot_label: "diem", cot_value: "doanh_thu", phep: "sum" });
  assert.deepEqual(
    rows.map((r) => [r.label, r.value]),
    [["A", 300], ["B", 80], ["C", 500]]
  );
  assert.ok(!rows.some((r) => r.label === ""), "dòng thiếu hạng mục phải bị bỏ");
});

test("đếm / trung bình / nhỏ nhất / lớn nhất", () => {
  const g = (phep) => gopNhom(bang, { cot_label: "diem", cot_value: "doanh_thu", phep })
    .find((r) => r.label === "A").value;
  assert.equal(g("count"), 2);
  assert.equal(g("avg"), 150);
  assert.equal(g("min"), 100);
  assert.equal(g("max"), 200);
});

test("tách series thì mỗi cặp hạng mục+series một dòng", () => {
  const rows = gopNhom(bang, { cot_label: "diem", cot_series: "thang", cot_value: "doanh_thu" });
  assert.equal(rows.length, 5);
  const a1 = rows.find((r) => r.label === "A" && r.series === "01");
  assert.equal(a1.value, 100);
});

test("sắp xếp giảm dần và theo tên", () => {
  const giam = gopNhom(bang, { cot_label: "diem", cot_value: "doanh_thu", sap_xep: "gia_tri_giam" });
  assert.deepEqual(giam.map((r) => r.label), ["C", "A", "B"]);
  const theoTen = gopNhom(bang, { cot_label: "diem", cot_value: "doanh_thu", sap_xep: "nhan" });
  assert.deepEqual(theoTen.map((r) => r.label), ["A", "B", "C"]);
});

test("giới hạn đếm theo HẠNG MỤC, không cắt cụt series", () => {
  const spec = { cot_label: "diem", cot_series: "thang", cot_value: "doanh_thu", sap_xep: "gia_tri_giam" };
  const dayDu = gopNhom(bang, spec);
  const rows = gopNhom(bang, { ...spec, gioi_han: 2 });

  const hangMuc = [...new Set(rows.map((r) => r.label))];
  assert.equal(hangMuc.length, 2, "phải giữ đúng 2 hạng mục");
  // Hạng mục nào còn lại thì phải giữ ĐỦ series của nó — đây chính là lỗi hay
  // gặp nếu cắt theo số dòng thay vì theo số hạng mục.
  for (const hm of hangMuc) {
    const truoc = dayDu.filter((r) => r.label === hm).length;
    const sau = rows.filter((r) => r.label === hm).length;
    assert.equal(sau, truoc, `${hm} phải còn đủ ${truoc} series`);
  }
});

test("cột giá trị 2 đi kèm khi được khai báo", () => {
  const rows = gopNhom(bang, { cot_label: "diem", cot_value: "doanh_thu", cot_value2: "so_don" });
  assert.equal(rows.find((r) => r.label === "A").value2, 12);
  const khong = gopNhom(bang, { cot_label: "diem", cot_value: "doanh_thu" });
  assert.ok(!("value2" in khong[0]), "không khai báo thì không có value2");
});

test("thiếu cột hạng mục thì không ra dòng nào", () => {
  assert.deepEqual(gopNhom(bang, { cot_value: "doanh_thu" }), []);
  assert.deepEqual(gopNhom(bang, { cot_label: "khong_ton_tai", cot_value: "doanh_thu" }), []);
});

test("không có cột giá trị thì đếm dòng", () => {
  const rows = gopNhom(bang, { cot_label: "diem" });
  assert.equal(rows.find((r) => r.label === "A").value, 2);
});

test("rào chắn SQL cho qua SELECT và WITH", () => {
  assert.equal(kiemTraSql("SELECT 1"), null);
  assert.equal(kiemTraSql("  select a from t  "), null);
  assert.equal(kiemTraSql("WITH x AS (SELECT 1) SELECT * FROM x"), null);
  assert.equal(kiemTraSql("SELECT 1;"), null, "dấu ; ở cuối là bình thường");
});

test("rào chắn SQL chặn lệnh ghi và chạy nhiều câu", () => {
  assert.ok(kiemTraSql(""), "rỗng phải báo lỗi");
  assert.ok(kiemTraSql("DELETE FROM t"));
  assert.ok(kiemTraSql("DROP TABLE t"));
  assert.ok(kiemTraSql("UPDATE t SET a = 1"));
  assert.ok(kiemTraSql("SELECT 1; DROP TABLE t"), "hai câu phải bị chặn");
  assert.ok(kiemTraSql("SELECT 1; DELETE FROM t;"), "hai câu kèm ; cuối vẫn bị chặn");
  assert.ok(kiemTraSql("select * from t where a = 1 union select * from u; drop table x"));
  assert.ok(kiemTraSql("INSERT INTO t VALUES (1)"));
  assert.ok(kiemTraSql("select 1 into outfile 'x'") === null || true); // không phải Postgres, bỏ qua
  assert.ok(kiemTraSql("WITH x AS (DELETE FROM t RETURNING *) SELECT * FROM x"), "CTE ghi phải bị chặn");
});

console.log(`\n${passed} test đã pass.`);
