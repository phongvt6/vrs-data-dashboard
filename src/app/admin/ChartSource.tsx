"use client";

import { useEffect, useState, useTransition } from "react";
import type { QueryParams } from "@/lib/chart-data";
import type { SourceView } from "@/lib/types";
import type { ChartRow } from "@/chart/types";
import { chayThuAction, docCotAction } from "./dashboards/query-actions";

const inp = {
  width: "100%", padding: "9px 12px", fontSize: 14,
  border: "1px solid var(--line-strong)", borderRadius: 8,
  background: "var(--panel)", outline: "none",
} as const;
const label = { fontSize: 12, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 5, display: "block" } as const;

export type TruyVan = QueryParams & {
  source_id: string;
  sql: string;
  cache_ttl_giay: number;
};

export const truyVanRong = (): TruyVan => ({
  source_id: "", sql: "", cache_ttl_giay: 900,
  phep: "sum", sap_xep: "khong",
});

/** Tab đã khai báo ở nguồn (collector ghi vào config). */
function tabsCua(s?: SourceView): string[] {
  const tabs = s?.config?.tabs;
  if (!Array.isArray(tabs)) return [];
  return tabs.map((t) => (typeof t === "string" ? t : String((t as { title?: string }).title ?? ""))).filter(Boolean);
}

export default function ChartSource({
  sources,
  value,
  onChange,
  onRows,
}: {
  sources: SourceView[];
  value: TruyVan;
  onChange: (v: TruyVan) => void;
  /** Báo lên form cha để phần xem trước đổi sang dùng số thật. */
  onRows: (rows: ChartRow[] | null) => void;
}) {
  const [cot, setCot] = useState<string[]>([]);
  const [loi, setLoi] = useState("");
  const [ghiChu, setGhiChu] = useState("");
  const [dangChay, startChay] = useTransition();

  const source = sources.find((s) => s.id === value.source_id);
  const laSheets = source?.type === "sheets";
  const tabs = tabsCua(source);

  const set = (patch: Partial<TruyVan>) => onChange({ ...value, ...patch });

  // Nạp danh sách cột của tab đang chọn. Việc DỌN cột cũ nằm ở onChange của
  // nguồn/tab, không nằm ở đây — effect chỉ đi lấy dữ liệu ngoài.
  useEffect(() => {
    if (!laSheets || !value.source_id || !value.tab) return;
    let con = true;
    docCotAction(value.source_id, value.tab).then((kq) => {
      if (!con) return;
      setCot(kq.cot);
      setLoi(kq.loi ?? "");
    });
    return () => { con = false; };
  }, [laSheets, value.source_id, value.tab]);

  const chayThu = () =>
    startChay(async () => {
      setLoi("");
      setGhiChu("");
      const kq = await chayThuAction({
        source_id: value.source_id,
        sql: value.sql,
        params: {
          tab: value.tab, cot_label: value.cot_label, cot_series: value.cot_series,
          cot_value: value.cot_value, cot_value2: value.cot_value2,
          phep: value.phep, sap_xep: value.sap_xep, gioi_han: value.gioi_han,
        },
      });
      if (kq.loi) {
        setLoi(kq.loi);
        onRows(null);
      } else {
        setGhiChu(`Lấy được ${kq.rows.length} dòng — phần xem trước bên trên đang là số thật.`);
        onRows(kq.rows);
      }
    });

  // Chọn được từ danh sách khi đã đọc được header; chưa đọc được thì gõ tay.
  const chonCot = (ten: string, khoa: keyof TruyVan, goiY?: string) => (
    <ChonCot
      ten={ten}
      cot={cot}
      value={String(value[khoa] ?? "")}
      goiY={goiY}
      onChange={(v) => set({ [khoa]: v } as Partial<TruyVan>)}
    />
  );

  return (
    <div style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 18, background: "var(--panel)", marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>Nguồn dữ liệu</h2>
        {value.source_id && (
          <button type="button" onClick={() => { onChange(truyVanRong()); onRows(null); setCot([]); setGhiChu(""); setLoi(""); }} style={linkBtn}>
            Bỏ nguồn, quay lại số liệu mẫu
          </button>
        )}
      </div>
      <p style={{ margin: "0 0 14px", fontSize: 12.5, color: "var(--ink-soft)" }}>
        Không chọn nguồn thì chart vẽ bằng số liệu mẫu.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 12 }}>
        <div>
          <label style={label}>Nguồn</label>
          <select
            style={inp}
            value={value.source_id}
            onChange={(e) => { set({ source_id: e.target.value, tab: "", cot_label: "", cot_series: "", cot_value: "", cot_value2: "" }); setCot([]); onRows(null); }}
          >
            <option value="">— dùng số liệu mẫu —</option>
            {sources.map((s) => (
              <option key={s.id} value={s.id}>{s.label}{s.enabled ? "" : " (đang tắt)"}</option>
            ))}
          </select>
        </div>

        {laSheets && (
          <div>
            <label style={label}>Tab</label>
            <select style={inp} value={value.tab ?? ""} onChange={(e) => { set({ tab: e.target.value, cot_label: "", cot_series: "", cot_value: "", cot_value2: "" }); setCot([]); onRows(null); }}>
              <option value="">— chọn tab —</option>
              {tabs.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        )}
      </div>

      {value.source_id && !laSheets && (
        <div style={{ marginBottom: 12 }}>
          <label style={label}>Câu lệnh SELECT</label>
          <textarea
            style={{ ...inp, minHeight: 90, resize: "vertical", fontFamily: "ui-monospace, Menlo, monospace", fontSize: 13 }}
            value={value.sql}
            onChange={(e) => set({ sql: e.target.value })}
            placeholder="SELECT ten_chi_nhanh AS nhan, sum(doanh_thu) AS gia_tri FROM … GROUP BY 1"
          />
          <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--ink-soft)" }}>
            Chỉ chạy được một câu SELECT, không cho lệnh ghi, trần {`5.000`} dòng.
          </p>
        </div>
      )}

      {value.source_id && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, marginBottom: 12 }}>
            {chonCot("Cột hạng mục (label)", "cot_label", "nhan")}
            {chonCot("Cột series (tuỳ chọn)", "cot_series", "series")}
            {chonCot("Cột giá trị", "cot_value", "gia_tri")}
            {chonCot("Cột giá trị 2 (tuỳ chọn)", "cot_value2", "gia_tri_2")}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 14 }}>
            {laSheets && (
              <div>
                <label style={label}>Phép gộp</label>
                <select style={inp} value={value.phep ?? "sum"} onChange={(e) => set({ phep: e.target.value as TruyVan["phep"] })}>
                  <option value="sum">Cộng tổng</option>
                  <option value="count">Đếm dòng</option>
                  <option value="avg">Trung bình</option>
                  <option value="min">Nhỏ nhất</option>
                  <option value="max">Lớn nhất</option>
                </select>
              </div>
            )}
            <div>
              <label style={label}>Sắp xếp</label>
              <select style={inp} value={value.sap_xep ?? "khong"} onChange={(e) => set({ sap_xep: e.target.value as TruyVan["sap_xep"] })}>
                <option value="khong">Giữ nguyên</option>
                <option value="gia_tri_giam">Giá trị giảm dần</option>
                <option value="gia_tri_tang">Giá trị tăng dần</option>
                <option value="nhan">Theo tên hạng mục</option>
              </select>
            </div>
            <div>
              <label style={label}>Lấy tối đa mấy hạng mục</label>
              <input
                style={inp} type="number" min={0}
                value={value.gioi_han ?? ""}
                onChange={(e) => set({ gioi_han: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="để trống = lấy hết"
              />
            </div>
            <div>
              <label style={label}>Cache (giây)</label>
              <input
                style={inp} type="number" min={0}
                value={value.cache_ttl_giay}
                onChange={(e) => set({ cache_ttl_giay: Number(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={chayThu}
              disabled={dangChay}
              style={{
                fontSize: 13, fontWeight: 600, color: "var(--accent)", background: "none",
                border: "1px solid var(--accent)", borderRadius: 8, padding: "8px 16px",
                cursor: dangChay ? "default" : "pointer", opacity: dangChay ? 0.6 : 1,
              }}
            >
              {dangChay ? "Đang chạy…" : "Chạy thử"}
            </button>
            {ghiChu && <span style={{ fontSize: 12.5, color: "var(--accent)" }}>{ghiChu}</span>}
            {loi && <span style={{ fontSize: 12.5, color: "#b5423a" }}>{loi}</span>}
          </div>
        </>
      )}
    </div>
  );
}

function ChonCot({
  ten, cot, value, goiY, onChange,
}: {
  ten: string;
  cot: string[];
  value: string;
  goiY?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label style={label}>{ten}</label>
      {cot.length ? (
        <select style={inp} value={value} onChange={(e) => onChange(e.target.value)}>
          <option value="">— không dùng —</option>
          {cot.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      ) : (
        <input style={inp} value={value} onChange={(e) => onChange(e.target.value)} placeholder={goiY} />
      )}
    </div>
  );
}

const linkBtn = {
  fontSize: 12.5, fontWeight: 600, color: "var(--ink-soft)", background: "none",
  border: "none", cursor: "pointer", padding: 0, textDecoration: "underline",
} as const;
