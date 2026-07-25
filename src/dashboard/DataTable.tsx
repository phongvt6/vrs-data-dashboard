"use client";

// Bảng dữ liệu chuẩn cho dashboard. Header chữ hoa mờ, thân bài đọc thang chữ
// `--ds-fs-body`, cuộn ngang khi tràn. Màu lấy từ biến `--ds-*`.

import type { ReactNode } from "react";

export type Col = { ten: string; canh?: "trai" | "phai" };

export function DataTable({ cols, children }: { cols: Col[]; children: ReactNode }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--ds-fs-body)" }}>
        <thead>
          <tr>
            {cols.map((c, i) => (
              <th
                key={i}
                style={{
                  textAlign: c.canh === "phai" ? "right" : "left",
                  padding: "7px 8px",
                  borderBottom: "1px solid var(--ds-line)",
                  color: "var(--ds-ink-muted)",
                  fontSize: "var(--ds-fs-caption)",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.03em",
                  whiteSpace: "nowrap",
                  position: "sticky",
                  top: 0,
                  background: "var(--ds-panel)",
                }}
              >
                {c.ten}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
