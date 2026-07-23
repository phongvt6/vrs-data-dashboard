"use client";

import { useActionState } from "react";
import { syncSourceAction, type SyncState } from "./actions";

export default function SourceSyncButton({ id }: { id: string }) {
  const [state, action, pending] = useActionState<SyncState, FormData>(syncSourceAction, {});
  const r = state.report;

  return (
    <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
      <form action={action}>
        <input type="hidden" name="id" value={id} />
        <button
          type="submit"
          disabled={pending}
          style={{
            fontSize: 13, fontWeight: 600, color: "#fff", background: "var(--accent)",
            border: "none", borderRadius: 7, padding: "6px 14px",
            cursor: pending ? "default" : "pointer", opacity: pending ? 0.7 : 1,
          }}
        >
          {pending ? "Đang kéo…" : "Đồng bộ"}
        </button>
      </form>
      {r && (
        <span style={{ fontSize: 12, color: "var(--accent)", textAlign: "right", maxWidth: 320 }}>
          ✓ {r.tables} bảng · +{r.added.length} mới · ~{r.updated.length} cập nhật
          {r.orphaned.length ? ` · ⚠${r.orphaned.length} mất nguồn` : ""}
        </span>
      )}
      {state.error && (
        <span style={{ fontSize: 12, color: "#b5423a", textAlign: "right", maxWidth: 320 }}>✖ {state.error}</span>
      )}
    </span>
  );
}
