"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";

export default function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, {});

  return (
    <div style={{ maxWidth: 380, margin: "12vh auto 0", padding: "0 24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        <span
          style={{
            width: 30, height: 30, borderRadius: 7, background: "var(--accent)",
            display: "grid", placeItems: "center", color: "#fff", fontWeight: 700,
          }}
        >D</span>
        <span style={{ fontWeight: 700, fontSize: 18 }}>Data Catalog</span>
      </div>
      <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>Đăng nhập</h1>
      <p style={{ color: "var(--ink-soft)", fontSize: 14, margin: "0 0 18px" }}>
        Nhập mật khẩu chung của team để tiếp tục.
      </p>

      <form action={action}>
        <input type="hidden" name="next" value={next} />
        <input
          name="password"
          type="password"
          autoFocus
          placeholder="Mật khẩu"
          aria-label="Mật khẩu"
          style={{
            width: "100%", padding: "11px 14px", fontSize: 14,
            border: "1px solid var(--line-strong)", borderRadius: 8,
            background: "var(--panel)", outline: "none", marginBottom: 12,
          }}
        />
        {state.error && (
          <p style={{ color: "#b5423a", fontSize: 13, margin: "0 0 12px" }}>{state.error}</p>
        )}
        <button
          type="submit"
          disabled={pending}
          style={{
            width: "100%", padding: "11px 14px", fontSize: 14, fontWeight: 600,
            color: "#fff", background: "var(--accent)", border: "none",
            borderRadius: 8, cursor: pending ? "default" : "pointer", opacity: pending ? 0.7 : 1,
          }}
        >
          {pending ? "Đang kiểm tra…" : "Đăng nhập"}
        </button>
      </form>
    </div>
  );
}
