"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { sourceClass, sourcesInUse, type Dataset } from "@/lib/types";

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

export default function CatalogBrowser({
  datasets,
  title,
  subtitle,
}: {
  datasets: Dataset[];
  title?: string;
  subtitle?: string;
}) {
  const [q, setQ] = useState("");
  const [nguon, setNguon] = useState<string>(TAT_CA);

  const NGUON = useMemo(() => [TAT_CA, ...sourcesInUse(datasets)], [datasets]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return datasets.filter((d) => {
      if (nguon !== TAT_CA && d.nguon !== nguon) return false;
      if (!term) return true;
      return (
        d.ten.toLowerCase().includes(term) ||
        d.mo_ta.toLowerCase().includes(term) ||
        d.duong_dan.toLowerCase().includes(term) ||
        d.columns.some((c) => c.ten.toLowerCase().includes(term))
      );
    });
  }, [datasets, q, nguon]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 14, flexWrap: "wrap", marginBottom: 26 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 6px", letterSpacing: "-0.02em" }}>
            {title || "Danh mục dữ liệu"}
          </h1>
          <p style={{ color: "var(--ink-soft)", margin: 0, fontSize: 15 }}>
            {subtitle || `${datasets.length} dataset. Tìm theo tên, mô tả hoặc tên cột.`}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/admin/sources" style={btnGhost}>Nguồn dữ liệu</Link>
          <Link href="/admin/relationships" style={btnGhost}>Liên kết</Link>
          <Link href="/admin/dataset/new" style={btnPrimary}>+ Thêm dataset</Link>
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm dataset hoặc cột…"
          style={{
            flex: "1 1 280px", padding: "10px 14px", fontSize: 14,
            border: "1px solid var(--line-strong)", borderRadius: 8,
            background: "var(--panel)", outline: "none",
          }}
        />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {NGUON.map((n) => (
            <button
              key={n}
              onClick={() => setNguon(n)}
              style={{
                padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer",
                borderRadius: 8,
                border: "1px solid " + (nguon === n ? "var(--accent)" : "var(--line-strong)"),
                background: nguon === n ? "var(--accent)" : "var(--panel)",
                color: nguon === n ? "#fff" : "var(--ink-soft)",
              }}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {filtered.map((d) => (
          // Cả thẻ vẫn bấm được để mở chi tiết: một Link phủ kín nằm dưới, phần
          // nội dung tắt pointer-events để click rơi xuống nó, riêng nút "Sửa"
          // nằm trên cùng.
          <div
            key={d.id}
            style={{
              position: "relative", background: "var(--panel)",
              border: "1px solid var(--line)", borderRadius: 12, padding: "18px 20px",
            }}
          >
            <Link
              href={`/dataset/${d.id}`}
              aria-label={d.ten}
              style={{ position: "absolute", inset: 0, borderRadius: 12 }}
            />
            <div style={{ pointerEvents: "none", paddingRight: 64 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 17, fontWeight: 700 }}>{d.ten}</span>
              <span className={sourceClass(d.nguon)}>{d.nguon}</span>
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
              <span className="mono">{d.duong_dan}</span>
              <span>{d.columns.length} cột</span>
              <span>{d.so_dong.toLocaleString("vi-VN")} dòng</span>
              <span>{d.phan_loai_bao_mat}</span>
            </div>
            </div>
            <Link href={`/admin/dataset/${d.id}`} style={{ ...btnCard, position: "absolute", top: 16, right: 18 }}>
              Sửa
            </Link>
          </div>
        ))}
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: 48, color: "var(--ink-soft)" }}>
            Không có dataset nào khớp. Thử từ khóa khác hoặc đổi bộ lọc nguồn.
          </div>
        )}
      </div>
    </div>
  );
}
