import Link from "next/link";
import { getSources } from "@/lib/sources";
import { SOURCE_TYPE_LABEL } from "@/lib/types";
import { deleteSourceAction } from "./actions";
import SourceSyncButton from "./SourceSyncButton";

export const maxDuration = 60; // sync có thể mất vài chục giây (BigQuery/Sheets)

export default async function SourcesPage() {
  const sources = await getSources();

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 4px" }}>Nguồn dữ liệu</h1>
          <p style={{ color: "var(--ink-soft)", margin: 0, fontSize: 14 }}>
            Khai báo nguồn rồi bấm “Đồng bộ” để tự kéo schema về catalog.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href="/admin" style={btnGhost}>← Về Quản trị</Link>
          <Link href="/admin/sources/new" style={btnPrimary}>+ Thêm nguồn</Link>
        </div>
      </div>

      <div style={{ display: "grid", gap: 8, marginTop: 16 }}>
        {sources.map((s) => (
          <div
            key={s.id}
            style={{
              display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
              background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 10, padding: "14px 16px",
            }}
          >
            <div style={{ minWidth: 200 }}>
              <div style={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
                {s.label}
                {!s.enabled && <span style={{ fontSize: 11, color: "var(--ink-soft)" }}>(tắt)</span>}
              </div>
              <div style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>
                {SOURCE_TYPE_LABEL[s.type]}
                {s.last_sync_at ? ` · đồng bộ ${s.last_sync_at.replace("T", " ")}` : " · chưa đồng bộ"}
              </div>
              {s.last_sync_note && (
                <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 2 }}>{s.last_sync_note}</div>
              )}
            </div>
            <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
              {s.enabled && <SourceSyncButton id={s.id} />}
              <Link href={`/admin/sources/${s.id}`} style={btnGhost}>Sửa</Link>
              <form action={deleteSourceAction}>
                <input type="hidden" name="id" value={s.id} />
                <button type="submit" style={btnDanger}>Xóa</button>
              </form>
            </div>
          </div>
        ))}
        {sources.length === 0 && (
          <div style={{ textAlign: "center", padding: 48, color: "var(--ink-soft)" }}>
            Chưa có nguồn nào. Bấm “+ Thêm nguồn” để kết nối Supabase / BigQuery / Airtable / Google Sheets.
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
