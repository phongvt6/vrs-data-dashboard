"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { SOURCE_TYPE_LABEL, type SourceType, type SourceView } from "@/lib/types";
import { saveSourceAction, type SourceFormState } from "./actions";

const inp = {
  width: "100%", padding: "9px 12px", fontSize: 14,
  border: "1px solid var(--line-strong)", borderRadius: 8,
  background: "var(--panel)", outline: "none",
} as const;
const lbl = { fontSize: 12, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 5, display: "block" } as const;
const hint = { fontSize: 12, color: "var(--ink-soft)", marginTop: 4 } as const;

const TYPES: SourceType[] = ["postgres", "airtable", "bigquery", "sheets"];

export default function SourceForm({ initial, isNew }: { initial?: SourceView; isNew: boolean }) {
  const [state, action, pending] = useActionState<SourceFormState, FormData>(saveSourceAction, {});
  const [type, setType] = useState<SourceType>(initial?.type ?? "postgres");
  const c = (initial?.config ?? {}) as Record<string, unknown>;
  const arr = (v: unknown) => (Array.isArray(v) ? v.join(", ") : "");

  const secretLabel: Record<SourceType, string> = {
    postgres: "Connection string (postgresql://…)",
    airtable: "Personal Access Token",
    bigquery: "Service-account JSON",
    sheets: "Service-account JSON",
  };
  const bigSecret = type === "bigquery" || type === "sheets";

  return (
    <form action={action} style={{ maxWidth: 640 }}>
      {!isNew && <input type="hidden" name="id" value={initial!.id} />}
      <input type="hidden" name="isNew" value={isNew ? "1" : "0"} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>{isNew ? "Thêm nguồn" : `Sửa: ${initial?.label}`}</h1>
        <Link href="/admin/sources" style={{ fontSize: 13, color: "var(--ink-soft)" }}>← Về Nguồn dữ liệu</Link>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={lbl}>Loại nguồn</label>
        <select name="type" style={inp} value={type} onChange={(e) => setType(e.target.value as SourceType)}>
          {TYPES.map((t) => <option key={t} value={t}>{SOURCE_TYPE_LABEL[t]}</option>)}
        </select>
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={lbl}>Tên nguồn (để nhận biết)</label>
        <input name="label" style={inp} defaultValue={initial?.label ?? ""} placeholder="vd: Supabase Production" />
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={lbl}>Nhãn hiển thị trên catalog</label>
        <input name="nguon" style={inp} defaultValue={initial?.nguon ?? SOURCE_TYPE_LABEL[type]} placeholder={SOURCE_TYPE_LABEL[type]} />
      </div>

      {/* Trường riêng theo loại */}
      {type === "postgres" && (
        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>Schema (cách nhau dấu phẩy)</label>
          <input name="schemas" style={inp} defaultValue={arr(c.schemas) || "public"} placeholder="public" />
        </div>
      )}
      {type === "airtable" && (
        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>Base ID</label>
          <input name="baseId" style={inp} defaultValue={String(c.baseId ?? "")} placeholder="appXXXXXXXX" />
        </div>
      )}
      {type === "bigquery" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
          <div><label style={lbl}>Project</label><input name="project" style={inp} defaultValue={String(c.project ?? "")} placeholder="gwm-1673948129693" /></div>
          <div><label style={lbl}>Dataset</label><input name="dataset" style={inp} defaultValue={String(c.dataset ?? "")} placeholder="Revenue" /></div>
          <div>
            {/* Dataset ngoài US phải khai đúng location, không thì job BigQuery báo "not found". */}
            <label style={lbl}>Location</label>
            <input name="location" style={inp} defaultValue={String(c.location ?? "")} placeholder="US · asia-southeast1" />
          </div>
        </div>
      )}
      {type === "bigquery" && (
        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>Bảng cần lấy (cách nhau dấu phẩy)</label>
          <input name="tables" style={inp} defaultValue={arr(c.tables)} placeholder="doanh_thu_chi_tiet, map_nhom_hang_cu" />
          <p style={hint}>
            Để trống = lấy <strong>mọi</strong> bảng trong dataset. Dataset thật thường lẫn
            hàng trăm bảng snapshot — nên liệt kê đúng bảng cần dùng.
          </p>
        </div>
      )}
      {type === "sheets" && (
        <>
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Spreadsheet ID</label>
            <input name="spreadsheetId" style={inp} defaultValue={String(c.spreadsheetId ?? "")} placeholder="1AbC…" />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={lbl}>Tab (cách nhau dấu phẩy — để trống = tất cả)</label>
            <input name="tabs" style={inp} defaultValue={arr(c.tabs)} placeholder="TONG_HOP, P&L Data" />
          </div>
        </>
      )}

      <div style={{ marginBottom: 14 }}>
        <label style={lbl}>{secretLabel[type]}</label>
        {bigSecret ? (
          <textarea name="secret" style={{ ...inp, minHeight: 96, fontFamily: "var(--mono, monospace)", resize: "vertical" }}
            placeholder={initial?.hasSecret ? "•••• đã lưu — dán JSON mới để thay, để trống để giữ" : '{ "type": "service_account", … }'} />
        ) : (
          <input name="secret" type="password" style={inp}
            placeholder={initial?.hasSecret ? "•••• đã lưu — nhập mới để thay, để trống để giữ" : ""} />
        )}
        <div style={hint}>
          {type === "postgres" && "Supabase → Settings → Database → Connection string (Session pooler)."}
          {type === "airtable" && "PAT có quyền schema.bases:read."}
          {bigSecret && "Dán toàn bộ nội dung file JSON service-account. Nhớ share quyền đọc cho service account."}
        </div>
      </div>

      <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, fontSize: 14 }}>
        <input type="checkbox" name="enabled" defaultChecked={initial?.enabled ?? true} /> Bật nguồn này
      </label>

      {state.error && <p style={{ color: "#b5423a", fontSize: 13, margin: "0 0 12px" }}>{state.error}</p>}

      <div style={{ display: "flex", gap: 10 }}>
        <button type="submit" disabled={pending} style={{
          fontSize: 14, fontWeight: 600, color: "#fff", background: "var(--accent)", border: "none",
          borderRadius: 8, padding: "10px 22px", cursor: pending ? "default" : "pointer", opacity: pending ? 0.7 : 1,
        }}>{pending ? "Đang lưu…" : "Lưu nguồn"}</button>
        <Link href="/admin/sources" style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-soft)", padding: "10px 18px" }}>Hủy</Link>
      </div>
    </form>
  );
}
