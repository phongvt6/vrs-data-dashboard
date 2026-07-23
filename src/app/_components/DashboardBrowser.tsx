"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toolClass, toolsInUse, type Dashboard } from "@/lib/types";

const TAT_CA = "Tất cả";

const btnGhost = {
  fontSize: 13, fontWeight: 600, color: "var(--ink-soft)",
  border: "1px solid var(--line-strong)", borderRadius: 7, padding: "7px 13px",
} as const;
const btnPrimary = {
  fontSize: 13, fontWeight: 600, color: "#fff", background: "var(--accent)",
  border: "1px solid var(--accent)", borderRadius: 7, padding: "7px 13px",
} as const;
const btnCard = {
  fontSize: 12.5, fontWeight: 600, color: "var(--ink-soft)", background: "var(--panel)",
  border: "1px solid var(--line-strong)", borderRadius: 7, padding: "4px 11px",
} as const;

export default function DashboardBrowser({
  dashboards,
  datasetNames,
  chartCounts,
  title,
  subtitle,
}: {
  dashboards: Dashboard[];
  datasetNames: Record<string, string>;
  chartCounts: Record<string, number>;
  title?: string;
  subtitle?: string;
}) {
  const [q, setQ] = useState("");
  const [congCu, setCongCu] = useState<string>(TAT_CA);

  const CONG_CU = useMemo(() => [TAT_CA, ...toolsInUse(dashboards)], [dashboards]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return dashboards.filter((d) => {
      if (congCu !== TAT_CA && d.cong_cu !== congCu) return false;
      if (!term) return true;
      return (
        d.ten.toLowerCase().includes(term) ||
        d.mo_ta.toLowerCase().includes(term) ||
        d.phong_ban.toLowerCase().includes(term) ||
        d.chu_so_huu.toLowerCase().includes(term) ||
        d.doi_tuong.toLowerCase().includes(term) ||
        // tìm được cả theo tên dataset mà dashboard đang ăn
        d.datasets.some((x) =>
          (datasetNames[x.dataset_id] ?? x.dataset_id).toLowerCase().includes(term)
        )
      );
    });
  }, [dashboards, q, congCu, datasetNames]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 14, flexWrap: "wrap", marginBottom: 26 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 6px", letterSpacing: "-0.02em" }}>
            {title || "Danh mục dashboard"}
          </h1>
          <p style={{ color: "var(--ink-soft)", margin: 0, fontSize: 15 }}>
            {subtitle ||
              `${dashboards.length} dashboard. Tìm theo tên, phòng ban, người sở hữu hoặc dataset nguồn.`}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/charts" style={btnGhost}>Thư viện chart</Link>
          <Link href="/admin/dashboard/new" style={btnPrimary}>+ Thêm dashboard</Link>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm dashboard…"
          style={{
            flex: "1 1 280px", padding: "10px 14px", fontSize: 14,
            border: "1px solid var(--line-strong)", borderRadius: 8,
            background: "var(--panel)", outline: "none",
          }}
        />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {CONG_CU.map((n) => (
            <button
              key={n}
              onClick={() => setCongCu(n)}
              style={{
                padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer",
                borderRadius: 8,
                border: "1px solid " + (congCu === n ? "var(--accent)" : "var(--line-strong)"),
                background: congCu === n ? "var(--accent)" : "var(--panel)",
                color: congCu === n ? "#fff" : "var(--ink-soft)",
              }}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {filtered.map((d) => {
          const soChart = chartCounts[d.id] ?? 0;
          return (
            // Link phủ kín để bấm cả thẻ; nội dung tắt pointer-events; nút thao
            // tác nằm trên cùng.
            <div
              key={d.id}
              style={{
                position: "relative", background: "var(--panel)",
                border: "1px solid var(--line)", borderRadius: 12, padding: "18px 20px",
              }}
            >
              <Link
                href={`/dashboard/${d.id}`}
                aria-label={d.ten}
                style={{ position: "absolute", inset: 0, borderRadius: 12 }}
              />
              <div style={{ pointerEvents: "none", paddingRight: 116 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 17, fontWeight: 700 }}>{d.ten}</span>
                <span className={toolClass(d.cong_cu)}>{d.cong_cu}</span>
                <span
                  style={{
                    fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 5,
                    background: d.trang_thai === "production" ? "var(--accent-soft)" : "#f4ede2",
                    color: d.trang_thai === "production" ? "var(--accent)" : "var(--warn)",
                  }}
                >
                  {d.trang_thai}
                </span>
              </div>
              <p style={{ margin: "0 0 12px", color: "var(--ink-soft)", fontSize: 14, lineHeight: 1.5 }}>
                {d.mo_ta}
              </p>
              <div style={{ display: "flex", gap: 20, fontSize: 12.5, color: "var(--ink-soft)", flexWrap: "wrap" }}>
                {d.phong_ban && <span>{d.phong_ban}</span>}
                {d.chu_so_huu && <span>{d.chu_so_huu}</span>}
                <span>{d.datasets.length} dataset nguồn</span>
                {soChart > 0 && <span>{soChart} chart</span>}
                {d.tan_suat && <span>{d.tan_suat}</span>}
              </div>
              </div>
              <div style={{ position: "absolute", top: 16, right: 18, display: "flex", gap: 6 }}>
                <Link href={`/admin/dashboard/${d.id}/charts`} style={btnCard}>Chart</Link>
                <Link href={`/admin/dashboard/${d.id}`} style={btnCard}>Sửa</Link>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: 48, color: "var(--ink-soft)" }}>
            {dashboards.length === 0 ? (
              <>
                Chưa có dashboard nào. Thêm trong{" "}
                <Link href="/admin/dashboards" style={{ color: "var(--accent)", fontWeight: 600 }}>
                  Quản trị → Dashboard
                </Link>
                .
              </>
            ) : (
              "Không có dashboard nào khớp. Thử từ khóa khác hoặc đổi bộ lọc công cụ."
            )}
          </div>
        )}
      </div>
    </div>
  );
}
