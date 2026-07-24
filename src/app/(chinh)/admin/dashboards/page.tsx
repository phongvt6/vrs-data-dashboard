import { connection } from "next/server";
import Link from "next/link";
import { getDashboards } from "@/lib/dashboards";
import { toolClass } from "@/lib/types";
import { deleteDashboardAction } from "./actions";


export default async function AdminDashboardsPage() {
  // Trang đọc DB trực tiếp — chạy tại request-time, không prerender lúc build.
  await connection();
  const dashboards = await getDashboards();

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: "0 0 4px", letterSpacing: "-0.02em" }}>
            Quản trị · Dashboard
          </h1>
          <p style={{ color: "var(--ink-soft)", margin: 0, fontSize: 14 }}>
            {dashboards.length} dashboard
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/admin" style={btnGhost}>Dataset</Link>
          <Link href="/admin/archive" style={btnGhost}>Lưu trữ</Link>
          <Link href="/admin/dashboard/new" style={btnPrimary}>+ Thêm dashboard</Link>
        </div>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        {dashboards.map((d) => (
          <div
            key={d.id}
            style={{
              display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
              background: "var(--panel)", border: "1px solid var(--line)",
              borderRadius: 10, padding: "12px 16px",
            }}
          >
            <span style={{ fontWeight: 600 }}>{d.ten}</span>
            <span className={toolClass(d.cong_cu)}>{d.cong_cu}</span>
            <span className="mono" style={{ fontSize: 12, color: "var(--ink-soft)" }}>{d.id}</span>
            <span style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>
              {d.datasets.length} dataset
            </span>
            <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
              <Link href={`/admin/dashboard/${d.id}`} style={btnGhost}>Sửa</Link>
              <form action={deleteDashboardAction}>
                <input type="hidden" name="id" value={d.id} />
                <button type="submit" style={btnDanger}>Xóa</button>
              </form>
            </div>
          </div>
        ))}
        {dashboards.length === 0 && (
          <div style={{ textAlign: "center", padding: 48, color: "var(--ink-soft)" }}>
            Chưa có dashboard nào. Bấm “+ Thêm dashboard” để bắt đầu.
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
