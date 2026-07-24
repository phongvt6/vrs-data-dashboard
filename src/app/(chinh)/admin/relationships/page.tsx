import { connection } from "next/server";
import Link from "next/link";
import { getCatalog } from "@/lib/catalog";
import { deleteRelationshipAction } from "../actions";
import RelationshipForm from "./RelationshipForm";


export default async function RelationshipsPage() {
  // Trang đọc DB trực tiếp — chạy tại request-time, không prerender lúc build.
  await connection();
  const { datasets, relationships } = await getCatalog();
  const nameById = new Map(datasets.map((d) => [d.id, d.ten]));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Liên kết giữa dataset</h1>
        <Link href="/admin" style={{ fontSize: 13, color: "var(--ink-soft)" }}>← Về Quản trị</Link>
      </div>

      <RelationshipForm datasets={datasets} />

      <div style={{ display: "grid", gap: 8 }}>
        {relationships.map((r) => (
          <div
            key={r.id}
            style={{
              display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
              background: "var(--panel)", border: "1px solid var(--line)",
              borderRadius: 10, padding: "12px 16px", fontSize: 14,
            }}
          >
            <span style={{ fontWeight: 600 }}>{nameById.get(r.from) ?? r.from}</span>
            <span style={{ color: "var(--ink-soft)" }}>→</span>
            <span style={{ fontWeight: 600 }}>{nameById.get(r.to) ?? r.to}</span>
            <span style={{
              fontSize: 11.5, fontWeight: 600, padding: "2px 8px", borderRadius: 5,
              background: "var(--accent-soft)", color: "var(--accent)",
            }}>{r.loai}</span>
            <span style={{ color: "var(--ink-soft)", fontSize: 13 }}>{r.mo_ta}</span>
            <form action={deleteRelationshipAction} style={{ marginLeft: "auto" }}>
              <input type="hidden" name="id" value={r.id} />
              <button type="submit" style={{
                fontSize: 13, fontWeight: 600, color: "#b5423a", background: "none",
                border: "1px solid #e0b4b0", borderRadius: 7, padding: "5px 12px", cursor: "pointer",
              }}>Xóa</button>
            </form>
          </div>
        ))}
        {relationships.length === 0 && (
          <div style={{ textAlign: "center", padding: 40, color: "var(--ink-soft)" }}>
            Chưa có liên kết nào.
          </div>
        )}
      </div>
    </div>
  );
}
