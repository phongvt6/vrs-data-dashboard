import Link from "next/link";
import { notFound } from "next/navigation";
import { getCatalog } from "@/lib/catalog";
import { getDashboard } from "@/lib/dashboards";
import { sourceClass, toolClass } from "@/lib/types";


export default async function DashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const d = await getDashboard(id);
  if (!d) notFound();

  const { datasets } = await getCatalog();
  const dsById = new Map(datasets.map((x) => [x.id, x]));

  // Ô trống thì bỏ hẳn khỏi bảng metadata cho đỡ rối.
  const meta = ([
    ["Công cụ", d.cong_cu],
    ["Chủ sở hữu", d.chu_so_huu],
    ["Phòng ban", d.phong_ban],
    ["Người xem", d.doi_tuong],
    ["Tần suất cập nhật", d.tan_suat],
    ["Phân loại bảo mật", d.phan_loai_bao_mat],
    ["Trạng thái", d.trang_thai],
    ["Cập nhật lần cuối", d.cap_nhat_lan_cuoi ?? ""],
  ] as [string, string][]).filter(([, v]) => v);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <Link href="/dashboards" style={{ fontSize: 13, color: "var(--ink-soft)" }}>
          ← Quay lại danh mục dashboard
        </Link>
        <div style={{ display: "flex", gap: 8 }}>
          {d.route ? (
            <Link
              href={`/bang/${d.route}`}
              style={{
                fontSize: 13, fontWeight: 600, color: "#fff", background: "var(--accent)",
                border: "1px solid var(--accent)", borderRadius: 7, padding: "5px 12px",
              }}
            >
              Mở trong app →
            </Link>
          ) : d.url ? (
            <a
              href={d.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontSize: 13, fontWeight: 600, color: "#fff", background: "var(--accent)",
                border: "1px solid var(--accent)", borderRadius: 7, padding: "5px 12px",
              }}
            >
              Mở dashboard ↗
            </a>
          ) : null}
          <Link
            href={`/admin/dashboard/${d.id}`}
            style={{
              fontSize: 13, fontWeight: 600, color: "var(--accent)",
              border: "1px solid var(--accent)", borderRadius: 7, padding: "5px 12px",
            }}
          >
            Sửa dashboard
          </Link>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "14px 0 6px", flexWrap: "wrap" }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }}>{d.ten}</h1>
        <span className={toolClass(d.cong_cu)}>{d.cong_cu}</span>
      </div>
      <p style={{ color: "var(--ink-soft)", margin: "0 0 24px", fontSize: 15, maxWidth: 720, lineHeight: 1.55 }}>
        {d.mo_ta}
      </p>

      {d.anh_bia && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={d.anh_bia}
          alt={`Ảnh chụp ${d.ten}`}
          style={{
            width: "100%", maxHeight: 380, objectFit: "cover", objectPosition: "top",
            border: "1px solid var(--line)", borderRadius: 12, marginBottom: 26, display: "block",
          }}
        />
      )}

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
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>{v}</div>
          </div>
        ))}
      </div>

      <h2 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 12px" }}>
        Dataset nguồn · {d.datasets.length}
      </h2>
      <div style={{ display: "grid", gap: 8, marginBottom: 32 }}>
        {d.datasets.map((l) => {
          const ds = dsById.get(l.dataset_id);
          return (
            <Link
              key={l.dataset_id}
              href={`/dataset/${l.dataset_id}`}
              style={{
                display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap",
                background: "var(--panel)", border: "1px solid var(--line)",
                borderRadius: 9, padding: "12px 16px", fontSize: 14,
              }}
            >
              <span style={{ fontWeight: 600 }}>{ds?.ten ?? l.dataset_id}</span>
              {ds && <span className={sourceClass(ds.nguon)}>{ds.nguon}</span>}
              <span style={{
                fontSize: 11.5, fontWeight: 600, padding: "2px 8px", borderRadius: 5,
                background: "var(--accent-soft)", color: "var(--accent)",
              }}>
                {l.vai_tro}
              </span>
              {ds && <span className="mono" style={{ fontSize: 12.5, color: "var(--ink-soft)" }}>{ds.duong_dan}</span>}
              {l.ghi_chu && <span style={{ color: "var(--ink-soft)", fontSize: 13 }}>{l.ghi_chu}</span>}
            </Link>
          );
        })}
        {d.datasets.length === 0 && (
          <div style={{
            background: "var(--panel)", border: "1px dashed var(--line-strong)",
            borderRadius: 9, padding: "16px 18px", color: "var(--ink-soft)", fontSize: 14,
          }}>
            Chưa khai báo dataset nguồn. Khai báo trong{" "}
            <Link href={`/admin/dashboard/${d.id}`} style={{ color: "var(--accent)", fontWeight: 600 }}>
              Sửa dashboard
            </Link>{" "}
            để biết dashboard này gãy khi bảng nào đổi schema.
          </div>
        )}
      </div>

    </div>
  );
}
