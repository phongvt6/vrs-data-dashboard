"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import type { Column, Dataset } from "@/lib/types";
import { saveDatasetAction, type FormState } from "./actions";

const inp = {
  width: "100%", padding: "9px 12px", fontSize: 14,
  border: "1px solid var(--line-strong)", borderRadius: 8,
  background: "var(--panel)", outline: "none",
} as const;
const label = { fontSize: 12, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 5, display: "block" } as const;

function emptyCol(): Column {
  return { ten: "", kieu: "", khoa: "", mo_ta: "" };
}

export default function DatasetForm({
  initial,
  isNew,
  sources,
}: {
  initial?: Dataset;
  isNew: boolean;
  sources: string[];
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveDatasetAction, {});

  const [id, setId] = useState(initial?.id ?? "");
  const [ten, setTen] = useState(initial?.ten ?? "");
  const [nguon, setNguon] = useState(initial?.nguon ?? (sources[0] ?? "BigQuery"));
  const [duong_dan, setDuongDan] = useState(initial?.duong_dan ?? "");
  const [chu_so_huu, setChuSoHuu] = useState(initial?.chu_so_huu ?? "");
  const [tan_suat, setTanSuat] = useState(initial?.tan_suat ?? "");
  const [phan_loai_bao_mat, setBaoMat] = useState(initial?.phan_loai_bao_mat ?? "Nội bộ");
  const [trang_thai, setTrangThai] = useState(initial?.trang_thai ?? "prototype");
  const [so_dong, setSoDong] = useState(String(initial?.so_dong ?? 0));
  const [mo_ta, setMoTa] = useState(initial?.mo_ta ?? "");
  const [columns, setColumns] = useState<Column[]>(initial?.columns ?? [emptyCol()]);

  const setCol = (i: number, patch: Partial<Column>) =>
    setColumns((cs) => cs.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const move = (i: number, dir: -1 | 1) =>
    setColumns((cs) => {
      const j = i + dir;
      if (j < 0 || j >= cs.length) return cs;
      const next = [...cs];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const payload = {
    id: isNew ? id : initial!.id,
    ten, nguon, duong_dan, chu_so_huu, tan_suat, phan_loai_bao_mat,
    trang_thai, so_dong, mo_ta, cap_nhat_lan_cuoi: initial?.cap_nhat_lan_cuoi ?? "",
    columns,
  };

  return (
    <form action={action}>
      <input type="hidden" name="payload" value={JSON.stringify(payload)} />
      <input type="hidden" name="isNew" value={isNew ? "1" : "0"} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>
          {isNew ? "Thêm dataset" : `Sửa: ${initial?.ten}`}
        </h1>
        <Link href="/admin" style={{ fontSize: 13, color: "var(--ink-soft)" }}>← Về Quản trị</Link>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 14, marginBottom: 16 }}>
        <div>
          <label style={label}>Mã (id) — chữ thường, số, gạch dưới</label>
          <input
            style={{ ...inp, opacity: isNew ? 1 : 0.6 }}
            className="mono"
            value={id}
            onChange={(e) => setId(e.target.value)}
            readOnly={!isNew}
            placeholder="vd doanh_thu"
          />
        </div>
        <div>
          <label style={label}>Tên hiển thị</label>
          <input style={inp} value={ten} onChange={(e) => setTen(e.target.value)} placeholder="Doanh thu & Lợi nhuận" />
        </div>
        <div>
          <label style={label}>Nguồn</label>
          <input style={inp} value={nguon} onChange={(e) => setNguon(e.target.value)} list="sources" placeholder="BigQuery" />
          <datalist id="sources">
            {[...new Set([...sources, "BigQuery", "Google Sheets", "Airtable", "Supabase"])].map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
        <div>
          <label style={label}>Đường dẫn</label>
          <input style={inp} className="mono" value={duong_dan} onChange={(e) => setDuongDan(e.target.value)} placeholder="project.dataset.table" />
        </div>
        <div>
          <label style={label}>Chủ sở hữu</label>
          <input style={inp} value={chu_so_huu} onChange={(e) => setChuSoHuu(e.target.value)} placeholder="Team Data" />
        </div>
        <div>
          <label style={label}>Tần suất cập nhật</label>
          <input style={inp} value={tan_suat} onChange={(e) => setTanSuat(e.target.value)} placeholder="Hàng ngày" />
        </div>
        <div>
          <label style={label}>Phân loại bảo mật</label>
          <input style={inp} value={phan_loai_bao_mat} onChange={(e) => setBaoMat(e.target.value)} placeholder="Nội bộ" />
        </div>
        <div>
          <label style={label}>Trạng thái</label>
          <select style={inp} value={trang_thai} onChange={(e) => setTrangThai(e.target.value)}>
            <option value="prototype">prototype</option>
            <option value="production">production</option>
          </select>
        </div>
        <div>
          <label style={label}>Số dòng</label>
          <input style={inp} type="number" value={so_dong} onChange={(e) => setSoDong(e.target.value)} />
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={label}>Mô tả</label>
        <textarea style={{ ...inp, minHeight: 68, resize: "vertical" }} value={mo_ta} onChange={(e) => setMoTa(e.target.value)} />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Cột ({columns.length})</h2>
        <button type="button" onClick={() => setColumns((c) => [...c, emptyCol()])} style={miniBtn}>+ Thêm cột</button>
      </div>

      <div style={{ border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden", marginBottom: 22 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#eef1f0", textAlign: "left" }}>
              <th style={th}>Tên cột</th>
              <th style={th}>Kiểu</th>
              <th style={{ ...th, width: 90 }}>Khóa</th>
              <th style={th}>Mô tả</th>
              <th style={{ ...th, width: 96 }}></th>
            </tr>
          </thead>
          <tbody>
            {columns.map((c, i) => (
              <tr key={i} style={{ borderTop: "1px solid var(--line)" }}>
                <td style={td}><input style={cellInp} className="mono" value={c.ten} onChange={(e) => setCol(i, { ten: e.target.value })} /></td>
                <td style={td}><input style={cellInp} className="mono" value={c.kieu} onChange={(e) => setCol(i, { kieu: e.target.value })} /></td>
                <td style={td}>
                  <select style={cellInp} value={c.khoa} onChange={(e) => setCol(i, { khoa: e.target.value })}>
                    <option value="">—</option>
                    <option value="PK">PK</option>
                    <option value="FK">FK</option>
                  </select>
                </td>
                <td style={td}><input style={cellInp} value={c.mo_ta} onChange={(e) => setCol(i, { mo_ta: e.target.value })} /></td>
                <td style={{ ...td, whiteSpace: "nowrap" }}>
                  <button type="button" onClick={() => move(i, -1)} style={iconBtn} title="Lên">↑</button>
                  <button type="button" onClick={() => move(i, 1)} style={iconBtn} title="Xuống">↓</button>
                  <button type="button" onClick={() => setColumns((cs) => cs.filter((_, j) => j !== i))} style={{ ...iconBtn, color: "#b5423a" }} title="Xóa">✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
          {pending ? "Đang lưu…" : "Lưu"}
        </button>
        <Link href="/admin" style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-soft)", padding: "10px 18px" }}>Hủy</Link>
      </div>
    </form>
  );
}

const th = { padding: "8px 10px", fontWeight: 600 } as const;
const td = { padding: "4px 8px" } as const;
const cellInp = {
  width: "100%", padding: "6px 8px", fontSize: 13,
  border: "1px solid var(--line)", borderRadius: 6, background: "var(--panel)", outline: "none",
} as const;
const miniBtn = {
  fontSize: 13, fontWeight: 600, color: "var(--accent)", background: "none",
  border: "1px solid var(--accent)", borderRadius: 7, padding: "5px 12px", cursor: "pointer",
} as const;
const iconBtn = {
  fontSize: 13, background: "none", border: "none", cursor: "pointer",
  color: "var(--ink-soft)", padding: "2px 5px",
} as const;
