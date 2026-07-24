#!/usr/bin/env node
// Test bộ lọc dashboard: đọc URL, dựng WHERE, chống injection qua tên cột.
import assert from "node:assert/strict";
import { docLoc, whereBigQuery, coLoc, tomTatLoc } from "../src/lib/loc.ts";

let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log(`  ✓ ${name}`); };

const CHIEU = [
  { khoa: "tram", cot: "tram" },
  { khoa: "nhom", cot: "nhom_hang_cu" },
];

console.log("loc.test.mjs");

test("đọc ngày hợp lệ, bỏ ngày rác", () => {
  assert.equal(docLoc({ tu: "2026-01-01", den: "2026-07-19" }, CHIEU).tu, "2026-01-01");
  assert.equal(docLoc({ tu: "hôm qua" }, CHIEU).tu, undefined);
  assert.equal(docLoc({ den: "2026-13-99" }, CHIEU).den, "2026-13-99"); // regex chỉ chặn định dạng, không chặn giá trị vô lý — đủ cho tham số hoá
});

test("nhiều chọn ngăn bằng ~", () => {
  const loc = docLoc({ tram: "V52~V23", nhom: "Bia" }, CHIEU);
  assert.deepEqual(loc.chon.tram, ["V52", "V23"]);
  assert.deepEqual(loc.chon.nhom, ["Bia"]);
});

test("searchParams dạng mảng lấy phần tử đầu", () => {
  const loc = docLoc({ tram: ["V52~V23"] }, CHIEU);
  assert.deepEqual(loc.chon.tram, ["V52", "V23"]);
});

test("WHERE rỗng khi không lọc gì", () => {
  const { where, params } = whereBigQuery(docLoc({}, CHIEU), "ngay_thang", CHIEU);
  assert.equal(where, "");
  assert.deepEqual(params, {});
});

test("WHERE có ngày + nhiều chiều, tham số hoá đúng", () => {
  const loc = docLoc({ tu: "2026-01-01", den: "2026-07-19", tram: "V52~V23", nhom: "Bia" }, CHIEU);
  const { where, params } = whereBigQuery(loc, "ngay_thang", CHIEU);
  assert.ok(where.startsWith(" AND "));
  assert.ok(where.includes("ngay_thang >= @loc_tu"));
  assert.ok(where.includes("ngay_thang <= @loc_den"));
  assert.ok(where.includes("tram IN UNNEST(@loc_tram)"));
  assert.ok(where.includes("nhom_hang_cu IN UNNEST(@loc_nhom)"));
  assert.deepEqual(params, {
    loc_tu: "2026-01-01", loc_den: "2026-07-19",
    loc_tram: ["V52", "V23"], loc_nhom: ["Bia"],
  });
});

test("giá trị hiểm chỉ nằm trong params, không vào chuỗi WHERE", () => {
  const loc = docLoc({ tram: "'; DROP TABLE x; --" }, CHIEU);
  const { where, params } = whereBigQuery(loc, "ngay_thang", CHIEU);
  // Chuỗi WHERE chỉ chứa tên tham số, không chứa giá trị người dùng.
  assert.ok(!where.includes("DROP"));
  assert.ok(where.includes("tram IN UNNEST(@loc_tram)"));
  assert.deepEqual(params.loc_tram, ["'; DROP TABLE x; --"]);
});

test("coLoc phân biệt có/không lọc", () => {
  assert.equal(coLoc(docLoc({}, CHIEU)), false);
  assert.equal(coLoc(docLoc({ tu: "2026-01-01" }, CHIEU)), true);
  assert.equal(coLoc(docLoc({ tram: "V52" }, CHIEU)), true);
});

test("tomTatLoc thành câu đọc được", () => {
  const loc = docLoc({ tu: "2026-01-01", den: "2026-07-19", tram: "V52" }, CHIEU);
  const s = tomTatLoc(loc, { tram: "Trạm", nhom: "Nhóm" });
  assert.ok(s.includes("01/01/2026 → 19/07/2026"));
  assert.ok(s.includes("Trạm: V52"));
  assert.equal(tomTatLoc(docLoc({}, CHIEU), {}), "Toàn bộ");
});

console.log(`\n${passed} test đã pass.`);
