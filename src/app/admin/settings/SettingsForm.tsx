"use client";

import { useActionState } from "react";
import { saveSettingsAction, type FormState } from "../actions";

const inp = {
  width: "100%", padding: "9px 12px", fontSize: 14,
  border: "1px solid var(--line-strong)", borderRadius: 8,
  background: "var(--panel)", outline: "none",
} as const;
const lbl = { fontSize: 12, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 5, display: "block" } as const;

export default function SettingsForm({ initial }: { initial: Record<string, string> }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveSettingsAction, {});

  return (
    <form action={action} style={{ maxWidth: 520 }}>
      <div style={{ marginBottom: 16 }}>
        <label style={lbl}>Tiêu đề trang chủ</label>
        <input name="home_title" style={inp} defaultValue={initial.home_title ?? "Danh mục dữ liệu"} />
      </div>
      <div style={{ marginBottom: 20 }}>
        <label style={lbl}>Mô tả phụ trang chủ (để trống = tự đếm số dataset)</label>
        <input name="home_subtitle" style={inp} defaultValue={initial.home_subtitle ?? ""} placeholder="vd: Danh mục dữ liệu nội bộ công ty" />
      </div>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <button
          type="submit"
          disabled={pending}
          style={{
            fontSize: 14, fontWeight: 600, color: "#fff", background: "var(--accent)",
            border: "none", borderRadius: 8, padding: "10px 22px",
            cursor: pending ? "default" : "pointer", opacity: pending ? 0.7 : 1,
          }}
        >
          {pending ? "Đang lưu…" : "Lưu cấu hình"}
        </button>
        {state.ok && <span style={{ color: "var(--accent)", fontSize: 13, fontWeight: 600 }}>Đã lưu ✓</span>}
        {state.error && <span style={{ color: "#b5423a", fontSize: 13 }}>{state.error}</span>}
      </div>
    </form>
  );
}
