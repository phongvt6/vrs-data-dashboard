"use client";

import { useMemo, useState } from "react";
import ChartTile from "@/chart/ChartTile";
import { tinhThuong, type DuLieuTho, type KetQua, type NgayQuay, type NgayNguoi } from "@/lib/khoan";
import { Luoi, O } from "../_components/BangKhung";

// App khoán native. Nhận DỮ LIỆU THÔ từ server, tự chạy engine (một lần, client),
// lọc theo kỳ + chiều rồi vẽ bằng thư viện chart của app. Mỗi "trang" là một
// component — bám sát bản gốc nhưng trình bày trên design system.

const vnd = (n: number) => Math.round(n).toLocaleString("vi-VN") + " đ";
const pc = (n: number) => (n * 100).toFixed(1).replace(".", ",") + "%";
const gioF = (n: number) => n.toLocaleString("vi-VN", { maximumFractionDigits: 1 }) + "h";
const dmy = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const mono = { fontFamily: "var(--mono, ui-monospace, monospace)", fontSize: 12.5 } as const;
const TIEN = { dinh_dang: "tien" as const };

type Trang = "dash" | "report" | "bang" | "kiosk" | "st" | "gio" | "check" | "data" | "guide";

const NAV: { id: Trang; ic: string; lb: string }[] = [
  { id: "dash", ic: "📊", lb: "Dashboard" },
  { id: "report", ic: "📈", lb: "Báo cáo & Thống kê" },
  { id: "bang", ic: "🧮", lb: "Bảng tính thưởng" },
  { id: "kiosk", ic: "🏪", lb: "Kiosk" },
  { id: "st", ic: "🛒", lb: "Siêu thị" },
  { id: "gio", ic: "⏱️", lb: "Tra cứu giờ làm" },
  { id: "check", ic: "✅", lb: "Kiểm tra" },
  { id: "data", ic: "🗂️", lb: "Danh sách data" },
  { id: "guide", ic: "❓", lb: "Hướng dẫn" },
];

function tong<T>(rows: T[], f: (r: T) => number): number {
  return rows.reduce((s, r) => s + f(r), 0);
}
function nhom<T>(rows: T[], f: (r: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const r of rows) {
    const k = f(r);
    const cur = m.get(k);
    if (cur) cur.push(r);
    else m.set(k, [r]);
  }
  return m;
}
/** Gộp rows theo nhân viên trong kỳ đang lọc. */
function theoNv(R: NgayNguoi[]) {
  return [...nhom(R, (r) => r.ma_nv)]
    .map(([ma, v]) => ({
      ma, ho_ten: v[0].ho_ten, chuc_vu: v[0].chuc_vu, cv: v[0].cv,
      ma_cua_hang: v[0].ma_cua_hang, bo_phan: v[0].bo_phan, cum: v[0].cum, tram: v[0].tram,
      gio: tong(v, (x) => x.gio_lam), diem: tong(v, (x) => x.diem),
      thuong_nv: tong(v, (x) => x.thuong_nv), thuong_pt30: tong(v, (x) => x.thuong_pt30),
      thuc_nhan: tong(v, (x) => x.thuc_nhan),
    }))
    .sort((a, b) => b.thuc_nhan - a.thuc_nhan);
}

export default function KhoanApp({ raw }: { raw: DuLieuTho }) {
  const data: KetQua = useMemo(() => tinhThuong(raw), [raw]);
  const kyCo = useMemo(() => [...new Set(data.dt.map((r) => r.nam_thang))].sort(), [data]);
  const [trang, setTrang] = useState<Trang>("dash");
  const [ky, setKy] = useState<string>(kyCo[kyCo.length - 1] ?? "");
  const [thuGon, setThuGon] = useState(false);

  const soCanhBao = data.canhBao.filter((c) => !c.ngay || c.ngay.slice(0, 7).replace("-", "/") === ky).length;

  return (
    <div style={{ display: "grid", gridTemplateColumns: `${thuGon ? 52 : 212}px 1fr`, gap: 16, alignItems: "start", transition: "grid-template-columns .18s" }}>
      <nav style={{
        position: "sticky", top: 84, display: "flex", flexDirection: "column", gap: 2,
        background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 12, padding: 8,
      }}>
        <button onClick={() => setThuGon((v) => !v)} title={thuGon ? "Mở rộng" : "Thu gọn"} style={{
          display: "flex", alignItems: "center", justifyContent: thuGon ? "center" : "flex-end", gap: 6,
          padding: "6px 9px", marginBottom: 4, borderRadius: 8, border: "none", cursor: "pointer",
          background: "transparent", color: "var(--ink-soft)", fontSize: 13,
        }}>{thuGon ? "»" : "« Thu gọn"}</button>

        {NAV.map((n) => {
          const on = n.id === trang;
          return (
            <button key={n.id} onClick={() => setTrang(n.id)} title={thuGon ? n.lb : undefined} style={{
              display: "flex", alignItems: "center", gap: 9, padding: "8px 11px", borderRadius: 8,
              border: "none", cursor: "pointer", textAlign: "left", fontSize: 13.5, whiteSpace: "nowrap",
              justifyContent: thuGon ? "center" : "flex-start",
              fontWeight: on ? 600 : 400,
              background: on ? "var(--accent)" : "transparent",
              color: on ? "#fff" : "var(--ink-soft)",
            }}>
              <span style={{ fontSize: 15 }}>{n.ic}</span>
              {!thuGon && <span style={{ flex: 1 }}>{n.lb}</span>}
              {!thuGon && n.id === "check" && soCanhBao > 0 && (
                <span style={{ fontSize: 11, fontWeight: 700, background: on ? "rgba(255,255,255,.25)" : "#d03b3b", color: "#fff", borderRadius: 99, padding: "1px 7px" }}>{soCanhBao}</span>
              )}
            </button>
          );
        })}

        {/* Bảng thi đua là trang cổ vũ, không phải phân tích — link ra bản gốc
            (port của team kinh doanh) ở /bang/thuong-khoan-cu. */}
        <a href="/bang/thuong-khoan-cu" target="_blank" rel="noopener" title="Bảng thi đua (bản gốc)" style={{
          display: "flex", alignItems: "center", gap: 9, padding: "8px 11px", borderRadius: 8,
          textDecoration: "none", fontSize: 13.5, whiteSpace: "nowrap", color: "var(--ink-soft)",
          justifyContent: thuGon ? "center" : "flex-start",
        }}>
          <span style={{ fontSize: 15 }}>🏆</span>
          {!thuGon && <span style={{ flex: 1 }}>Bảng thi đua ↗</span>}
        </a>
      </nav>

      <div style={{ minWidth: 0 }}>
        {trang !== "guide" && <ChonKy kyCo={kyCo} ky={ky} onChon={setKy} />}
        {trang === "dash" && <Dashboard data={data} ky={ky} />}
        {trang === "report" && <BaoCao data={data} ky={ky} kyCo={kyCo} />}
        {trang === "bang" && <BangTinh data={data} ky={ky} />}
        {trang === "kiosk" && <TheoBoPhan data={data} ky={ky} boPhan="Kiosk" />}
        {trang === "st" && <TheoBoPhan data={data} ky={ky} boPhan="Siêu thị" />}
        {trang === "gio" && <GioLam data={data} ky={ky} />}
        {trang === "check" && <KiemTra data={data} ky={ky} />}
        {trang === "data" && <DanhSachData raw={raw} />}
        {trang === "guide" && <HuongDan />}
      </div>
    </div>
  );
}

function ChonKy({ kyCo, ky, onChon }: { kyCo: string[]; ky: string; onChon: (k: string) => void }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
      <span style={{ fontSize: 12.5, color: "var(--ink-soft)", fontWeight: 600 }}>Kỳ khoán</span>
      {kyCo.map((k) => (
        <button key={k} onClick={() => onChon(k)} style={{
          fontSize: 13, padding: "5px 12px", borderRadius: 7, cursor: "pointer",
          border: "1px solid var(--line-strong)",
          background: k === ky ? "var(--accent)" : "var(--panel)",
          color: k === ky ? "#fff" : "var(--ink-soft)", fontWeight: k === ky ? 600 : 400,
        }}>{k.replace("/", " · tháng ")}</button>
      ))}
    </div>
  );
}

// ---- Dashboard ----
function Dashboard({ data, ky }: { data: KetQua; ky: string }) {
  const D = data.dt.filter((r) => r.nam_thang === ky);
  const R = data.rows.filter((r) => r.nam_thang === ky);

  const dtTong = tong(D, (r) => r.doanh_thu);
  const quy = tong(D, (r) => r.quy_thuong);
  const thucNhan = tong(R, (r) => r.thuc_nhan);
  const vrs = tong(R, (r) => r.quy_thuong_vrs);
  const soNv = new Set(R.filter((r) => r.thuc_nhan > 0).map((r) => r.ma_nv)).size;

  const theoNgay = [...nhom(D, (r) => r.ngay)]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([ngay, v]) => ({ ngay, dt: tong(v, (x) => x.doanh_thu), quy: tong(v, (x) => x.quy_thuong) }));
  const theoQuay = [...nhom(D, (r) => r.ma_cua_hang)]
    .map(([ma, v]) => ({ ma, quy: tong(v, (x) => x.quy_thuong) }))
    .sort((a, b) => b.quy - a.quy);
  const quyCuaQuay = new Map(theoQuay.map((q) => [q.ma, q.quy]));

  const cuoiCung = new Map<string, NgayQuay>();
  for (const r of D) { const p = cuoiCung.get(r.ma_cua_hang); if (!p || r.ngay > p.ngay) cuoiCung.set(r.ma_cua_hang, r); }
  const tienDoKpi = [...cuoiCung.values()].sort((a, b) => b.ht_kpi - a.ht_kpi);

  const top = theoNv(R.filter((r) => r.thuc_nhan > 0)).slice(0, 15);
  const theoChucDanh = [...nhom(R.filter((r) => r.thuc_nhan > 0), (r) => r.chuc_vu || "(không rõ)")]
    .map(([cv, v]) => ({ label: cv, value: tong(v, (x) => x.thuc_nhan) })).sort((a, b) => b.value - a.value);

  return (
    <>
      <Luoi>
        <O w={2}><ChartTile loai="stat-tile" config={TIEN} rows={[{ label: "Doanh thu", value: dtTong }]} /></O>
        <O w={2} ghi_chu={dtTong ? `${pc(quy / dtTong)} doanh thu` : undefined}><ChartTile loai="stat-tile" config={TIEN} rows={[{ label: "Quỹ thưởng", value: quy }]} /></O>
        <O w={3} ghi_chu={`${soNv} người có thưởng`}><ChartTile loai="stat-tile" config={TIEN} rows={[{ label: "Nhân viên thực nhận", value: thucNhan }]} /></O>
        <O w={3} ghi_chu={quy ? `${pc(vrs / quy)} quỹ — phần 70% của Partime` : undefined}><ChartTile loai="stat-tile" config={TIEN} rows={[{ label: "Công ty giữ lại", value: vrs }]} /></O>
        <O w={2}><ChartTile loai="stat-tile" config={TIEN} rows={[{ label: "Bình quân / người", value: soNv ? thucNhan / soNv : 0 }]} /></O>
      </Luoi>
      <Luoi>
        <O w={6} tieu_de="Doanh thu theo ngày"><ChartTile loai="area" config={TIEN} height={230} rows={theoNgay.map((r) => ({ label: dmy(r.ngay), value: r.dt }))} /></O>
        <O w={6} tieu_de="Quỹ thưởng theo ngày" ghi_chu="Cùng trục thời gian với chart bên trái. Quỹ nhảy bậc vào ngày quầy vượt mốc KPI — từ đó phần vượt trích 15% thay vì 2,5%."><ChartTile loai="area" config={TIEN} height={230} rows={theoNgay.map((r) => ({ label: dmy(r.ngay), value: r.quy }))} /></O>
      </Luoi>
      <Luoi>
        <O w={7} tieu_de="Tiến độ hoàn thành KPI" ghi_chu={`${tienDoKpi.length} quầy có doanh thu trong kỳ`}>
          <Bang cot={["Mã cửa hàng", "Bộ phận", "Luỹ kế", "Mốc KPI", "% hoàn thành", "Còn thiếu", "Quỹ thưởng"]} phai={[2, 3, 4, 5, 6]} cao={420}
            dong={tienDoKpi.map((r) => [
              <span key="m" style={mono}>{r.ma_cua_hang}</span>, r.bo_phan, vnd(r.luy_ke),
              r.moc ? vnd(r.moc) : <span key="x" style={{ color: "#b5423a" }}>chưa có</span>,
              <ThanhKpi key="p" ht={r.ht_kpi} />,
              r.ht_kpi >= 1 ? <span key="v" style={{ color: "#1e7145", fontWeight: 600 }}>đã vượt mốc</span> : vnd(r.moc - r.luy_ke),
              vnd(quyCuaQuay.get(r.ma_cua_hang) ?? 0),
            ])} />
        </O>
        <O w={5} tieu_de="Quỹ thưởng theo quầy" ghi_chu="14 quầy sinh quỹ lớn nhất trong kỳ"><ChartTile loai="bar" config={TIEN} height={420} rows={theoQuay.slice(0, 14).map((q) => ({ label: q.ma, value: q.quy }))} /></O>
      </Luoi>
      <Luoi>
        <O w={7} tieu_de="Top 15 nhân viên theo thực nhận">
          <Bang cot={["Mã NV", "Họ tên", "Chức danh", "Quầy", "Giờ", "Thực nhận"]} phai={[4, 5]}
            dong={top.map((r) => [<span key="m" style={mono}>{r.ma}</span>, r.ho_ten || "—", r.chuc_vu || "—", <span key="q" style={mono}>{r.ma_cua_hang}</span>, gioF(r.gio), <b key="t">{vnd(r.thuc_nhan)}</b>])} />
        </O>
        <O w={5} tieu_de="Phân bổ theo chức danh" ghi_chu="Tổng thực nhận, đã loại Partime (không nhận thưởng)"><ChartTile loai="donut" config={TIEN} rows={theoChucDanh} height={300} /></O>
      </Luoi>
    </>
  );
}

// ---- Báo cáo & Thống kê: so kỳ này với kỳ trước ----
function BaoCao({ data, ky, kyCo }: { data: KetQua; ky: string; kyCo: string[] }) {
  const idx = kyCo.indexOf(ky);
  const kyTruoc = idx > 0 ? kyCo[idx - 1] : null;
  const dtKy = data.dt.filter((r) => r.nam_thang === ky);
  const dtTruoc = kyTruoc ? data.dt.filter((r) => r.nam_thang === kyTruoc) : [];
  const rKy = data.rows.filter((r) => r.nam_thang === ky);
  const rTruoc = kyTruoc ? data.rows.filter((r) => r.nam_thang === kyTruoc) : [];

  const kpi = (dt: NgayQuay[], r: NgayNguoi[]) => ({
    doanh_thu: tong(dt, (x) => x.doanh_thu), quy: tong(dt, (x) => x.quy_thuong),
    thuc_nhan: tong(r, (x) => x.thuc_nhan),
  });
  const a = kpi(dtKy, rKy), b = kpi(dtTruoc, rTruoc);
  const cmp = (cur: number, prev: number) => ({ value: cur, ...(prev ? { value2: prev } : {}) });

  const theoNgay = [...nhom(dtKy, (r) => r.ngay)].sort((x, y) => x[0].localeCompare(y[0]))
    .map(([ngay, v]) => ({ label: dmy(ngay), value: tong(v, (x) => x.quy_thuong) }));
  const soSanhQuay = [...nhom(dtKy, (r) => r.ma_cua_hang)].map(([ma, v]) => {
    const cur = tong(v, (x) => x.quy_thuong);
    const prev = tong(dtTruoc.filter((x) => x.ma_cua_hang === ma), (x) => x.quy_thuong);
    return { ma, cur, prev, de: cur - prev };
  }).sort((x, y) => y.cur - x.cur);

  return (
    <>
      <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 10 }}>
        So kỳ <b>{ky}</b> {kyTruoc ? <>với kỳ trước <b>{kyTruoc}</b></> : "(không có kỳ trước để so)"}.
      </div>
      <Luoi>
        <O w={4} ghi_chu="so kỳ trước"><ChartTile loai="stat-tile" config={TIEN} rows={[{ label: "Doanh thu", ...cmp(a.doanh_thu, b.doanh_thu) }]} /></O>
        <O w={4} ghi_chu="so kỳ trước"><ChartTile loai="stat-tile" config={TIEN} rows={[{ label: "Quỹ thưởng", ...cmp(a.quy, b.quy) }]} /></O>
        <O w={4} ghi_chu="so kỳ trước"><ChartTile loai="stat-tile" config={TIEN} rows={[{ label: "Thực nhận", ...cmp(a.thuc_nhan, b.thuc_nhan) }]} /></O>
      </Luoi>
      <Luoi>
        <O w={12} tieu_de="Quỹ thưởng theo ngày"><ChartTile loai="area" config={TIEN} height={260} rows={theoNgay} /></O>
      </Luoi>
      <Luoi>
        <O w={12} tieu_de="So sánh quỹ theo quầy" ghi_chu={kyTruoc ? "Chênh so kỳ trước" : "Kỳ này"}>
          <Bang cot={["Mã cửa hàng", "Kỳ này", "Kỳ trước", "Chênh"]} phai={[1, 2, 3]} cao={460}
            dong={soSanhQuay.map((r) => [<span key="m" style={mono}>{r.ma}</span>, vnd(r.cur), r.prev ? vnd(r.prev) : "—",
              <span key="d" style={{ color: r.de >= 0 ? "#1e7145" : "#b5423a" }}>{r.de >= 0 ? "+" : ""}{vnd(r.de)}</span>])} />
        </O>
      </Luoi>
    </>
  );
}

// ---- Bảng tính thưởng: chi tiết theo nhân viên (đã loại Partime) ----
function BangTinh({ data, ky }: { data: KetQua; ky: string }) {
  const R = data.rows.filter((r) => r.nam_thang === ky && r.cv !== "partime");
  const list = theoNv(R);
  const tongThucNhan = tong(list, (r) => r.thuc_nhan);
  return (
    <>
      <Luoi>
        <O w={4}><ChartTile loai="stat-tile" config={TIEN} rows={[{ label: "Tổng thực nhận (không kể Partime)", value: tongThucNhan }]} /></O>
        <O w={4}><ChartTile loai="stat-tile" config={{ dinh_dang: "so", don_vi: "người" }} rows={[{ label: "Số nhân viên", value: list.length }]} /></O>
        <O w={4}><ChartTile loai="stat-tile" config={TIEN} rows={[{ label: "Bình quân / người", value: list.length ? tongThucNhan / list.length : 0 }]} /></O>
      </Luoi>
      <Luoi>
        <O w={12} tieu_de="Danh sách thưởng chi tiết" ghi_chu={`${list.length} nhân viên · đã loại Partime (không nhận thưởng)`}>
          <Bang cot={["Mã NV", "Họ tên", "Chức danh", "Bộ phận", "Quầy", "Giờ", "Điểm", "Thưởng quầy/cụm", "Phần 30% PT", "Thực nhận"]} phai={[5, 6, 7, 8, 9]} cao={560}
            dong={list.map((r) => [
              <span key="m" style={mono}>{r.ma}</span>, r.ho_ten || "—", r.chuc_vu || "—", r.bo_phan,
              <span key="q" style={mono}>{r.ma_cua_hang}</span>, gioF(r.gio),
              r.diem.toLocaleString("vi-VN", { maximumFractionDigits: 1 }),
              vnd(r.thuong_nv), vnd(r.thuong_pt30), <b key="t">{vnd(r.thuc_nhan)}</b>,
            ])} />
        </O>
      </Luoi>
    </>
  );
}

// ---- Kiosk / Siêu thị: cùng khuôn, lọc theo bộ phận ----
function TheoBoPhan({ data, ky, boPhan }: { data: KetQua; ky: string; boPhan: string }) {
  const D = data.dt.filter((r) => r.nam_thang === ky && r.bo_phan === boPhan);
  const R = data.rows.filter((r) => r.nam_thang === ky && r.bo_phan === boPhan);
  const quy = tong(D, (r) => r.quy_thuong);
  const thucNhan = tong(R, (r) => r.thuc_nhan);
  const soNv = new Set(R.filter((r) => r.thuc_nhan > 0).map((r) => r.ma_nv)).size;

  const theoQuay = [...nhom(D, (r) => r.ma_cua_hang)]
    .map(([ma, v]) => ({ ma, dt: tong(v, (x) => x.doanh_thu), quy: tong(v, (x) => x.quy_thuong) }))
    .sort((a, b) => b.quy - a.quy);
  const nv = theoNv(R.filter((r) => r.thuc_nhan > 0)).slice(0, 200);

  return (
    <>
      <Luoi>
        <O w={4}><ChartTile loai="stat-tile" config={TIEN} rows={[{ label: `Quỹ thưởng ${boPhan}`, value: quy }]} /></O>
        <O w={4} ghi_chu={`${soNv} người có thưởng`}><ChartTile loai="stat-tile" config={TIEN} rows={[{ label: "Thực nhận", value: thucNhan }]} /></O>
        <O w={4}><ChartTile loai="stat-tile" config={{ dinh_dang: "so", don_vi: "quầy" }} rows={[{ label: "Số quầy", value: theoQuay.length }]} /></O>
      </Luoi>
      <Luoi>
        <O w={5} tieu_de={`Quỹ thưởng theo quầy ${boPhan}`}><ChartTile loai="bar" config={TIEN} height={360} rows={theoQuay.slice(0, 16).map((q) => ({ label: q.ma, value: q.quy }))} /></O>
        <O w={7} tieu_de="Nhân viên & thực nhận">
          <Bang cot={["Mã NV", "Họ tên", "Chức danh", "Quầy", "Giờ", "Thực nhận"]} phai={[4, 5]} cao={360}
            dong={nv.map((r) => [<span key="m" style={mono}>{r.ma}</span>, r.ho_ten || "—", r.chuc_vu || "—", <span key="q" style={mono}>{r.ma_cua_hang}</span>, gioF(r.gio), <b key="t">{vnd(r.thuc_nhan)}</b>])} />
        </O>
      </Luoi>
    </>
  );
}

// ---- Tra cứu giờ làm ----
function GioLam({ data, ky }: { data: KetQua; ky: string }) {
  const R = data.rows.filter((r) => r.nam_thang === ky);
  const nv = [...nhom(R, (r) => r.ma_nv)]
    .map(([ma, v]) => ({
      ma, ho_ten: v[0].ho_ten, chuc_vu: v[0].chuc_vu, ma_cua_hang: v[0].ma_cua_hang,
      so_ngay: new Set(v.map((x) => x.ngay)).size, gio: tong(v, (x) => x.gio_lam),
      thieu: v.some((x) => x.thieu_khai_bao),
    }))
    .sort((a, b) => b.gio - a.gio);
  const tongGio = tong(nv, (r) => r.gio);
  return (
    <>
      <Luoi>
        <O w={4}><ChartTile loai="stat-tile" config={{ dinh_dang: "so", don_vi: "giờ" }} rows={[{ label: "Tổng giờ khai", value: tongGio }]} /></O>
        <O w={4}><ChartTile loai="stat-tile" config={{ dinh_dang: "so", don_vi: "người" }} rows={[{ label: "Số nhân viên", value: nv.length }]} /></O>
        <O w={4}><ChartTile loai="stat-tile" config={{ dinh_dang: "so", don_vi: "giờ" }} rows={[{ label: "Bình quân / người", value: nv.length ? tongGio / nv.length : 0 }]} /></O>
      </Luoi>
      <Luoi>
        <O w={12} tieu_de="Giờ làm theo nhân viên" ghi_chu="Tổng giờ khai trong kỳ; ⚠ = thiếu khai báo nhân sự (hệ số 0)">
          <Bang cot={["Mã NV", "Họ tên", "Chức danh", "Quầy", "Số ngày", "Tổng giờ"]} phai={[4, 5]} cao={560}
            dong={nv.map((r) => [
              <span key="m" style={mono}>{r.thieu ? "⚠ " : ""}{r.ma}</span>, r.ho_ten || "—", r.chuc_vu || "—",
              <span key="q" style={mono}>{r.ma_cua_hang}</span>, String(r.so_ngay), <b key="g">{gioF(r.gio)}</b>,
            ])} />
        </O>
      </Luoi>
    </>
  );
}

// ---- Kiểm tra (đối soát) ----
function KiemTra({ data, ky }: { data: KetQua; ky: string }) {
  const { doiSoat, canhBao } = data;
  const canhBaoKy = canhBao.filter((c) => !c.ngay || c.ngay.slice(0, 7).replace("-", "/") === ky);
  const loaiCanhBao = [...nhom(canhBaoKy, (c) => c.loai)].map(([loai, v]) => ({ loai, n: v.length })).sort((a, b) => b.n - a.n);
  return (
    <>
      <div style={{
        background: doiSoat.dat ? "rgba(30,113,69,.08)" : "rgba(181,66,58,.08)",
        border: `1px solid ${doiSoat.dat ? "#1e7145" : "#b5423a"}`, borderRadius: 10, padding: "12px 16px",
        marginBottom: 12, fontSize: 13.5, fontWeight: 600, color: doiSoat.dat ? "#1e7145" : "#b5423a",
      }}>{doiSoat.dat ? "✓ ĐỐI SOÁT ĐẠT — chênh lệch 0 đ (trong ngưỡng làm tròn)" : `✗ ĐỐI SOÁT LỆCH — chênh ${vnd(doiSoat.chenhLech)}`}</div>
      <Luoi>
        <O w={7} tieu_de="Đối soát quỹ thưởng" ghi_chu="Bất biến: mọi đồng quỹ đang chia phải đi đúng một trong hai chỗ — vào tay nhân viên, hoặc về công ty (70% phần Partime). Lệch khác 0 là engine hỏng.">
          <Bang cot={["Khoản", "Số tiền"]} phai={[1]} dong={[
            ["Quỹ phát sinh (toàn kỳ, mọi quầy)", vnd(doiSoat.quyPhatSinh)],
            ["— trong đó đang chia được", vnd(doiSoat.quyDangChia)],
            ["— quỹ treo (không ai khai giờ)", vnd(doiSoat.quyTreo)],
            ["Nhân viên thực nhận", vnd(doiSoat.tongThucNhan)],
            ["Công ty giữ lại (70% Partime)", vnd(doiSoat.tongVrs)],
            [<b key="c">Chênh lệch</b>, <b key="v" style={{ color: doiSoat.dat ? "#1e7145" : "#b5423a" }}>{doiSoat.dat ? "0 đ — khớp" : vnd(doiSoat.chenhLech)}</b>],
          ]} />
        </O>
        <O w={5} tieu_de="Cảnh báo dữ liệu trong kỳ" ghi_chu="Engine không tự sửa dữ liệu hỏng, chỉ nêu ra — số sai mà im lặng nguy hiểm hơn nhiều.">
          {loaiCanhBao.length ? <Bang cot={["Loại", "Số lần"]} phai={[1]} dong={loaiCanhBao.map((c) => [c.loai, String(c.n)])} /> : <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>Không có cảnh báo nào trong kỳ này.</p>}
        </O>
      </Luoi>
      <Luoi>
        <O w={12} tieu_de="Chi tiết quỹ treo theo quầy" ghi_chu="Quầy có doanh thu nhưng không ai khai giờ → quỹ không đến tay ai">
          {doiSoat.treoChiTiet.length ? <Bang cot={["Mã cửa hàng", "Số ngày", "Quỹ treo"]} phai={[1, 2]} cao={320} dong={doiSoat.treoChiTiet.map((t) => [<span key="m" style={mono}>{t.ma_cua_hang}</span>, String(t.so_ngay), vnd(t.quy)])} /> : <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>Không có quỹ treo.</p>}
        </O>
      </Luoi>
    </>
  );
}

// ---- Danh sách data: 5 bảng thô ----
function DanhSachData({ raw }: { raw: DuLieuTho }) {
  const [tab, setTab] = useState<"nv" | "cc" | "dt" | "gl" | "sn">("nv");
  const tabs = [
    { id: "nv" as const, lb: `Nhân viên (${raw.nhan_vien.length})` },
    { id: "cc" as const, lb: `Cơ chế khoán (${raw.co_che.length})` },
    { id: "dt" as const, lb: `Doanh thu (${raw.doanh_thu.length})` },
    { id: "gl" as const, lb: `Giờ làm (${raw.gio_lam.length})` },
    { id: "sn" as const, lb: `Sáp nhập (${raw.sap_nhap.length})` },
  ];
  return (
    <>
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            fontSize: 13, padding: "5px 12px", borderRadius: 7, cursor: "pointer", border: "1px solid var(--line-strong)",
            background: t.id === tab ? "var(--accent)" : "var(--panel)", color: t.id === tab ? "#fff" : "var(--ink-soft)", fontWeight: t.id === tab ? 600 : 400,
          }}>{t.lb}</button>
        ))}
      </div>
      <Luoi>
        <O w={12} tieu_de="Dữ liệu gốc" ghi_chu="Số thô đúng như trong Google Sheet đã sync về (tối đa 500 dòng đầu)">
          {tab === "nv" && <Bang cot={["Mã NV", "Họ tên", "Chức vụ", "Hệ số KPI", "Quầy", "Tháng"]} phai={[3, 5]} cao={560}
            dong={raw.nhan_vien.slice(0, 500).map((r) => [<span key="m" style={mono}>{r.ma_nv}</span>, r.ho_ten, r.chuc_vu, String(r.he_so_kpi), <span key="q" style={mono}>{r.ma_cua_hang}</span>, String(r.thang)])} />}
          {tab === "cc" && <Bang cot={["Quầy", "Tháng", "Mốc KPI", "% dưới mốc", "% vượt mốc"]} phai={[1, 2, 3, 4]} cao={560}
            dong={raw.co_che.slice(0, 500).map((r) => [<span key="q" style={mono}>{r.ma_cua_hang}</span>, String(r.thang), vnd(r.moc_dt_kpi), pc(r.pct_duoi_moc), pc(r.pct_vuot_moc)])} />}
          {tab === "dt" && <Bang cot={["Ngày", "Quầy", "Doanh thu"]} phai={[2]} cao={560}
            dong={raw.doanh_thu.slice(0, 500).map((r) => [dmy(r.ngay_thang), <span key="q" style={mono}>{r.ma_cua_hang}</span>, vnd(r.doanh_thu)])} />}
          {tab === "gl" && <Bang cot={["Mã NV", "Họ tên", "Ngày", "Tháng", "Quầy", "Chức vụ", "Giờ"]} phai={[2, 3, 6]} cao={560}
            dong={raw.gio_lam.slice(0, 500).map((r) => [<span key="m" style={mono}>{r.ma_nv}</span>, r.ho_ten, String(r.ngay), String(r.thang), <span key="q" style={mono}>{r.ma_cua_hang}</span>, r.chuc_vu, gioF(r.gio_lam)])} />}
          {tab === "sn" && <Bang cot={["Quầy cũ", "Quầy mới", "Từ ngày"]} dong={raw.sap_nhap.map((r) => [<span key="a" style={mono}>{r.quay_cu}</span>, <span key="b" style={mono}>{r.quay_moi}</span>, r.tu_ngay])} />}
        </O>
      </Luoi>
    </>
  );
}

// ---- Hướng dẫn ----
function HuongDan() {
  const muc = [
    ["Quỹ thưởng sinh ra thế nào", "Mỗi quầy có mốc doanh thu KPI theo tháng. Doanh thu luỹ kế từ đầu tháng: phần DƯỚI mốc trích tỷ lệ thấp (2,5% Kiosk / 1% Siêu thị), phần VƯỢT mốc trích tỷ lệ cao (15% / 10%). Quỹ tính theo NGÀY."],
    ["Chia cho ai", "Quỹ ngày-quầy chia cho nhân viên theo ĐIỂM = giờ làm × hệ số KPI. Kiosk chia gọn trong quầy. Siêu thị chia hai tầng: trưởng ca / phó trưởng ca theo quầy, nhân viên theo CỤM quầy (gộp mã cùng trạm)."],
    ["Partime", "Không nhận thưởng. 30% phần của họ chia lại cho người còn lại, 70% về công ty."],
    ["Sáp nhập quầy", "Quầy đóng cửa gộp vào quầy khác: quầy tiếp nhận thừa hưởng doanh thu luỹ kế của quầy cũ để tính mốc KPI chung."],
    ["Kiểm tra & đối soát", "Bất biến: Σ quỹ đang chia = Σ thực nhận + Σ công ty giữ lại. Trang Kiểm tra nêu mọi cảnh báo dữ liệu (thiếu khai báo, quỹ treo, khai lệch) — engine không tự sửa, chỉ chỉ ra."],
  ];
  return (
    <Luoi>
      <O w={12} tieu_de="Cơ chế thưởng khoán — tóm tắt">
        <div style={{ display: "grid", gap: 14 }}>
          {muc.map(([t, d]) => (
            <div key={t}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 3 }}>{t}</div>
              <div style={{ fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.6 }}>{d}</div>
            </div>
          ))}
        </div>
      </O>
    </Luoi>
  );
}

// ---- dùng chung ----
function Bang({ cot, dong, phai = [], cao }: { cot: string[]; dong: React.ReactNode[][]; phai?: number[]; cao?: number }) {
  const p = new Set(phai);
  return (
    <div style={{ overflow: "auto", maxHeight: cao }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead><tr>{cot.map((c, i) => (
          <th key={c} style={{ position: "sticky", top: 0, background: "var(--panel)", textAlign: p.has(i) ? "right" : "left", padding: "7px 8px", borderBottom: "1px solid var(--line-strong)", fontSize: 11.5, fontWeight: 600, color: "var(--ink-soft)", whiteSpace: "nowrap" }}>{c}</th>
        ))}</tr></thead>
        <tbody>{dong.map((r, i) => (
          <tr key={i}>{r.map((o, j) => (
            <td key={j} style={{ textAlign: p.has(j) ? "right" : "left", padding: "7px 8px", borderBottom: "1px solid var(--line)", whiteSpace: "nowrap" }}>{o}</td>
          ))}</tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function ThanhKpi({ ht }: { ht: number }) {
  const w = Math.min(ht * 100, 100);
  const dat = ht >= 1;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
      <span style={{ width: 64, height: 6, borderRadius: 3, background: "var(--line)", overflow: "hidden" }}>
        <span style={{ display: "block", height: "100%", width: `${w}%`, background: dat ? "#1e7145" : "var(--accent)" }} />
      </span>
      <b style={{ color: dat ? "#1e7145" : undefined, minWidth: 48, textAlign: "right" }}>{pc(ht)}</b>
    </span>
  );
}
