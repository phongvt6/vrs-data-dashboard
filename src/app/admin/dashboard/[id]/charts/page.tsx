import Link from "next/link";
import { notFound } from "next/navigation";
import { getCharts, getDashboard } from "@/lib/dashboards";
import { chartTypeName } from "@/chart/types";
import { CHART_WIDTHS } from "@/lib/types";
import { deleteChartAction, moveChartAction } from "../../../dashboards/chart-actions";

export const dynamic = "force-dynamic";

export default async function ChartsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const dashboard = await getDashboard(id);
  if (!dashboard) notFound();
  const charts = await getCharts(id);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: "0 0 4px", letterSpacing: "-0.02em" }}>
            Chart · {dashboard.ten}
          </h1>
          <p style={{ color: "var(--ink-soft)", margin: 0, fontSize: 14 }}>
            {charts.length} chart · đang vẽ bằng số liệu mẫu
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href={`/dashboard/${id}`} style={btnGhost}>Xem dashboard</Link>
          <Link href={`/admin/dashboard/${id}`} style={btnGhost}>Sửa thông tin</Link>
          <Link href={`/admin/dashboard/${id}/charts/new`} style={btnPrimary}>+ Thêm chart</Link>
        </div>
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        {charts.map((ch, i) => (
          <div
            key={ch.id}
            style={{
              display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
              background: "var(--panel)", border: "1px solid var(--line)",
              borderRadius: 10, padding: "12px 16px",
            }}
          >
            <span style={{ color: "var(--ink-soft)", fontSize: 12.5, width: 20 }}>{i + 1}</span>
            <span style={{ fontWeight: 600 }}>{ch.tieu_de}</span>
            <span
              style={{
                fontSize: 11.5, fontWeight: 600, padding: "2px 8px", borderRadius: 5,
                background: "var(--accent-soft)", color: "var(--accent)",
              }}
            >
              {chartTypeName(ch.loai)}
            </span>
            <span style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>
              {CHART_WIDTHS.find((x) => x.w === ch.w)?.nhan ?? `${ch.w}/12`}
            </span>
            <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
              <form action={moveChartAction}>
                <input type="hidden" name="id" value={ch.id} />
                <input type="hidden" name="dir" value="up" />
                <button type="submit" style={iconBtn} title="Lên" disabled={i === 0}>↑</button>
              </form>
              <form action={moveChartAction}>
                <input type="hidden" name="id" value={ch.id} />
                <input type="hidden" name="dir" value="down" />
                <button type="submit" style={iconBtn} title="Xuống" disabled={i === charts.length - 1}>↓</button>
              </form>
              <Link href={`/admin/dashboard/${id}/charts/${ch.id}`} style={btnGhost}>Sửa</Link>
              <form action={deleteChartAction}>
                <input type="hidden" name="id" value={ch.id} />
                <button type="submit" style={btnDanger}>Xóa</button>
              </form>
            </div>
          </div>
        ))}
        {charts.length === 0 && (
          <div style={{ textAlign: "center", padding: 48, color: "var(--ink-soft)", fontSize: 14, lineHeight: 1.6 }}>
            Chưa có chart nào. Bấm “+ Thêm chart” — chọn loại theo câu hỏi cần trả lời,
            <br />
            xem trước ngay bằng số liệu mẫu rồi mới lưu.
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
const iconBtn = {
  fontSize: 14, background: "none", border: "1px solid var(--line)", borderRadius: 6,
  cursor: "pointer", color: "var(--ink-soft)", padding: "4px 8px",
} as const;
