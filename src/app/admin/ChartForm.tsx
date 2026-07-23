"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import ChartTile from "@/chart/ChartTile";
import { sampleRows } from "@/chart/sample";
import { CHART_TYPES, chartType, chartTypesByJob, type ChartRow } from "@/chart/types";
import { CHART_WIDTHS, type Chart, type SourceView } from "@/lib/types";
import { saveChartAction, type FormState } from "./dashboards/chart-actions";
import ChartSource, { truyVanRong, type TruyVan } from "./ChartSource";

const inp = {
  width: "100%", padding: "9px 12px", fontSize: 14,
  border: "1px solid var(--line-strong)", borderRadius: 8,
  background: "var(--panel)", outline: "none",
} as const;
const label = { fontSize: 12, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 5, display: "block" } as const;

export default function ChartForm({
  dashboardId,
  dashboardTen,
  initial,
  soChartHienCo,
  sources,
  truyVanBanDau,
}: {
  dashboardId: string;
  dashboardTen: string;
  initial?: Chart;
  soChartHienCo: number;
  sources: SourceView[];
  truyVanBanDau?: TruyVan;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveChartAction, {});

  const [loai, setLoai] = useState(initial?.loai ?? CHART_TYPES[0].id);
  const [tieu_de, setTieuDe] = useState(initial?.tieu_de ?? "");
  const [mo_ta, setMoTa] = useState(initial?.mo_ta ?? "");
  const [w, setW] = useState(initial?.w ?? 6);
  const [dinh_dang, setDinhDang] = useState(initial?.config?.dinh_dang ?? "so");
  const [don_vi, setDonVi] = useState(initial?.config?.don_vi ?? "");
  const [muc_tieu, setMucTieu] = useState(
    initial?.config?.muc_tieu === undefined ? "" : String(initial.config.muc_tieu)
  );

  const [truyVan, setTruyVan] = useState<TruyVan>(truyVanBanDau ?? truyVanRong());
  // Chạy thử xong thì phần xem trước đổi sang số thật; chưa chạy thì vẫn là mẫu.
  const [rowsThat, setRowsThat] = useState<ChartRow[] | null>(null);

  const meta = chartType(loai);
  const rowsMau = useMemo(() => sampleRows(loai), [loai]);
  const rows = rowsThat ?? rowsMau;
  const config = useMemo(
    () => ({ dinh_dang, ...(don_vi ? { don_vi } : {}), ...(muc_tieu ? { muc_tieu: Number(muc_tieu) } : {}) }),
    [dinh_dang, don_vi, muc_tieu]
  );

  const payload = {
    id: initial?.id ?? "",
    dashboard_id: dashboardId,
    tieu_de, loai, mo_ta, w,
    h: initial?.h ?? 2,
    pos: initial?.pos ?? soChartHienCo,
    config,
    truy_van: truyVan,
  };

  const veDanhSach = `/admin/dashboard/${dashboardId}/charts`;

  return (
    <form action={action}>
      <input type="hidden" name="payload" value={JSON.stringify(payload)} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>
            {initial ? `Sửa chart: ${initial.tieu_de}` : "Thêm chart"}
          </h1>
          <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: "4px 0 0" }}>
            Trong dashboard <strong>{dashboardTen}</strong>
          </p>
        </div>
        <Link href={veDanhSach} style={{ fontSize: 13, color: "var(--ink-soft)" }}>← Về danh sách chart</Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 360px) 1fr", gap: 22, alignItems: "start" }}>
        {/* Cột trái: chọn loại, xếp theo mục đích phân tích chứ không theo tên biểu đồ. */}
        <div>
          <label style={label}>Loại chart — chọn theo câu hỏi cần trả lời</label>
          <div style={{ border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden", background: "var(--panel)" }}>
            {chartTypesByJob().map(({ job, types }) => (
              <div key={job.id}>
                <div
                  style={{
                    padding: "9px 14px", background: "#eef1f0", borderTop: "1px solid var(--line)",
                    fontSize: 12, fontWeight: 700,
                  }}
                >
                  {job.ten}
                  <div style={{ fontWeight: 400, color: "var(--ink-soft)", fontSize: 11.5, marginTop: 2 }}>
                    {job.cau_hoi}
                  </div>
                </div>
                {types.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setLoai(t.id)}
                    style={{
                      display: "block", width: "100%", textAlign: "left", cursor: "pointer",
                      padding: "9px 14px", fontSize: 13.5, border: "none",
                      borderTop: "1px solid var(--line)",
                      fontWeight: loai === t.id ? 700 : 500,
                      background: loai === t.id ? "var(--accent-soft)" : "var(--panel)",
                      color: loai === t.id ? "var(--accent)" : "var(--ink)",
                    }}
                  >
                    {t.ten}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Cột phải: xem trước + hướng dẫn + tuỳ chọn. */}
        <div>
          <div style={{ border: "1px solid var(--line)", borderRadius: 12, background: "var(--panel)", padding: 18, marginBottom: 16 }}>
            <div style={{ fontSize: 11.5, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.04em", color: rowsThat ? "var(--accent)" : "var(--ink-soft)" }}>
              {rowsThat ? `Xem trước · số thật (${rowsThat.length} dòng)` : "Xem trước · số liệu mẫu"}
            </div>
            <ChartTile loai={loai} rows={rows} config={config} height={260} />
          </div>

          <ChartSource sources={sources} value={truyVan} onChange={setTruyVan} onRows={setRowsThat} />

          {meta && (
            <div style={{ marginBottom: 18 }}>
              <p style={{ margin: "0 0 10px", fontSize: 14, color: "var(--ink-soft)", lineHeight: 1.55 }}>
                {meta.mo_ta}
              </p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
                <Guide tieu_de="Nên dùng khi" mau="var(--accent)" items={meta.nen_dung} />
                <Guide tieu_de="Tránh khi" mau="#b5423a" items={meta.tranh} />
              </div>
              <p style={{ margin: "10px 0 0", fontSize: 12.5, color: "var(--ink-soft)" }}>
                <strong>Dữ liệu cần có:</strong> {meta.dang_du_lieu}
              </p>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 16 }}>
            <div>
              <label style={label}>Tiêu đề chart</label>
              <input style={inp} value={tieu_de} onChange={(e) => setTieuDe(e.target.value)} placeholder="Doanh thu theo chi nhánh" />
            </div>
            <div>
              <label style={label}>Bề ngang</label>
              <select style={inp} value={w} onChange={(e) => setW(Number(e.target.value))}>
                {CHART_WIDTHS.map((x) => <option key={x.w} value={x.w}>{x.nhan}</option>)}
              </select>
            </div>
            <div>
              <label style={label}>Định dạng số</label>
              <select style={inp} value={dinh_dang} onChange={(e) => setDinhDang(e.target.value as typeof dinh_dang)}>
                <option value="so">Số thường</option>
                <option value="tien">Tiền (₫)</option>
                <option value="phan_tram">Phần trăm</option>
              </select>
            </div>
            <div>
              <label style={label}>Đơn vị hiện cạnh số (tuỳ chọn)</label>
              <input style={inp} value={don_vi} onChange={(e) => setDonVi(e.target.value)} placeholder="đơn, xe, lượt…" />
            </div>
            <div>
              <label style={label}>Mốc trần / mục tiêu (tuỳ chọn)</label>
              <input style={inp} type="number" value={muc_tieu} onChange={(e) => setMucTieu(e.target.value)} placeholder="dùng cho thanh tiến độ" />
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <label style={label}>Ghi chú — chart này nói lên điều gì</label>
            <textarea style={{ ...inp, minHeight: 60, resize: "vertical" }} value={mo_ta} onChange={(e) => setMoTa(e.target.value)} />
          </div>

          {state.error && <p style={{ color: "#b5423a", fontSize: 13, margin: "0 0 12px" }}>{state.error}</p>}

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="submit"
              disabled={pending}
              style={{
                fontSize: 14, fontWeight: 600, color: "#fff", background: "var(--accent)",
                border: "none", borderRadius: 8, padding: "10px 22px",
                cursor: pending ? "default" : "pointer", opacity: pending ? 0.7 : 1,
              }}
            >
              {pending ? "Đang lưu…" : "Lưu chart"}
            </button>
            <Link href={veDanhSach} style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-soft)", padding: "10px 18px" }}>
              Hủy
            </Link>
          </div>
        </div>
      </div>
    </form>
  );
}

function Guide({ tieu_de, mau, items }: { tieu_de: string; mau: string; items: string[] }) {
  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: 10, padding: "12px 14px", background: "var(--panel)" }}>
      <div style={{ fontSize: 11.5, fontWeight: 700, color: mau, marginBottom: 7, textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {tieu_de}
      </div>
      <ul style={{ margin: 0, paddingLeft: 16, display: "grid", gap: 5 }}>
        {items.map((s) => (
          <li key={s} style={{ fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.5 }}>{s}</li>
        ))}
      </ul>
    </div>
  );
}
