"use client";

import { useActionState } from "react";
import type { Dataset } from "@/lib/types";
import { saveRelationshipAction, type FormState } from "../actions";

const inp = {
  padding: "9px 12px", fontSize: 14, border: "1px solid var(--line-strong)",
  borderRadius: 8, background: "var(--panel)", outline: "none",
} as const;

export default function RelationshipForm({ datasets }: { datasets: Dataset[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveRelationshipAction, {});

  return (
    <form
      action={action}
      style={{
        display: "grid", gridTemplateColumns: "1fr auto 1fr 160px auto", gap: 10,
        alignItems: "end", background: "var(--panel)", border: "1px solid var(--line)",
        borderRadius: 10, padding: 16, marginBottom: 20, flexWrap: "wrap",
      }}
    >
      <div>
        <div style={lbl}>Từ (nguồn)</div>
        <select name="from" style={{ ...inp, width: "100%" }} defaultValue="">
          <option value="" disabled>— chọn —</option>
          {datasets.map((d) => <option key={d.id} value={d.id}>{d.ten}</option>)}
        </select>
      </div>
      <div style={{ paddingBottom: 9, color: "var(--ink-soft)" }}>→</div>
      <div>
        <div style={lbl}>Đến (đích)</div>
        <select name="to" style={{ ...inp, width: "100%" }} defaultValue="">
          <option value="" disabled>— chọn —</option>
          {datasets.map((d) => <option key={d.id} value={d.id}>{d.ten}</option>)}
        </select>
      </div>
      <div>
        <div style={lbl}>Loại</div>
        <input name="loai" style={{ ...inp, width: "100%" }} placeholder="JOIN key" defaultValue="JOIN key" />
      </div>
      <button
        type="submit"
        disabled={pending}
        style={{
          fontSize: 14, fontWeight: 600, color: "#fff", background: "var(--accent)",
          border: "none", borderRadius: 8, padding: "10px 18px", cursor: "pointer",
          opacity: pending ? 0.7 : 1, height: 40,
        }}
      >
        Thêm
      </button>
      <div style={{ gridColumn: "1 / -1" }}>
        <div style={lbl}>Mô tả (khóa nối / ghi chú)</div>
        <input name="mo_ta" style={{ ...inp, width: "100%" }} placeholder="vd: nhom_hh_L3 ↔ nhom_hh_L3_ma" />
      </div>
      {state.error && <p style={{ gridColumn: "1 / -1", color: "#b5423a", fontSize: 13, margin: 0 }}>{state.error}</p>}
    </form>
  );
}

const lbl = { fontSize: 12, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 5 } as const;
