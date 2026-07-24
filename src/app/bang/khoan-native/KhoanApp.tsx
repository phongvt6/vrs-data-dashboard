"use client";

import { useMemo, useState } from "react";
import ChartTile from "@/chart/ChartTile";
import type { KetQua, NgayQuay } from "@/lib/khoan";
import { Luoi, O } from "../_components/BangKhung";

// App khoán native. Nhận KetQua đã tính sẵn từ server, lọc theo kỳ + chiều ở
// client rồi vẽ bằng thư viện chart của app. Mỗi "trang" là một hàm render —
// dựng dần cho đủ 10 trang như bản gốc.

const vnd = (n: number) => Math.round(n).toLocaleString("vi-VN") + " đ";
const pc = (n: number) => (n * 100).toFixed(1).replace(".", ",") + "%";
const gio = (n: number) => n.toLocaleString("vi-VN", { maximumFractionDigits: 1 }) + "h";
const dmy = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const mono = { fontFamily: "var(--mono, ui-monospace, monospace)", fontSize: 12.5 } as const;
const TIEN = { dinh_dang: "tien" as const };

type Trang = "dash" | "report" | "thidua" | "bang" | "kiosk" | "st" | "gio" | "check" | "data" | "guide";

const NAV: { id: Trang; ic: string; lb: string }[] = [
  { id: "dash", ic: "📊", lb: "Dashboard" },
  { id: "report", ic: "📈", lb: "Báo cáo & Thống kê" },
  { id: "thidua", ic: "🏆", lb: "Bảng thi đua" },
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

export default function KhoanApp({ data }: { data: KetQua }) {
  const { dt } = data;
  const kyCo = useMemo(() => [...new Set(dt.map((r) => r.nam_thang))].sort(), [dt]);
  const [trang, setTrang] = useState<Trang>("dash");
  const [ky, setKy] = useState<string>(kyCo[kyCo.length - 1] ?? "");

  const soCanhBao = data.canhBao.filter((c) => !c.ngay || c.ngay.slice(0, 7).replace("-", "/") === ky).length;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "212px 1fr", gap: 16, alignItems: "start" }}>
      {/* Nav — style theo design system (panel + accent), không phải sidebar tối của port */}
      <nav style={{
        position: "sticky", top: 84, display: "flex", flexDirection: "column", gap: 2,
        background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 12, padding: 8,
      }}>
        {NAV.map((n) => {
          const on = n.id === trang;
          return (
            <button key={n.id} onClick={() => setTrang(n.id)} style={{
              display: "flex", alignItems: "center", gap: 9, padding: "8px 11px", borderRadius: 8,
              border: "none", cursor: "pointer", textAlign: "left", fontSize: 13.5,
              fontWeight: on ? 600 : 400,
              background: on ? "var(--accent)" : "transparent",
              color: on ? "#fff" : "var(--ink-soft)",
            }}>
              <span style={{ fontSize: 15 }}>{n.ic}</span>
              <span style={{ flex: 1 }}>{n.lb}</span>
              {n.id === "check" && soCanhBao > 0 && (
                <span style={{
                  fontSize: 11, fontWeight: 700, background: on ? "rgba(255,255,255,.25)" : "#d03b3b",
                  color: "#fff", borderRadius: 99, padding: "1px 7px",
                }}>{soCanhBao}</span>
              )}
            </button>
          );
        })}
      </nav>

      <div style={{ minWidth: 0 }}>
        <ChonKy kyCo={kyCo} ky={ky} onChon={setKy} />
        {trang === "dash" && <Dashboard data={data} ky={ky} />}
        {trang === "check" && <KiemTra data={data} ky={ky} />}
        {!["dash", "check"].includes(trang) && <DangDung ten={NAV.find((n) => n.id === trang)!.lb} />}
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

function DangDung({ ten }: { ten: string }) {
  return (
    <div style={{
      background: "var(--panel)", border: "1px dashed var(--line-strong)", borderRadius: 12,
      padding: "48px 24px", textAlign: "center", color: "var(--ink-soft)", fontSize: 14,
    }}>
      Trang <b>{ten}</b> đang được dựng lại native — hiện vẫn xem được ở bản gốc tại{" "}
      <a href="/bang/thuong-khoan" style={{ color: "var(--accent)" }}>/bang/thuong-khoan</a>.
    </div>
  );
}

// ---- Trang Dashboard ----
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
    .map(([ma, v]) => ({ ma, quy: tong(v, (x) => x.quy_thuong), bo_phan: v[0].bo_phan }))
    .sort((a, b) => b.quy - a.quy);
  const quyCuaQuay = new Map(theoQuay.map((q) => [q.ma, q.quy]));

  const cuoiCung = new Map<string, NgayQuay>();
  for (const r of D) {
    const p = cuoiCung.get(r.ma_cua_hang);
    if (!p || r.ngay > p.ngay) cuoiCung.set(r.ma_cua_hang, r);
  }
  const tienDoKpi = [...cuoiCung.values()].sort((a, b) => b.ht_kpi - a.ht_kpi);

  const coThuong = R.filter((r) => r.thuc_nhan > 0);
  const topNv = [...nhom(coThuong, (r) => r.ma_nv)]
    .map(([ma, v]) => ({
      ma, ho_ten: v[0].ho_ten, chuc_vu: v[0].chuc_vu, ma_cua_hang: v[0].ma_cua_hang,
      gio: tong(v, (x) => x.gio_lam), thuc_nhan: tong(v, (x) => x.thuc_nhan),
    }))
    .sort((a, b) => b.thuc_nhan - a.thuc_nhan)
    .slice(0, 15);

  const theoChucDanh = [...nhom(coThuong, (r) => r.chuc_vu || "(không rõ)")]
    .map(([cv, v]) => ({ label: cv, value: tong(v, (x) => x.thuc_nhan) }))
    .sort((a, b) => b.value - a.value);

  return (
    <>
      <Luoi>
        <O w={2}><ChartTile loai="stat-tile" config={TIEN} rows={[{ label: "Doanh thu", value: dtTong }]} /></O>
        <O w={2} ghi_chu={dtTong ? `${pc(quy / dtTong)} doanh thu` : undefined}>
          <ChartTile loai="stat-tile" config={TIEN} rows={[{ label: "Quỹ thưởng", value: quy }]} />
        </O>
        <O w={3} ghi_chu={`${soNv} người có thưởng`}>
          <ChartTile loai="stat-tile" config={TIEN} rows={[{ label: "Nhân viên thực nhận", value: thucNhan }]} />
        </O>
        <O w={3} ghi_chu={quy ? `${pc(vrs / quy)} quỹ — phần 70% của Partime` : undefined}>
          <ChartTile loai="stat-tile" config={TIEN} rows={[{ label: "Công ty giữ lại", value: vrs }]} />
        </O>
        <O w={2}>
          <ChartTile loai="stat-tile" config={TIEN} rows={[{ label: "Bình quân / người", value: soNv ? thucNhan / soNv : 0 }]} />
        </O>
      </Luoi>

      <Luoi>
        <O w={6} tieu_de="Doanh thu theo ngày">
          <ChartTile loai="area" config={TIEN} height={230} rows={theoNgay.map((r) => ({ label: dmy(r.ngay), value: r.dt }))} />
        </O>
        <O w={6} tieu_de="Quỹ thưởng theo ngày"
           ghi_chu="Cùng trục thời gian với chart bên trái. Quỹ nhảy bậc vào ngày quầy vượt mốc KPI — từ đó phần vượt trích 15% thay vì 2,5%.">
          <ChartTile loai="area" config={TIEN} height={230} rows={theoNgay.map((r) => ({ label: dmy(r.ngay), value: r.quy }))} />
        </O>
      </Luoi>

      <Luoi>
        <O w={7} tieu_de="Tiến độ hoàn thành KPI" ghi_chu={`${tienDoKpi.length} quầy có doanh thu trong kỳ`}>
          <Bang
            cot={["Mã cửa hàng", "Bộ phận", "Luỹ kế", "Mốc KPI", "% hoàn thành", "Còn thiếu", "Quỹ thưởng"]}
            phai={[2, 3, 4, 5, 6]} cao={420}
            dong={tienDoKpi.map((r) => [
              <span key="m" style={mono}>{r.ma_cua_hang}</span>,
              r.bo_phan,
              vnd(r.luy_ke),
              r.moc ? vnd(r.moc) : <span key="x" style={{ color: "#b5423a" }}>chưa có</span>,
              <ThanhKpi key="p" ht={r.ht_kpi} />,
              r.ht_kpi >= 1 ? <span key="v" style={{ color: "#1e7145", fontWeight: 600 }}>đã vượt mốc</span> : vnd(r.moc - r.luy_ke),
              vnd(quyCuaQuay.get(r.ma_cua_hang) ?? 0),
            ])}
          />
        </O>
        <O w={5} tieu_de="Quỹ thưởng theo quầy" ghi_chu="14 quầy sinh quỹ lớn nhất trong kỳ">
          <ChartTile loai="bar" config={TIEN} height={420} rows={theoQuay.slice(0, 14).map((q) => ({ label: q.ma, value: q.quy }))} />
        </O>
      </Luoi>

      <Luoi>
        <O w={7} tieu_de="Top 15 nhân viên theo thực nhận">
          <Bang
            cot={["Mã NV", "Họ tên", "Chức danh", "Quầy", "Giờ", "Thực nhận"]} phai={[4, 5]}
            dong={topNv.map((r) => [
              <span key="m" style={mono}>{r.ma}</span>,
              r.ho_ten || "—", r.chuc_vu || "—",
              <span key="q" style={mono}>{r.ma_cua_hang}</span>,
              gio(r.gio),
              <b key="t">{vnd(r.thuc_nhan)}</b>,
            ])}
          />
        </O>
        <O w={5} tieu_de="Phân bổ theo chức danh" ghi_chu="Tổng thực nhận, đã loại Partime (không nhận thưởng)">
          <ChartTile loai="donut" config={TIEN} rows={theoChucDanh} height={300} />
        </O>
      </Luoi>
    </>
  );
}

// ---- Trang Kiểm tra (đối soát) ----
function KiemTra({ data, ky }: { data: KetQua; ky: string }) {
  const { doiSoat, canhBao } = data;
  const canhBaoKy = canhBao.filter((c) => !c.ngay || c.ngay.slice(0, 7).replace("-", "/") === ky);
  const loaiCanhBao = [...nhom(canhBaoKy, (c) => c.loai)]
    .map(([loai, v]) => ({ loai, n: v.length }))
    .sort((a, b) => b.n - a.n);

  return (
    <>
      <div style={{
        background: doiSoat.dat ? "rgba(30,113,69,.08)" : "rgba(181,66,58,.08)",
        border: `1px solid ${doiSoat.dat ? "#1e7145" : "#b5423a"}`, borderRadius: 10,
        padding: "12px 16px", marginBottom: 12, fontSize: 13.5, fontWeight: 600,
        color: doiSoat.dat ? "#1e7145" : "#b5423a",
      }}>
        {doiSoat.dat ? "✓ ĐỐI SOÁT ĐẠT — chênh lệch 0 đ (trong ngưỡng làm tròn)" : `✗ ĐỐI SOÁT LỆCH — chênh ${vnd(doiSoat.chenhLech)}`}
      </div>

      <Luoi>
        <O w={7} tieu_de="Đối soát quỹ thưởng"
           ghi_chu="Bất biến: mọi đồng quỹ đang chia phải đi đúng một trong hai chỗ — vào tay nhân viên, hoặc về công ty (70% phần Partime). Lệch khác 0 là engine hỏng.">
          <Bang
            cot={["Khoản", "Số tiền"]} phai={[1]}
            dong={[
              ["Quỹ phát sinh (toàn kỳ, mọi quầy)", vnd(doiSoat.quyPhatSinh)],
              ["— trong đó đang chia được", vnd(doiSoat.quyDangChia)],
              ["— quỹ treo (không ai khai giờ)", vnd(doiSoat.quyTreo)],
              ["Nhân viên thực nhận", vnd(doiSoat.tongThucNhan)],
              ["Công ty giữ lại (70% Partime)", vnd(doiSoat.tongVrs)],
              [<b key="c">Chênh lệch</b>, <b key="v" style={{ color: doiSoat.dat ? "#1e7145" : "#b5423a" }}>{doiSoat.dat ? "0 đ — khớp" : vnd(doiSoat.chenhLech)}</b>],
            ]}
          />
        </O>
        <O w={5} tieu_de="Cảnh báo dữ liệu trong kỳ"
           ghi_chu="Engine không tự sửa dữ liệu hỏng, chỉ nêu ra — số sai mà im lặng nguy hiểm hơn nhiều.">
          {loaiCanhBao.length ? (
            <Bang cot={["Loại", "Số lần"]} phai={[1]} dong={loaiCanhBao.map((c) => [c.loai, String(c.n)])} />
          ) : (
            <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>Không có cảnh báo nào trong kỳ này.</p>
          )}
        </O>
      </Luoi>

      <Luoi>
        <O w={12} tieu_de="Chi tiết quỹ treo theo quầy" ghi_chu="Quầy có doanh thu nhưng không ai khai giờ → quỹ không đến tay ai">
          {doiSoat.treoChiTiet.length ? (
            <Bang
              cot={["Mã cửa hàng", "Số ngày", "Quỹ treo"]} phai={[1, 2]} cao={320}
              dong={doiSoat.treoChiTiet.map((t) => [<span key="m" style={mono}>{t.ma_cua_hang}</span>, String(t.so_ngay), vnd(t.quy)])}
            />
          ) : (
            <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>Không có quỹ treo.</p>
          )}
        </O>
      </Luoi>
    </>
  );
}

// ---- Bảng dùng chung ----
function Bang({ cot, dong, phai = [], cao }: {
  cot: string[]; dong: React.ReactNode[][]; phai?: number[]; cao?: number;
}) {
  const p = new Set(phai);
  return (
    <div style={{ overflow: "auto", maxHeight: cao }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr>
            {cot.map((c, i) => (
              <th key={c} style={{
                position: "sticky", top: 0, background: "var(--panel)", textAlign: p.has(i) ? "right" : "left",
                padding: "7px 8px", borderBottom: "1px solid var(--line-strong)", fontSize: 11.5,
                fontWeight: 600, color: "var(--ink-soft)", whiteSpace: "nowrap",
              }}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dong.map((r, i) => (
            <tr key={i}>
              {r.map((o, j) => (
                <td key={j} style={{
                  textAlign: p.has(j) ? "right" : "left", padding: "7px 8px",
                  borderBottom: "1px solid var(--line)", whiteSpace: "nowrap",
                }}>{o}</td>
              ))}
            </tr>
          ))}
        </tbody>
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
