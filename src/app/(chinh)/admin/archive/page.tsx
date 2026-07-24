import { connection } from "next/server";
import Link from "next/link";
import { getArchive } from "@/lib/archive";
import { purgeArchiveAction, restoreArchiveAction } from "./actions";


export default async function ArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ loi?: string }>;
}) {
  // Trang đọc DB trực tiếp — chạy tại request-time, không prerender lúc build.
  await connection();
  const [items, { loi }] = await Promise.all([getArchive(), searchParams]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 700, margin: "0 0 4px", letterSpacing: "-0.02em" }}>
            Quản trị · Lưu trữ
          </h1>
          <p style={{ color: "var(--ink-soft)", margin: 0, fontSize: 14 }}>
            {items.length} mục đã xoá · giữ nguyên để phục hồi
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href="/admin" style={btnGhost}>Dataset</Link>
          <Link href="/admin/dashboards" style={btnGhost}>Dashboard</Link>
        </div>
      </div>

      {loi && (
        <p style={{
          color: "#b5423a", fontSize: 13, margin: "0 0 14px",
          border: "1px solid #e0b4b0", borderRadius: 8, padding: "10px 14px",
        }}>
          {loi}
        </p>
      )}

      <div style={{ display: "grid", gap: 8 }}>
        {items.map((it) => (
          <div
            key={it.id}
            style={{
              display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
              background: "var(--panel)", border: "1px solid var(--line)",
              borderRadius: 10, padding: "12px 16px",
            }}
          >
            <span
              style={{
                fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 5,
                background: "var(--accent-soft)", color: "var(--accent)",
              }}
            >
              {it.loai === "dataset" ? "dataset" : "dashboard"}
            </span>
            <span style={{ fontWeight: 600 }}>{it.ten}</span>
            <span className="mono" style={{ fontSize: 12, color: "var(--ink-soft)" }}>{it.doi_tuong_id}</span>
            <span style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{it.tom_tat}</span>
            <span style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>xoá {it.xoa_luc}</span>
            <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
              <form action={restoreArchiveAction}>
                <input type="hidden" name="id" value={it.id} />
                <button type="submit" style={btnPrimary}>Phục hồi</button>
              </form>
              <form action={purgeArchiveAction}>
                <input type="hidden" name="id" value={it.id} />
                <button type="submit" style={btnDanger} title="Sau bước này thì thật sự không lấy lại được">
                  Xoá vĩnh viễn
                </button>
              </form>
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div style={{ textAlign: "center", padding: 48, color: "var(--ink-soft)", fontSize: 14, lineHeight: 1.6 }}>
            Chưa có gì trong lưu trữ.
            <br />
            Mọi lần xoá dataset hoặc dashboard đều được chụp lại vào đây trước.
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
  border: "1px solid var(--accent)", borderRadius: 7, padding: "6px 12px", cursor: "pointer",
} as const;
const btnDanger = {
  fontSize: 13, fontWeight: 600, color: "#b5423a", background: "none",
  border: "1px solid #e0b4b0", borderRadius: 7, padding: "6px 12px", cursor: "pointer",
} as const;
