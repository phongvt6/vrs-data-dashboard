import type { DienGiai } from "@/lib/dien-giai";

// Ba khối Điểm sáng / Cảnh báo / Kiến nghị. Chỉ hiện khối nào có nội dung.

const KHOI = [
  { key: "diem_sang" as const, tieu_de: "Điểm sáng & động lực", mau: "var(--accent)", nen: "var(--accent-soft)" },
  { key: "canh_bao" as const, tieu_de: "Cảnh báo & rủi ro", mau: "#b5423a", nen: "#fbeceb" },
  { key: "kien_nghi" as const, tieu_de: "Kiến nghị hành động", mau: "#8a5a1c", nen: "#f7efe1" },
];

export default function KhoiDienGiai({ dg }: { dg: DienGiai }) {
  const co = KHOI.filter((k) => dg[k.key].length);
  if (!co.length) return null;

  return (
    <div
      style={{
        display: "grid", gap: 12, marginBottom: 12,
        gridTemplateColumns: `repeat(${Math.min(co.length, 3)}, 1fr)`,
      }}
    >
      {co.map((k) => (
        <div
          key={k.key}
          style={{
            background: "var(--panel)", border: "1px solid var(--line)",
            borderRadius: 12, padding: "14px 16px",
          }}
        >
          <div
            style={{
              fontSize: 11.5, fontWeight: 700, color: k.mau, marginBottom: 9,
              textTransform: "uppercase", letterSpacing: "0.04em",
              display: "inline-block", background: k.nen, padding: "2px 8px", borderRadius: 5,
            }}
          >
            {k.tieu_de}
          </div>
          <ul style={{ margin: 0, paddingLeft: 16, display: "grid", gap: 6 }}>
            {dg[k.key].map((s, i) => (
              <li key={i} style={{ fontSize: 12.5, color: "var(--ink)", lineHeight: 1.5 }}>
                {s}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
