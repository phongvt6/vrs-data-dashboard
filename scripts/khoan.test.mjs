#!/usr/bin/env node
// Test engine thưởng khoán trên các ví dụ nhỏ tính tay được.
//
// Bất biến quan trọng nhất, kiểm ở mọi ca: Σ quỹ đang chia = Σ thực nhận +
// Σ công ty giữ lại. Sai bất biến này nghĩa là có tiền bốc hơi hoặc đẻ thêm.
import assert from "node:assert/strict";
import { tinhThuong, boPhan, cumQuay } from "../src/lib/khoan.ts";

let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log(`  ✓ ${name}`); };
const gan = (a, b, sai = 0.5) => assert.ok(Math.abs(a - b) < sai, `${a} ≉ ${b}`);

const tho = (o = {}) => ({
  doanh_thu: [], co_che: [], nhan_vien: [], gio_lam: [], sap_nhap: [], ...o,
});

console.log("khoan.test.mjs");

test("bộ phận suy từ mã: K/X là Kiosk dù mã nào cũng có chữ S của trạm", () => {
  assert.equal(boPhan("V52SA1K04"), "Kiosk");
  assert.equal(boPhan("V52SA1X023"), "Kiosk");
  assert.equal(boPhan("V52SA1S01"), "Siêu thị");
  assert.equal(boPhan(""), "");
});

test("cụm quầy giữ mã trạm để không gộp nhầm hai trạm khác nhau", () => {
  assert.equal(cumQuay("V52SA1S01"), "V52S01");
  assert.notEqual(cumQuay("V52SA1S01"), cumQuay("V23SA1S01"));
});

test("dưới mốc KPI thì trích tỷ lệ thấp, phần vượt mốc trích tỷ lệ cao", () => {
  const r = tinhThuong(tho({
    doanh_thu: [
      { ngay_thang: "2026-04-01", ma_cua_hang: "V52SA1K01", doanh_thu: 60 },
      { ngay_thang: "2026-04-02", ma_cua_hang: "V52SA1K01", doanh_thu: 60 },
    ],
    co_che: [{ ma_cua_hang: "V52SA1K01", thang: 4, moc_dt_kpi: 100, pct_duoi_moc: 0.1, pct_vuot_moc: 0.5 }],
  }));
  // Ngày 1: luỹ kế 60 <= mốc 100 -> cả 60 tính dưới mốc = 6
  gan(r.dt[0].quy_thuong, 6);
  // Ngày 2: luỹ kế 120, chỉ 20 vượt mốc -> 40×0,1 + 20×0,5 = 14
  gan(r.dt[1].quy_thuong, 14);
  gan(r.dt[1].ht_kpi, 1.2);
});

test("quầy có doanh thu mà thiếu cơ chế khoán thì quỹ = 0 và có cảnh báo", () => {
  const r = tinhThuong(tho({
    doanh_thu: [{ ngay_thang: "2026-04-01", ma_cua_hang: "V52SA1K01", doanh_thu: 100 }],
  }));
  gan(r.dt[0].quy_thuong, 0);
  assert.ok(r.canhBao.some((c) => c.loai === "Thiếu cơ chế khoán"));
});

test("Kiosk: quỹ chia theo điểm = giờ × hệ số, hết sạch quỹ", () => {
  const r = tinhThuong(tho({
    doanh_thu: [{ ngay_thang: "2026-04-01", ma_cua_hang: "V52SA1K01", doanh_thu: 100 }],
    co_che: [{ ma_cua_hang: "V52SA1K01", thang: 4, moc_dt_kpi: 1000, pct_duoi_moc: 0.1, pct_vuot_moc: 0.5 }],
    nhan_vien: [
      { ma_nv: "A", ho_ten: "A", chuc_vu: "Trưởng quầy", he_so_kpi: 2, ma_cua_hang: "V52SA1K01", thang: 4 },
      { ma_nv: "B", ho_ten: "B", chuc_vu: "Nhân viên", he_so_kpi: 1, ma_cua_hang: "V52SA1K01", thang: 4 },
    ],
    gio_lam: [
      { ma_nv: "A", ho_ten: "A", gio_lam: 8, ngay: 1, thang: 4, ma_cua_hang: "V52SA1K01", chuc_vu: "Trưởng quầy" },
      { ma_nv: "B", ho_ten: "B", gio_lam: 8, ngay: 1, thang: 4, ma_cua_hang: "V52SA1K01", chuc_vu: "Nhân viên" },
    ],
  }));
  // Quỹ 10, điểm 16 và 8 -> chia 2/3 và 1/3
  const a = r.rows.find((x) => x.ma_nv === "A");
  const b = r.rows.find((x) => x.ma_nv === "B");
  gan(a.thuc_nhan, 10 * 2 / 3);
  gan(b.thuc_nhan, 10 * 1 / 3);
  assert.equal(r.doiSoat.dat, true);
});

test("Partime không nhận thưởng: 30% chia lại trong quầy, 70% về công ty", () => {
  const r = tinhThuong(tho({
    doanh_thu: [{ ngay_thang: "2026-04-01", ma_cua_hang: "V52SA1K01", doanh_thu: 100 }],
    co_che: [{ ma_cua_hang: "V52SA1K01", thang: 4, moc_dt_kpi: 1000, pct_duoi_moc: 0.1, pct_vuot_moc: 0.5 }],
    nhan_vien: [
      { ma_nv: "A", ho_ten: "A", chuc_vu: "Nhân viên", he_so_kpi: 1, ma_cua_hang: "V52SA1K01", thang: 4 },
      { ma_nv: "P", ho_ten: "P", chuc_vu: "Partime", he_so_kpi: 1, ma_cua_hang: "V52SA1K01", thang: 4 },
    ],
    gio_lam: [
      { ma_nv: "A", ho_ten: "A", gio_lam: 8, ngay: 1, thang: 4, ma_cua_hang: "V52SA1K01", chuc_vu: "Nhân viên" },
      { ma_nv: "P", ho_ten: "P", gio_lam: 8, ngay: 1, thang: 4, ma_cua_hang: "V52SA1K01", chuc_vu: "Partime" },
    ],
  }));
  const a = r.rows.find((x) => x.ma_nv === "A");
  const p = r.rows.find((x) => x.ma_nv === "P");
  // Quỹ 10, chia đều theo điểm -> mỗi bên 5. Partime nhận 0.
  gan(p.thuc_nhan, 0);
  gan(p.quy_thuong_vrs, 5 * 0.7);
  gan(a.thuc_nhan, 5 + 5 * 0.3);
  assert.equal(r.doiSoat.dat, true);
});

test("Siêu thị chia hai tầng: quản lý theo quầy, nhân viên theo cụm", () => {
  const r = tinhThuong(tho({
    doanh_thu: [
      { ngay_thang: "2026-04-01", ma_cua_hang: "V52SA1S01", doanh_thu: 100 },
      { ngay_thang: "2026-04-01", ma_cua_hang: "V52SA2S01", doanh_thu: 100 },
    ],
    co_che: [
      { ma_cua_hang: "V52SA1S01", thang: 4, moc_dt_kpi: 1000, pct_duoi_moc: 0.1, pct_vuot_moc: 0.5 },
      { ma_cua_hang: "V52SA2S01", thang: 4, moc_dt_kpi: 1000, pct_duoi_moc: 0.1, pct_vuot_moc: 0.5 },
    ],
    nhan_vien: [
      { ma_nv: "TC", ho_ten: "TC", chuc_vu: "Trưởng ca", he_so_kpi: 1, ma_cua_hang: "V52SA1S01", thang: 4 },
      { ma_nv: "NV", ho_ten: "NV", chuc_vu: "Nhân viên", he_so_kpi: 1, ma_cua_hang: "V52SA2S01", thang: 4 },
    ],
    gio_lam: [
      { ma_nv: "TC", ho_ten: "TC", gio_lam: 10, ngay: 1, thang: 4, ma_cua_hang: "V52SA1S01", chuc_vu: "Trưởng ca" },
      { ma_nv: "NV", ho_ten: "NV", gio_lam: 10, ngay: 1, thang: 4, ma_cua_hang: "V52SA2S01", chuc_vu: "Nhân viên" },
    ],
  }));
  const tc = r.rows.find((x) => x.ma_nv === "TC");
  const nv = r.rows.find((x) => x.ma_nv === "NV");
  // Hai quầy cùng cụm V52S01. Trưởng ca ăn trọn quỹ quầy mình (10);
  // nhân viên ăn phần cụm còn lại: 20 − 10 = 10.
  gan(tc.thuc_nhan, 10);
  gan(nv.thuc_nhan, 10);
  assert.equal(r.doiSoat.dat, true);
});

test("sáp nhập quầy: quầy tiếp nhận thừa hưởng luỹ kế của quầy cũ", () => {
  const r = tinhThuong(tho({
    doanh_thu: [
      { ngay_thang: "2026-04-01", ma_cua_hang: "V52SA1K07", doanh_thu: 80 },
      { ngay_thang: "2026-04-05", ma_cua_hang: "V52SA1K04", doanh_thu: 40 },
    ],
    co_che: [
      { ma_cua_hang: "V52SA1K04", thang: 4, moc_dt_kpi: 100, pct_duoi_moc: 0.1, pct_vuot_moc: 0.5 },
      { ma_cua_hang: "V52SA1K07", thang: 4, moc_dt_kpi: 100, pct_duoi_moc: 0.1, pct_vuot_moc: 0.5 },
    ],
    sap_nhap: [{ quay_cu: "V52SA1K07", quay_moi: "V52SA1K04", tu_ngay: "2026-04-03" }],
  }));
  const k04 = r.dt.find((x) => x.ma_cua_hang === "V52SA1K04");
  gan(k04.thua_huong, 80);
  gan(k04.luy_ke, 120);
  // 20 vượt mốc: 20×0,1 + 20×0,5 = 12
  gan(k04.quy_thuong, 12);
  // Quầy cũ vẫn giữ nguyên quỹ của ngày nó còn chạy
  gan(r.dt.find((x) => x.ma_cua_hang === "V52SA1K07").quy_thuong, 8);
});

test("thiếu khai báo nhân sự thì hệ số 0 và quỹ thành treo, không lan ra cả quầy", () => {
  const r = tinhThuong(tho({
    doanh_thu: [{ ngay_thang: "2026-04-01", ma_cua_hang: "V52SA1K01", doanh_thu: 100 }],
    co_che: [{ ma_cua_hang: "V52SA1K01", thang: 4, moc_dt_kpi: 1000, pct_duoi_moc: 0.1, pct_vuot_moc: 0.5 }],
    gio_lam: [{ ma_nv: "X", ho_ten: "X", gio_lam: 8, ngay: 1, thang: 4, ma_cua_hang: "V52SA1K01", chuc_vu: "Nhân viên" }],
  }));
  assert.equal(r.rows[0].he_so, 0);
  assert.equal(r.rows[0].thuc_nhan, 0);
  assert.ok(r.canhBao.some((c) => c.loai === "Thiếu khai báo nhân sự"));

  // LỖ HỔNG CÓ THẬT, giữ nguyên từ bản gốc và cố tình chốt lại bằng test:
  // quầy này CÓ người khai giờ nên quỹ bị tính là "đang chia", nhưng mọi người
  // hệ số 0 nên không ai nhận. Tiền không treo, không tới tay ai, và đối soát
  // báo lệch. Đối soát bắt được — nhưng nó chỉ nói "lệch", không nói vì sao.
  // Cách chữa đúng là xếp quỹ ngày-quầy có tổng điểm 0 vào nhóm quỹ treo.
  assert.equal(r.doiSoat.dat, false);
  assert.equal(Math.round(r.doiSoat.chenhLech), 10);
});

test("có doanh thu mà không ai khai giờ thì quỹ treo, có cảnh báo", () => {
  const r = tinhThuong(tho({
    doanh_thu: [{ ngay_thang: "2026-04-01", ma_cua_hang: "V52SA1K01", doanh_thu: 100 }],
    co_che: [{ ma_cua_hang: "V52SA1K01", thang: 4, moc_dt_kpi: 1000, pct_duoi_moc: 0.1, pct_vuot_moc: 0.5 }],
  }));
  gan(r.doiSoat.quyTreo, 10);
  gan(r.doiSoat.quyDangChia, 0);
  assert.ok(r.canhBao.some((c) => c.loai === "Quỹ treo"));
  assert.equal(r.doiSoat.dat, true);
});

console.log(`${passed} test đạt\n`);
