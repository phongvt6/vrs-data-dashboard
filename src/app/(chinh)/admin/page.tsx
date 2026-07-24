import { connection } from "next/server";
import Link from "next/link";
import { getCatalog } from "@/lib/catalog";
import { getDashboards } from "@/lib/dashboards";
import { sourceClass } from "@/lib/types";
import { deleteDatasetAction } from "./actions";


export default async function AdminPage() {
  // Trang đọc DB trực tiếp — chạy tại request-time, không prerender lúc build.
  await connection();
  const [{ datasets, relationships }, dashboards] = await Promise.all([
    getCatalog(),
    getDashboards(),
  ]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: "0 0 4px", letterSpacing: "-0.02em" }}>Quản trị · Dataset</h1>
          <p style={{ color: "var(--ink-soft)", margin: 0, fontSize: 14 }}>
            {datasets.length} dataset · {relationships.length} liên kết · {dashboards.length} dashboard
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/admin/dashboards" style={btnGhost}>Dashboard</Link>
          <Link href="/admin/archive" style={btnGhost}>Lưu trữ</Link>
          <Link href="/admin/sources" style={btnGhost}>Nguồn dữ liệu</Link>
          <Link href="/admin/relationships" style={btnGhost}>Liên kết</Link>
          <Link href="/admin/settings" style={btnGhost}>Cấu hình</Link>
          <Link href="/admin/dataset/new" style={btnPrimary}>+ Thêm dataset</Link>
        </div>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        {datasets.map((d) => (
          <div
            key={d.id}
            style={{
              display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
              background: "var(--panel)", border: "1px solid var(--line)",
              borderRadius: 10, padding: "12px 16px",
            }}
          >
            <span style={{ fontWeight: 600 }}>{d.ten}</span>
            <span className={sourceClass(d.nguon)}>{d.nguon}</span>
            <span className="mono" style={{ fontSize: 12, color: "var(--ink-soft)" }}>{d.id}</span>
            <span style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{d.columns.length} cột</span>
            <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
              <Link href={`/admin/dataset/${d.id}`} style={btnGhost}>Sửa</Link>
              <form action={deleteDatasetAction}>
                <input type="hidden" name="id" value={d.id} />
                <button type="submit" style={btnDanger}>Xóa</button>
              </form>
            </div>
          </div>
        ))}
        {datasets.length === 0 && (
          <div style={{ textAlign: "center", padding: 48, color: "var(--ink-soft)" }}>
            Chưa có dataset nào. Bấm “+ Thêm dataset” để bắt đầu.
          </div>
        )}
      </div>
    </div>
  );
}

const btnGhost = {
  fontSize: 13, fontWeight: 600, color: "var(--ink-soft)",
  border: "1px solid var(--line-strong)", borderRadius: 7, padding: "6px 12px",
} as const;
const btnPrimary = {
  fontSize: 13, fontWeight: 600, color: "#fff", background: "var(--accent)",
  border: "1px solid var(--accent)", borderRadius: 7, padding: "6px 12px",
} as const;
const btnDanger = {
  fontSize: 13, fontWeight: 600, color: "#b5423a", background: "none",
  border: "1px solid #e0b4b0", borderRadius: 7, padding: "6px 12px", cursor: "pointer",
} as const;
