"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import {
  CONG_CU_GOI_Y,
  TRANG_THAI_DASHBOARD,
  VAI_TRO_DATASET,
  type Dashboard,
  type DashboardDataset,
  type Dataset,
} from "@/lib/types";
import { saveDashboardAction, type FormState } from "./dashboards/actions";

const inp = {
  width: "100%", padding: "9px 12px", fontSize: 14,
  border: "1px solid var(--line-strong)", borderRadius: 8,
  background: "var(--panel)", outline: "none",
} as const;
const label = { fontSize: 12, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 5, display: "block" } as const;

function emptyLink(): DashboardDataset {
  return { dataset_id: "", vai_tro: VAI_TRO_DATASET[0], ghi_chu: "" };
}

export default function DashboardForm({
  initial,
  isNew,
  datasets,
}: {
  initial?: Dashboard;
  isNew: boolean;
  datasets: Dataset[];
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveDashboardAction, {});

  const [id, setId] = useState(initial?.id ?? "");
  const [ten, setTen] = useState(initial?.ten ?? "");
  const [cong_cu, setCongCu] = useState(initial?.cong_cu ?? CONG_CU_GOI_Y[0]);
  const [url, setUrl] = useState(initial?.url ?? "");
  const [chu_so_huu, setChuSoHuu] = useState(initial?.chu_so_huu ?? "");
  const [phong_ban, setPhongBan] = useState(initial?.phong_ban ?? "");
  const [doi_tuong, setDoiTuong] = useState(initial?.doi_tuong ?? "");
  const [tan_suat, setTanSuat] = useState(initial?.tan_suat ?? "");
  const [phan_loai_bao_mat, setBaoMat] = useState(initial?.phan_loai_bao_mat ?? "Nội bộ");
  const [trang_thai, setTrangThai] = useState(initial?.trang_thai ?? "prototype");
  const [anh_bia, setAnhBia] = useState(initial?.anh_bia ?? "");
  const [mo_ta, setMoTa] = useState(initial?.mo_ta ?? "");
  const [links, setLinks] = useState<DashboardDataset[]>(initial?.datasets ?? []);

  const setLink = (i: number, patch: Partial<DashboardDataset>) =>
    setLinks((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const payload = {
    id: isNew ? id : initial!.id,
    ten, mo_ta, cong_cu, url, chu_so_huu, phong_ban, doi_tuong, tan_suat,
    phan_loai_bao_mat, trang_thai, anh_bia,
    cap_nhat_lan_cuoi: initial?.cap_nhat_lan_cuoi ?? "",
    datasets: links,
  };

  return (
    <form action={action}>
      <input type="hidden" name="payload" value={JSON.stringify(payload)} />
      <input type="hidden" name="isNew" value={isNew ? "1" : "0"} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>
          {isNew ? "Thêm dashboard" : `Sửa: ${initial?.ten}`}
        </h1>
        <Link href="/admin/dashboards" style={{ fontSize: 13, color: "var(--ink-soft)" }}>
          ← Về danh sách
        </Link>
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
            placeholder="vd bao_cao_ban_hang"
          />
        </div>
        <div>
          <label style={label}>Tên hiển thị</label>
          <input style={inp} value={ten} onChange={(e) => setTen(e.target.value)} placeholder="Báo cáo bán hàng tháng" />
        </div>
        <div>
          <label style={label}>Công cụ</label>
          <input style={inp} value={cong_cu} onChange={(e) => setCongCu(e.target.value)} list="cong-cu" placeholder="Looker Studio" />
          <datalist id="cong-cu">
            {CONG_CU_GOI_Y.map((s) => <option key={s} value={s} />)}
          </datalist>
        </div>
        <div>
          <label style={label}>Link mở dashboard</label>
          <input style={inp} className="mono" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://lookerstudio.google.com/..." />
        </div>
        <div>
          <label style={label}>Chủ sở hữu</label>
          <input style={inp} value={chu_so_huu} onChange={(e) => setChuSoHuu(e.target.value)} placeholder="Team Data" />
        </div>
        <div>
          <label style={label}>Phòng ban</label>
          <input style={inp} value={phong_ban} onChange={(e) => setPhongBan(e.target.value)} placeholder="Kinh doanh" />
        </div>
        <div>
          <label style={label}>Người xem</label>
          <input style={inp} value={doi_tuong} onChange={(e) => setDoiTuong(e.target.value)} placeholder="BOD, Trưởng phòng" />
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
            {TRANG_THAI_DASHBOARD.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label style={label}>Ảnh bìa (URL)</label>
          <input style={inp} className="mono" value={anh_bia} onChange={(e) => setAnhBia(e.target.value)} placeholder="https://…/anh.png" />
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={label}>Mô tả — dashboard này trả lời câu hỏi gì</label>
        <textarea style={{ ...inp, minHeight: 68, resize: "vertical" }} value={mo_ta} onChange={(e) => setMoTa(e.target.value)} />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Dataset nguồn ({links.length})</h2>
          <p style={{ fontSize: 12.5, color: "var(--ink-soft)", margin: "3px 0 0" }}>
            Khai báo dashboard ăn từ bảng nào để biết nó gãy khi bảng đó đổi schema.
          </p>
        </div>
        <button type="button" onClick={() => setLinks((l) => [...l, emptyLink()])} style={miniBtn}>
          + Thêm dataset
        </button>
      </div>

      <div style={{ border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden", marginBottom: 22 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#eef1f0", textAlign: "left" }}>
              <th style={th}>Dataset</th>
              <th style={{ ...th, width: 150 }}>Vai trò</th>
              <th style={th}>Ghi chú</th>
              <th style={{ ...th, width: 44 }}></th>
            </tr>
          </thead>
          <tbody>
            {links.map((l, i) => (
              <tr key={i} style={{ borderTop: "1px solid var(--line)" }}>
                <td style={td}>
                  <select style={cellInp} value={l.dataset_id} onChange={(e) => setLink(i, { dataset_id: e.target.value })}>
                    <option value="">— chọn dataset —</option>
                    {datasets.map((d) => <option key={d.id} value={d.id}>{d.ten}</option>)}
                  </select>
                </td>
                <td style={td}>
                  <select style={cellInp} value={l.vai_tro} onChange={(e) => setLink(i, { vai_tro: e.target.value })}>
                    {VAI_TRO_DATASET.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </td>
                <td style={td}>
                  <input style={cellInp} value={l.ghi_chu} onChange={(e) => setLink(i, { ghi_chu: e.target.value })} placeholder="vd: chỉ lấy cột doanh thu" />
                </td>
                <td style={{ ...td, whiteSpace: "nowrap" }}>
                  <button
                    type="button"
                    onClick={() => setLinks((ls) => ls.filter((_, j) => j !== i))}
                    style={{ ...iconBtn, color: "#b5423a" }}
                    title="Bỏ"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
            {links.length === 0 && (
              <tr style={{ borderTop: "1px solid var(--line)" }}>
                <td colSpan={4} style={{ padding: "16px", color: "var(--ink-soft)", textAlign: "center" }}>
                  {datasets.length === 0
                    ? "Danh mục dữ liệu chưa có dataset nào để nối."
                    : "Chưa nối dataset nào. Bấm “+ Thêm dataset”."}
                </td>
              </tr>
            )}
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
        <Link href="/admin/dashboards" style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-soft)", padding: "10px 18px" }}>
          Hủy
        </Link>
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
