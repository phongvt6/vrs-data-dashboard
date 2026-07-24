import { connection } from "next/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCatalog } from "@/lib/catalog";
import { getDashboards } from "@/lib/dashboards";
import { dashboardsUsingDataset, sourceClass, toolClass } from "@/lib/types";


const khoaColor: Record<string, string> = {
  PK: "#1f6f6b",
  FK: "#4a6fa5",
};

export default async function DatasetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Trang đọc DB trực tiếp — chạy tại request-time, không prerender lúc build.
  await connection();
  const { id } = await params;
  const [{ datasets, relationships }, allDashboards] = await Promise.all([
    getCatalog(),
    getDashboards(),
  ]);
  const d = datasets.find((x) => x.id === id);
  if (!d) notFound();

  const nameById = new Map(datasets.map((x) => [x.id, x.ten]));
  const rels = relationships.filter((r) => r.from === id || r.to === id);
  // Dashboard nào sẽ gãy nếu bảng này đổi schema.
  const dashboards = dashboardsUsingDataset(allDashboards, id);

  const meta: [string, string][] = [
    ["Nguồn", d.nguon],
    ["Đường dẫn", d.duong_dan],
    ["Chủ sở hữu", d.chu_so_huu],
    ["Tần suất cập nhật", d.tan_suat],
    ["Phân loại bảo mật", d.phan_loai_bao_mat],
    ["Trạng thái", d.trang_thai],
    ["Số dòng", d.so_dong.toLocaleString("vi-VN")],
    ...(d.cap_nhat_lan_cuoi
      ? ([["Schema kéo lúc", d.cap_nhat_lan_cuoi.replace("T", " ")]] as [string, string][])
      : []),
  ];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link href="/" style={{ fontSize: 13, color: "var(--ink-soft)" }}>
          ← Quay lại danh mục
        </Link>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link
            href="/admin/relationships"
            style={{
              fontSize: 13, fontWeight: 600, color: "var(--ink-soft)",
              border: "1px solid var(--line-strong)", borderRadius: 7, padding: "5px 12px",
            }}
          >
            Thêm liên kết
          </Link>
          <Link
            href={`/admin/dataset/${d.id}`}
            style={{
              fontSize: 13, fontWeight: 600, color: "var(--accent)",
              border: "1px solid var(--accent)", borderRadius: 7, padding: "5px 12px",
            }}
          >
            Sửa dataset
          </Link>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "14px 0 6px", flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }}>{d.ten}</h1>
        <span className={sourceClass(d.nguon)}>{d.nguon}</span>
      </div>
      <p style={{ color: "var(--ink-soft)", margin: "0 0 24px", fontSize: 15, maxWidth: 720, lineHeight: 1.55 }}>
        {d.mo_ta}
      </p>

      <div
        style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: 1, background: "var(--line)", border: "1px solid var(--line)",
          borderRadius: 10, overflow: "hidden", marginBottom: 32,
        }}
      >
        {meta.map(([k, v]) => (
          <div key={k} style={{ background: "var(--panel)", padding: "12px 16px" }}>
            <div style={{ fontSize: 11, color: "var(--ink-soft)", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              {k}
            </div>
            <div className={k === "Đường dẫn" ? "mono" : ""} style={{ fontSize: 13.5, fontWeight: 600 }}>
              {v}
            </div>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 12px" }}>
        Schema · {d.columns.length} cột
      </h2>
      <div style={{ border: "1px solid var(--line)", borderRadius: 10, overflow: "hidden", marginBottom: 32 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
          <thead>
            <tr style={{ background: "#eef1f0", textAlign: "left" }}>
              <th style={{ padding: "9px 16px", fontWeight: 600 }}>Tên cột</th>
              <th style={{ padding: "9px 16px", fontWeight: 600 }}>Kiểu</th>
              <th style={{ padding: "9px 16px", fontWeight: 600 }}>Khóa</th>
              <th style={{ padding: "9px 16px", fontWeight: 600 }}>Mô tả</th>
            </tr>
          </thead>
          <tbody>
            {d.columns.map((c, i) => (
              <tr key={c.ten} style={{ borderTop: "1px solid var(--line)", background: i % 2 ? "#fafbfb" : "#fff" }}>
                <td className="mono" style={{ padding: "9px 16px", fontWeight: 600 }}>{c.ten}</td>
                <td className="mono" style={{ padding: "9px 16px", color: "var(--ink-soft)" }}>{c.kieu}</td>
                <td style={{ padding: "9px 16px" }}>
                  {c.khoa && (
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: "1px 7px", borderRadius: 4,
                      color: "#fff", background: khoaColor[c.khoa] ?? "var(--ink-soft)",
                    }}>
                      {c.khoa}
                    </span>
                  )}
                </td>
                <td style={{ padding: "9px 16px", color: "var(--ink-soft)" }}>{c.mo_ta}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 12px" }}>
        Dashboard đang dùng · {dashboards.length}
      </h2>
      <div style={{ display: "grid", gap: 8, marginBottom: 32 }}>
        {dashboards.map((db) => {
          const vai_tro = db.datasets.find((x) => x.dataset_id === id)?.vai_tro;
          return (
            <Link
              key={db.id}
              href={`/dashboard/${db.id}`}
              style={{
                display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
                background: "var(--panel)", border: "1px solid var(--line)",
                borderRadius: 9, padding: "12px 16px", fontSize: 14,
              }}
            >
              <span style={{ fontWeight: 600 }}>{db.ten}</span>
              <span className={toolClass(db.cong_cu)}>{db.cong_cu}</span>
              {vai_tro && (
                <span style={{
                  fontSize: 11.5, fontWeight: 600, padding: "2px 8px", borderRadius: 5,
                  background: "var(--accent-soft)", color: "var(--accent)",
                }}>
                  {vai_tro}
                </span>
              )}
              {db.phong_ban && (
                <span style={{ color: "var(--ink-soft)", fontSize: 13 }}>{db.phong_ban}</span>
              )}
            </Link>
          );
        })}
        {dashboards.length === 0 && (
          <div style={{
            background: "var(--panel)", border: "1px dashed var(--line-strong)",
            borderRadius: 9, padding: "16px 18px", color: "var(--ink-soft)", fontSize: 14,
          }}>
            Chưa dashboard nào khai báo dùng dataset này. Khai báo trong{" "}
            <Link href="/admin/dashboards" style={{ color: "var(--accent)", fontWeight: 600 }}>
              Quản trị → Dashboard
            </Link>
            .
          </div>
        )}
      </div>

      {rels.length > 0 && (
        <>
          <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 12px" }}>Liên kết</h2>
          <div style={{ display: "grid", gap: 8 }}>
            {rels.map((r) => {
              const other = r.from === id ? r.to : r.from;
              const outgoing = r.from === id;
              return (
                <Link
                  key={r.id}
                  href={`/dataset/${other}`}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    background: "var(--panel)", border: "1px solid var(--line)",
                    borderRadius: 9, padding: "12px 16px", fontSize: 14,
                  }}
                >
                  <span style={{ color: "var(--accent)", fontWeight: 700 }}>
                    {outgoing ? "→" : "←"}
                  </span>
                  <span style={{ fontWeight: 600 }}>{nameById.get(other) ?? other}</span>
                  <span style={{
                    fontSize: 11.5, fontWeight: 600, padding: "2px 8px", borderRadius: 5,
                    background: "var(--accent-soft)", color: "var(--accent)",
                  }}>
                    {r.loai}
                  </span>
                  <span style={{ color: "var(--ink-soft)", fontSize: 13 }}>{r.mo_ta}</span>
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
