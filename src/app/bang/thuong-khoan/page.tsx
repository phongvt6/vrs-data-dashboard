// Dashboard Thưởng khoán — dựng lại trong app tool Cloudflare Worker của team
// kinh doanh, để (a) so số hai bên và (b) có một khuôn dashboard nghiệp vụ nặng.
//
// Khác bản gốc ở hai chỗ, đều là cố ý:
//   · Bản gốc vẽ "Doanh thu & quỹ thưởng theo ngày" chung một chart hai trục Y.
//     Quỹ chỉ bằng 2,5–15% doanh thu nên trục phụ phải phóng ~20 lần — hai đường
//     cắt nhau ở chỗ chẳng có ý nghĩa gì. Ở đây tách hai chart cùng trục thời
//     gian (nguyên tắc "một trục Y" của thư viện chart).
//   · Bản gốc lọc bằng JS trên toàn bộ dữ liệu đã tải; ở đây lọc theo kỳ bằng
//     query string để link gửi đi mở ra đúng cái người gửi đang nhìn.

import { Suspense } from "react";
import Link from "next/link";
import ChartTile from "@/chart/ChartTile";
import { moiNhat } from "@/lib/mart";
import { docKhoan, DATASETS_KHOAN } from "@/lib/khoan-data";
import type { NgayQuay } from "@/lib/khoan";
import BangKhung, { Luoi, O, OTrong } from "../_components/BangKhung";

// Không dùng `export const dynamic` — cacheComponents (PPR) lo phần dynamic, và
// khai báo đó còn bị next.config từ chối. Thay vào đó: fetch nằm trong component
// async bọc <Suspense>, phần khung hiện ngay trong khi engine còn đang tính.
export const metadata = { title: "Thưởng khoán — VRS" };

const vnd = (n: number) => Math.round(n).toLocaleString("vi-VN") + " đ";
const pc = (n: number) => (n * 100).toFixed(1).replace(".", ",") + "%";
const gio = (n: number) => n.toLocaleString("vi-VN", { maximumFractionDigits: 1 }) + "h";
const dmy = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

export default async function ThuongKhoanPage({
  searchParams,
}: {
  searchParams: Promise<{ ky?: string }>;
}) {
  const { ky } = await searchParams;
  return (
    <BangKhung
      ten="Thưởng khoán"
      mo_ta="Quỹ thưởng sinh từ doanh thu theo mốc KPI của từng quầy, chia cho nhân viên theo giờ làm × hệ số"
      mocDuLieu={
        <Suspense fallback={null}>
          <MocDuLieu />
        </Suspense>
      }
    >
      {/* key theo kỳ để đổi kỳ thì re-suspend, hiện khung chờ trong lúc tính lại */}
      <Suspense
        key={ky ?? "moi-nhat"}
        fallback={
          <>
            <Luoi><OTrong w={2} cao={120} /><OTrong w={2} cao={120} /><OTrong w={3} cao={120} /><OTrong w={3} cao={120} /><OTrong w={2} cao={120} /></Luoi>
            <Luoi><OTrong w={6} cao={260} /><OTrong w={6} cao={260} /></Luoi>
            <Luoi><OTrong w={7} cao={440} /><OTrong w={5} cao={440} /></Luoi>
          </>
        }
      >
        <NoiDung ky={ky} />
      </Suspense>
    </BangKhung>
  );
}

async function MocDuLieu() {
  const moc = await moiNhat(DATASETS_KHOAN);
  return moc ? <>Số liệu tính đến {moc}</> : null;
}

async function NoiDung({ ky: kyParam }: { ky?: string }) {
  const { ketQua } = await docKhoan();
  const { rows, dt, doiSoat, canhBao } = ketQua;

  // Kỳ = tháng khoán. Mặc định kỳ mới nhất có dữ liệu — mở dashboard ra là thấy
  // ngay tháng đang chạy, không phải tổng của cả quý.
  const kyCo = [...new Set(dt.map((r) => r.nam_thang))].sort();
  const ky = kyParam ?? kyCo[kyCo.length - 1] ?? "";
  const D = dt.filter((r) => r.nam_thang === ky);
  const R = rows.filter((r) => r.nam_thang === ky);

  const dtTong = tong(D, (r) => r.doanh_thu);
  const quy = tong(D, (r) => r.quy_thuong);
  const thucNhan = tong(R, (r) => r.thuc_nhan);
  const vrs = tong(R, (r) => r.quy_thuong_vrs);
  const soNv = new Set(R.filter((r) => r.thuc_nhan > 0).map((r) => r.ma_nv)).size;

  // Theo ngày
  const theoNgay = [...nhom(D, (r) => r.ngay)]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([ngay, v]) => ({
      ngay, dt: tong(v, (x) => x.doanh_thu), quy: tong(v, (x) => x.quy_thuong),
    }));

  // Quỹ theo quầy — top 14, đúng như bản gốc
  const theoQuay = [...nhom(D, (r) => r.ma_cua_hang)]
    .map(([ma, v]) => ({ ma, quy: tong(v, (x) => x.quy_thuong), bo_phan: v[0].bo_phan }))
    .sort((a, b) => b.quy - a.quy);

  // Tiến độ KPI: lấy dòng doanh thu MỚI NHẤT của mỗi quầy trong kỳ, vì luỹ kế
  // và % hoàn thành đã cộng dồn sẵn trong dòng đó.
  const cuoiCung = new Map<string, NgayQuay>();
  for (const r of D) {
    const p = cuoiCung.get(r.ma_cua_hang);
    if (!p || r.ngay > p.ngay) cuoiCung.set(r.ma_cua_hang, r);
  }
  const quyCuaQuay = new Map(theoQuay.map((q) => [q.ma, q.quy]));
  const tienDoKpi = [...cuoiCung.values()].sort((a, b) => b.ht_kpi - a.ht_kpi);

  // Top nhân viên + phân bổ theo chức danh
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

  const canhBaoKy = canhBao.filter((c) => !c.ngay || c.ngay.slice(0, 7).replace("-", "/") === ky);
  const loaiCanhBao = [...nhom(canhBaoKy, (c) => c.loai)]
    .map(([loai, v]) => ({ loai, n: v.length }))
    .sort((a, b) => b.n - a.n);

  const tien = { dinh_dang: "tien" as const };

  return (
    <>
      <ChonKy kyCo={kyCo} ky={ky} />

      <Luoi>
        <O w={2}><ChartTile loai="stat-tile" config={tien} rows={[{ label: "Doanh thu", value: dtTong }]} /></O>
        <O w={2} ghi_chu={dtTong ? `${pc(quy / dtTong)} doanh thu` : undefined}>
          <ChartTile loai="stat-tile" config={tien} rows={[{ label: "Quỹ thưởng", value: quy }]} />
        </O>
        <O w={3} ghi_chu={`${soNv} người có thưởng`}>
          <ChartTile loai="stat-tile" config={tien} rows={[{ label: "Nhân viên thực nhận", value: thucNhan }]} />
        </O>
        <O w={3} ghi_chu={quy ? `${pc(vrs / quy)} quỹ — phần 70% của Partime` : undefined}>
          <ChartTile loai="stat-tile" config={tien} rows={[{ label: "Công ty giữ lại", value: vrs }]} />
        </O>
        <O w={2}>
          <ChartTile loai="stat-tile" config={tien} rows={[{ label: "Bình quân / người", value: soNv ? thucNhan / soNv : 0 }]} />
        </O>
      </Luoi>

      <Luoi>
        <O w={6} tieu_de="Doanh thu theo ngày">
          <ChartTile loai="area" config={tien} height={230}
            rows={theoNgay.map((r) => ({ label: dmy(r.ngay), value: r.dt }))} />
        </O>
        <O w={6} tieu_de="Quỹ thưởng theo ngày"
           ghi_chu="Cùng trục thời gian với chart bên trái. Quỹ nhảy bậc vào ngày quầy vượt mốc KPI — từ đó phần vượt được trích 15% thay vì 2,5%.">
          <ChartTile loai="area" config={tien} height={230}
            rows={theoNgay.map((r) => ({ label: dmy(r.ngay), value: r.quy }))} />
        </O>
      </Luoi>

      <Luoi>
        <O w={7} tieu_de="Tiến độ hoàn thành KPI" ghi_chu={`${tienDoKpi.length} quầy có doanh thu trong kỳ`}>
          <Bang
            cot={["Mã cửa hàng", "Bộ phận", "Luỹ kế", "Mốc KPI", "% hoàn thành", "Còn thiếu", "Quỹ thưởng"]}
            phai={[2, 3, 4, 5, 6]}
            cao={420}
            dong={tienDoKpi.map((r) => [
              <span key="m" style={mono}>{r.ma_cua_hang}</span>,
              r.bo_phan,
              vnd(r.luy_ke),
              r.moc ? vnd(r.moc) : <span key="x" style={{ color: "#b5423a" }}>chưa có</span>,
              <ThanhKpi key="p" ht={r.ht_kpi} />,
              r.ht_kpi >= 1
                ? <span key="v" style={{ color: "#1e7145", fontWeight: 600 }}>đã vượt mốc</span>
                : vnd(r.moc - r.luy_ke),
              vnd(quyCuaQuay.get(r.ma_cua_hang) ?? 0),
            ])}
          />
        </O>
        <O w={5} tieu_de="Quỹ thưởng theo quầy" ghi_chu="14 quầy sinh quỹ lớn nhất trong kỳ">
          <ChartTile loai="bar" config={tien} height={420}
            rows={theoQuay.slice(0, 14).map((q) => ({ label: q.ma, value: q.quy }))} />
        </O>
      </Luoi>

      <Luoi>
        <O w={7} tieu_de="Top 15 nhân viên theo thực nhận">
          <Bang
            cot={["Mã NV", "Họ tên", "Chức danh", "Quầy", "Giờ", "Thực nhận"]}
            phai={[4, 5]}
            dong={topNv.map((r) => [
              <span key="m" style={mono}>{r.ma}</span>,
              r.ho_ten || "—",
              r.chuc_vu || "—",
              <span key="q" style={mono}>{r.ma_cua_hang}</span>,
              gio(r.gio),
              <b key="t">{vnd(r.thuc_nhan)}</b>,
            ])}
          />
        </O>
        <O w={5} tieu_de="Phân bổ theo chức danh" ghi_chu="Tổng thực nhận, đã loại Partime (không nhận thưởng)">
          <ChartTile loai="donut" config={tien} rows={theoChucDanh} height={300} />
        </O>
      </Luoi>

      <Luoi>
        <O w={7} tieu_de="Đối soát quỹ thưởng"
           ghi_chu="Bất biến: mọi đồng quỹ đang chia phải đi đúng một trong hai chỗ — vào tay nhân viên, hoặc về công ty (70% phần Partime). Lệch khác 0 là engine hỏng.">
          <Bang
            cot={["Khoản", "Số tiền"]}
            phai={[1]}
            dong={[
              ["Quỹ phát sinh (toàn kỳ, mọi quầy)", vnd(doiSoat.quyPhatSinh)],
              ["— trong đó đang chia được", vnd(doiSoat.quyDangChia)],
              ["— quỹ treo (không ai khai giờ)", vnd(doiSoat.quyTreo)],
              ["Nhân viên thực nhận", vnd(doiSoat.tongThucNhan)],
              ["Công ty giữ lại (70% Partime)", vnd(doiSoat.tongVrs)],
              [
                <b key="c">Chênh lệch</b>,
                <b key="v" style={{ color: doiSoat.dat ? "#1e7145" : "#b5423a" }}>
                  {doiSoat.dat ? "0 đ — khớp" : vnd(doiSoat.chenhLech)}
                </b>,
              ],
            ]}
          />
        </O>
        <O w={5} tieu_de="Cảnh báo dữ liệu trong kỳ"
           ghi_chu="Engine không tự sửa dữ liệu hỏng, chỉ nêu ra — số sai mà im lặng nguy hiểm hơn nhiều.">
          {loaiCanhBao.length ? (
            <Bang
              cot={["Loại", "Số lần"]}
              phai={[1]}
              dong={loaiCanhBao.map((c) => [c.loai, String(c.n)])}
            />
          ) : (
            <p style={{ fontSize: 13, color: "var(--ink-soft)" }}>Không có cảnh báo nào trong kỳ này.</p>
          )}
        </O>
      </Luoi>
    </>
  );
}

// ---- tiện ích cục bộ ----

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

const mono = { fontFamily: "var(--mono, ui-monospace, monospace)", fontSize: 12.5 } as const;

function ChonKy({ kyCo, ky }: { kyCo: string[]; ky: string }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12, flexWrap: "wrap" }}>
      <span style={{ fontSize: 12.5, color: "var(--ink-soft)", fontWeight: 600 }}>Kỳ khoán</span>
      {kyCo.map((k) => (
        <Link
          key={k}
          href={`?ky=${encodeURIComponent(k)}`}
          style={{
            fontSize: 13, padding: "5px 12px", borderRadius: 7,
            border: "1px solid var(--line-strong)",
            background: k === ky ? "var(--accent)" : "var(--panel)",
            color: k === ky ? "#fff" : "var(--ink-soft)",
            fontWeight: k === ky ? 600 : 400,
          }}
        >
          {k.replace("/", " · tháng ")}
        </Link>
      ))}
    </div>
  );
}

/** Thanh % hoàn thành KPI — vượt mốc đổi màu, vì đó là ngưỡng đổi tỷ lệ trích. */
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

/**
 * Bảng đơn giản cho dashboard. Thư viện chart cố tình không có "loại chart bảng"
 * — bảng là bảng, không phải biểu đồ; nhét vào taxonomy chỉ làm rối phần tra cứu.
 */
function Bang({
  cot, dong, phai = [], cao,
}: {
  cot: string[];
  dong: React.ReactNode[][];
  /** Chỉ số cột canh phải (số tiền, số lượng). */
  phai?: number[];
  cao?: number;
}) {
  const p = new Set(phai);
  return (
    <div style={{ overflow: "auto", maxHeight: cao }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr>
            {cot.map((c, i) => (
              <th key={c} style={{
                position: "sticky", top: 0, background: "var(--panel)",
                textAlign: p.has(i) ? "right" : "left",
                padding: "7px 8px", borderBottom: "1px solid var(--line-strong)",
                fontSize: 11.5, fontWeight: 600, color: "var(--ink-soft)", whiteSpace: "nowrap",
              }}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dong.map((d, i) => (
            <tr key={i}>
              {d.map((o, j) => (
                <td key={j} style={{
                  textAlign: p.has(j) ? "right" : "left",
                  padding: "7px 8px", borderBottom: "1px solid var(--line)", whiteSpace: "nowrap",
                }}>{o}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
