// Dashboard Doanh thu tự doanh — bản THAM CHIẾU đầy đủ.
//
// Gom mọi mảnh của "khuôn dashboard" vào một trang, để dashboard sau chỉ việc
// đổi query + nhãn:
//   - Nguồn BigQuery, query THẲNG qua duLieu() (cache dùng chung)
//   - Thanh lọc trên URL (ThanhLoc + src/lib/loc.ts)
//   - Thẻ KPI nhiều mốc so sánh (TheKPI)
//   - Diễn giải bằng câu chữ (dienGiaiDoanhThu → KhoiDienGiai)
//   - Drill-down nhóm hàng → SKU
//   - Streaming: mỗi khối một <Suspense>

import { Suspense } from "react";
import ChartTile from "@/chart/ChartTile";
import { duLieu } from "@/lib/nguon";
import { toRows } from "@/lib/mart";
import { docLoc, whereBigQuery, whereChieu, type ChieuLoc } from "@/lib/loc";
import { dienGiaiDoanhThu } from "@/lib/dien-giai";
import BangKhung, { Luoi, O, OTrong } from "../_components/BangKhung";
import ThanhLoc, { type ChonNhieu } from "../_components/ThanhLoc";
import TheKPI from "../_components/TheKPI";
import KhoiDienGiai from "../_components/KhoiDienGiai";

export const metadata = { title: "Doanh thu tự doanh — VRS" };

const NGUON = "src_d223440a";
const BANG = "`gwm-1673948129693.Revenue.doanh_thu_chi_tiet`";
const TIEN = { dinh_dang: "tien" as const };
const NGAY = "ngay_thang";

// Loại mã hoá đơn (HD…) lẫn vào cột nhóm hàng — lỗi rò từ POS.
const NHOM_SACH = `nhom_hang_cu IS NOT NULL AND nhom_hang_cu <> ""
  AND NOT REGEXP_CONTAINS(nhom_hang_cu, r"^HD") AND NOT REGEXP_CONTAINS(nhom_hang_cu, r"\\{DEL\\}")`;

// Các chiều lọc: khoá URL ↔ cột. Thêm/bớt ở đây là đủ.
const CHIEU: ChieuLoc[] = [
  { khoa: "tram", cot: "tram" },
  { khoa: "diem", cot: "diem_tram" },
  { khoa: "bp", cot: "bo_phan" },
  { khoa: "nhom", cot: "nhom_hang_cu" },
  { khoa: "quay", cot: "ma_cua_hang" },
];

type SP = Promise<Record<string, string | string[] | undefined>>;

export default function TuDoanhPage({ searchParams }: { searchParams: SP }) {
  return (
    <BangKhung
      ten="Doanh thu tự doanh"
      mo_ta="Chi tiết theo SKU · đọc trực tiếp BigQuery"
      mocDuLieu={<Suspense fallback={null}><MocDuLieu /></Suspense>}
      thanhLoc={<Suspense fallback={null}><LocBar /></Suspense>}
    >
      <Suspense fallback={<Luoi><OTrong w={4} cao={170} /><OTrong w={8} cao={170} /></Luoi>}>
        <HangKPI searchParams={searchParams} />
      </Suspense>

      <Suspense fallback={<OTrong w={12} cao={120} />}>
        <HangDienGiai searchParams={searchParams} />
      </Suspense>

      <Suspense fallback={<Luoi><OTrong w={8} cao={340} /><OTrong w={4} cao={340} /></Luoi>}>
        <HangGiua searchParams={searchParams} />
      </Suspense>

      <Suspense fallback={<Luoi><OTrong w={7} cao={340} /><OTrong w={5} cao={340} /></Luoi>}>
        <HangNhom searchParams={searchParams} />
      </Suspense>

      <p style={{ margin: "6px 2px 0", fontSize: 11.5, color: "var(--ink-soft)", lineHeight: 1.5 }}>
        Đã loại bản ghi có nhóm hàng là mã hoá đơn (HD…) — lỗi rò dữ liệu từ hệ POS, ~0,6% số dòng.
      </p>
    </BangKhung>
  );
}

async function MocDuLieu() {
  const [r] = await duLieu<{ den: { value: string } | string }>(
    NGUON,
    `SELECT FORMAT_DATE("%d/%m/%Y", MAX(${NGAY})) den FROM ${BANG}`
  );
  const den = typeof r?.den === "object" ? r.den.value : r?.den;
  return den ? <>Số liệu đến ngày {den}</> : null;
}

/** Thanh lọc — nạp các giá trị chọn được (cache theo ngày vì ít đổi). */
async function LocBar() {
  const [tram, diem, bp, nhom, quay] = await Promise.all([
    duLieu<{ v: string }>(NGUON, `SELECT DISTINCT tram v FROM ${BANG} WHERE tram<>"" ORDER BY tram`, undefined, "ngay"),
    duLieu<{ v: string }>(NGUON, `SELECT DISTINCT diem_tram v FROM ${BANG} WHERE diem_tram<>"" ORDER BY diem_tram`, undefined, "ngay"),
    duLieu<{ v: string }>(NGUON, `SELECT DISTINCT bo_phan v FROM ${BANG} WHERE bo_phan<>"" ORDER BY bo_phan`, undefined, "ngay"),
    duLieu<{ v: string }>(NGUON, `SELECT nhom_hang_cu v FROM ${BANG} WHERE ${NHOM_SACH} GROUP BY 1 ORDER BY SUM(doanh_thu) DESC LIMIT 50`, undefined, "ngay"),
    duLieu<{ v: string }>(NGUON, `SELECT ma_cua_hang v FROM ${BANG} WHERE ma_cua_hang<>"" GROUP BY 1 ORDER BY SUM(doanh_thu) DESC`, undefined, "ngay"),
  ]);
  const val = (rows: { v: string }[]) => rows.map((r) => r.v);
  const boLoc: ChonNhieu[] = [
    { khoa: "tram", nhan: "Trạm", kieu: "chip", values: val(tram) },
    { khoa: "diem", nhan: "Điểm trạm", kieu: "chip", values: val(diem) },
    { khoa: "bp", nhan: "Bộ phận", kieu: "chip", values: val(bp) },
    { khoa: "nhom", nhan: "Nhóm hàng", kieu: "chon", values: val(nhom) },
    { khoa: "quay", nhan: "Quầy", kieu: "chon", values: val(quay) },
  ];
  return <ThanhLoc boLoc={boLoc} />;
}

/* ------------------------------------------------------------------ KPI --- */

// Trả về tổng cho kỳ hiện tại + kỳ trước cùng độ dài + cùng kỳ năm trước.
// Kỳ = [tu, den] đã chọn, mặc định là tháng-đến-hiện-tại của ngày dữ liệu cuối.
// Cắt các kỳ so sánh về CÙNG SỐ NGÀY để tháng chưa hết không làm KPI sụt giả.
function sqlKPI(where: string) {
  return `
    WITH b AS (SELECT MAX(${NGAY}) mx FROM ${BANG} WHERE TRUE ${where}),
    ky AS (
      SELECT
        COALESCE(@loc_tu, FORMAT_DATE("%Y-%m-01", (SELECT mx FROM b))) AS tu,
        COALESCE(@loc_den, CAST((SELECT mx FROM b) AS STRING)) AS den
    ),
    d AS (
      SELECT PARSE_DATE("%Y-%m-%d", tu) tu, PARSE_DATE("%Y-%m-%d", den) den,
             DATE_DIFF(PARSE_DATE("%Y-%m-%d", den), PARSE_DATE("%Y-%m-%d", tu), DAY) + 1 sn
        FROM ky
    )
    SELECT FORMAT_DATE("%d/%m/%Y", d.tu) tu, FORMAT_DATE("%d/%m/%Y", d.den) den,
      (SELECT SUM(doanh_thu) FROM ${BANG} WHERE ${NGAY} BETWEEN d.tu AND d.den ${where}) cur,
      (SELECT SUM(so_luong) FROM ${BANG} WHERE ${NGAY} BETWEEN d.tu AND d.den ${where}) sl,
      (SELECT COUNT(DISTINCT ma_cua_hang) FROM ${BANG} WHERE ${NGAY} BETWEEN d.tu AND d.den ${where}) quay,
      (SELECT SUM(doanh_thu) FROM ${BANG}
        WHERE ${NGAY} >= DATE_SUB(d.tu, INTERVAL d.sn DAY) AND ${NGAY} < d.tu ${where}) prev,
      (SELECT SUM(doanh_thu) FROM ${BANG}
        WHERE ${NGAY} BETWEEN DATE_SUB(d.tu, INTERVAL 1 YEAR) AND DATE_SUB(d.den, INTERVAL 1 YEAR) ${where}) prevY
    FROM d`;
}

async function HangKPI({ searchParams }: { searchParams: SP }) {
  const loc = docLoc(await searchParams, CHIEU);
  const { where, params } = whereChieu(loc, CHIEU);
  const p = { ...params, loc_tu: loc.tu ?? null, loc_den: loc.den ?? null };

  const [kpi] = await duLieu<{ tu: string; den: string; cur: string; sl: string; quay: string; prev: string; prevY: string }>(
    NGUON, sqlKPI(where), p, "gio"
  );
  const nganh = await duLieu(
    NGUON,
    `SELECT nhom_hang_cu nhom, SUM(doanh_thu) dt FROM ${BANG}
      WHERE ${NHOM_SACH} ${wDate(loc, where)} GROUP BY 1 ORDER BY dt DESC LIMIT 6`,
    { ...params, ...dateParams(loc) },
    "gio"
  );

  const cur = Number(kpi?.cur ?? 0);
  return (
    <Luoi>
      <O w={4} ghi_chu={kpi ? `Kỳ ${kpi.tu} – ${kpi.den}` : undefined}>
        <TheKPI
          nhan="Doanh thu kỳ"
          giaTri={cur}
          deltas={[
            { nhan: "kỳ trước liền kề", truoc: Number(kpi?.prev ?? 0) },
            { nhan: "cùng kỳ năm trước", truoc: Number(kpi?.prevY ?? 0) },
          ]}
          ghiChu={`${Number(kpi?.sl ?? 0).toLocaleString("vi-VN")} sản phẩm · ${Number(kpi?.quay ?? 0)} quầy có phát sinh`}
        />
      </O>
      <O w={8} tieu_de="Top 6 nhóm hàng trong kỳ">
        <ChartTile loai="donut" config={TIEN} rows={toRows(nganh, { label: "nhom", value: "dt" })} height={200} />
      </O>
    </Luoi>
  );
}

/* --------------------------------------------------------------- Diễn giải */

async function HangDienGiai({ searchParams }: { searchParams: SP }) {
  const loc = docLoc(await searchParams, CHIEU);
  const { where, params } = whereChieu(loc, CHIEU);
  const p = { ...params, ...dateParams(loc), loc_tu: loc.tu ?? null, loc_den: loc.den ?? null };

  // Doanh thu theo điểm trạm, kỳ này vs kỳ trước liền kề — cho phần diễn giải.
  const rows = await duLieu<{ ten: string; ky: string; truoc: string }>(
    NGUON,
    `WITH b AS (SELECT MAX(${NGAY}) mx FROM ${BANG} WHERE TRUE ${where}),
     d AS (SELECT
        COALESCE(PARSE_DATE("%Y-%m-%d", @loc_tu), DATE_TRUNC((SELECT mx FROM b), MONTH)) tu,
        COALESCE(PARSE_DATE("%Y-%m-%d", @loc_den), (SELECT mx FROM b)) den)
     SELECT x.diem_tram ten,
       SUM(IF(x.${NGAY} BETWEEN (SELECT tu FROM d) AND (SELECT den FROM d), x.doanh_thu, 0)) ky,
       SUM(IF(x.${NGAY} >= DATE_SUB((SELECT tu FROM d), INTERVAL (SELECT DATE_DIFF(den, tu, DAY)+1 FROM d) DAY)
              AND x.${NGAY} < (SELECT tu FROM d), x.doanh_thu, 0)) truoc
       FROM ${BANG} x
      WHERE x.diem_tram <> ""
        AND x.${NGAY} >= DATE_SUB((SELECT tu FROM d), INTERVAL (SELECT DATE_DIFF(den, tu, DAY)+1 FROM d) DAY)
        AND x.${NGAY} <= (SELECT den FROM d) ${where}
      GROUP BY 1 ORDER BY ky DESC`,
    p,
    "gio"
  );

  const muc = rows.map((r) => ({ ten: r.ten, ky: Number(r.ky), truoc: Number(r.truoc) }));
  const tongKy = muc.reduce((s, m) => s + m.ky, 0);
  const tongTruoc = muc.reduce((s, m) => s + m.truoc, 0);
  const dg = dienGiaiDoanhThu("điểm trạm", muc, tongKy, tongTruoc, "so kỳ trước");

  return <KhoiDienGiai dg={dg} />;
}

/* ---------------------------------------------------------------- Biểu đồ */

// Chart xu hướng KHÔNG dính khoảng ngày (hiện toàn lịch sử), chỉ lọc theo chiều.
async function HangGiua({ searchParams }: { searchParams: SP }) {
  const loc = docLoc(await searchParams, CHIEU);
  const { where, params } = whereChieu(loc, CHIEU);
  // Top quầy thì theo kỳ đã chọn.
  const wa = whereBigQuery(loc, NGAY, CHIEU);

  const [theoThang, topQuay] = await Promise.all([
    duLieu(
      NGUON,
      `SELECT FORMAT_DATE("%m/%Y", DATE_TRUNC(${NGAY}, MONTH)) thang, SUM(doanh_thu) dt
         FROM ${BANG} WHERE TRUE ${where} GROUP BY 1, DATE_TRUNC(${NGAY}, MONTH)
        ORDER BY DATE_TRUNC(${NGAY}, MONTH)`,
      params, "gio"
    ),
    duLieu(
      NGUON,
      `SELECT ma_cua_hang, SUM(doanh_thu) dt FROM ${BANG}
        WHERE ma_cua_hang<>"" ${wa.where} GROUP BY 1 ORDER BY dt DESC LIMIT 12`,
      wa.params, "gio"
    ),
  ]);

  return (
    <Luoi>
      <O w={8} tieu_de="Doanh thu theo tháng" ghi_chu="Toàn lịch sử (không theo khoảng ngày đã lọc)">
        <ChartTile loai="area" config={TIEN} rows={toRows(theoThang, { label: "thang", value: "dt" })} height={300} />
      </O>
      <O w={4} tieu_de="Top 12 quầy trong kỳ">
        <ChartTile loai="bar" config={TIEN} rows={toRows(topQuay, { label: "ma_cua_hang", value: "dt" })} height={300} />
      </O>
    </Luoi>
  );
}

// Xếp hạng nhóm + drill-down: chọn một nhóm ở URL (?sku=Tên) → xem top SKU.
async function HangNhom({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const loc = docLoc(sp, CHIEU);
  const wa = whereBigQuery(loc, NGAY, CHIEU);
  const nhomChon = typeof sp.sku === "string" ? sp.sku : "";

  const xepNhom = await duLieu<{ nhom: string; dt: string }>(
    NGUON,
    `SELECT nhom_hang_cu nhom, SUM(doanh_thu) dt FROM ${BANG}
      WHERE ${NHOM_SACH} ${wa.where} GROUP BY 1 ORDER BY dt DESC LIMIT 10`,
    wa.params, "gio"
  );

  const nhom = nhomChon || xepNhom[0]?.nhom || "";
  const sku = nhom
    ? await duLieu<{ ten: string; dt: string; sl: string }>(
        NGUON,
        `SELECT ANY_VALUE(ten_hang_hoa) ten, SUM(doanh_thu) dt, SUM(so_luong) sl
           FROM ${BANG} WHERE nhom_hang_cu = @sku_nhom ${wa.where}
          GROUP BY ma_sku ORDER BY dt DESC LIMIT 10`,
        { ...wa.params, sku_nhom: nhom }, "gio"
      )
    : [];

  return (
    <Luoi>
      <O w={7} tieu_de="Xếp hạng nhóm hàng" ghi_chu="Bấm một nhóm để xem SKU bên phải">
        <div style={{ display: "grid", gap: 4 }}>
          {xepNhom.map((r) => {
            const on = r.nhom === nhom;
            const sp2 = new URLSearchParams(Object.entries(sp).filter(([, v]) => typeof v === "string") as [string, string][]);
            sp2.set("sku", r.nhom);
            return (
              <a
                key={r.nhom}
                href={`?${sp2.toString()}`}
                style={{
                  display: "flex", justifyContent: "space-between", gap: 12,
                  padding: "7px 11px", borderRadius: 8, fontSize: 13,
                  background: on ? "var(--accent-soft)" : "transparent",
                  color: on ? "var(--accent)" : "var(--ink)",
                  fontWeight: on ? 700 : 500,
                }}
              >
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.nhom}</span>
                <span className="mono" style={{ color: on ? "var(--accent)" : "var(--ink-soft)" }}>
                  {(Number(r.dt) / 1e6).toLocaleString("vi-VN", { maximumFractionDigits: 0 })} tr
                </span>
              </a>
            );
          })}
        </div>
      </O>
      <O w={5} tieu_de={`SKU nhóm: ${nhom}`} ghi_chu="Top 10 theo doanh thu">
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
          <tbody>
            {sku.map((s, i) => (
              <tr key={i} style={{ borderTop: i ? "1px solid var(--line)" : "none" }}>
                <td style={{ padding: "6px 4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 150 }}>{s.ten}</td>
                <td className="mono" style={{ padding: "6px 4px", textAlign: "right", color: "var(--ink-soft)" }}>{Number(s.sl).toLocaleString("vi-VN")}</td>
                <td className="mono" style={{ padding: "6px 4px", textAlign: "right", fontWeight: 600 }}>
                  {(Number(s.dt) / 1e6).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} tr
                </td>
              </tr>
            ))}
            {!sku.length && <tr><td style={{ padding: 12, color: "var(--ink-soft)" }}>Không có SKU.</td></tr>}
          </tbody>
        </table>
      </O>
    </Luoi>
  );
}

/* ------------------------------------------------------------------ helper */

// Ghép điều kiện ngày (nếu người dùng chọn) vào WHERE-chiều cho các chart theo kỳ.
function wDate(loc: ReturnType<typeof docLoc>, whereChieuStr: string): string {
  const d: string[] = [];
  if (loc.tu) d.push(`${NGAY} >= @loc_tu`);
  if (loc.den) d.push(`${NGAY} <= @loc_den`);
  return (d.length ? " AND " + d.join(" AND ") : "") + whereChieuStr;
}
function dateParams(loc: ReturnType<typeof docLoc>): Record<string, unknown> {
  const p: Record<string, unknown> = {};
  if (loc.tu) p.loc_tu = loc.tu;
  if (loc.den) p.loc_den = loc.den;
  return p;
}
