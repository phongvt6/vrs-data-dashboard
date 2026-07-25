"use client";

import { useEffect, useState } from "react";
import ChartTile from "@/chart/ChartTile";
import { sampleRows } from "@/chart/sample";
import { CHART_TYPES, JOBS, chartTypesByJob } from "@/chart/types";

const TAT_CA = "Tất cả";

/**
 * Thư viện chart — bản rút gọn của app `ui-chart-catalog`, chỉ giữ những loại
 * app này vẽ được. Mục đích: chọn chart theo CÂU HỎI cần trả lời, và đọc phần
 * "tránh khi" trước khi lỡ tay.
 */
export default function ChartLibrary() {
  const [job, setJob] = useState<string>(TAT_CA);
  const nhom = chartTypesByJob().filter((g) => job === TAT_CA || g.job.id === job);

  // Gallery render phía client → hash trong URL (đến từ badge ⓘ, ví dụ /charts#donut)
  // không tự cuộn được. Tự cuộn tới thẻ tương ứng sau khi mount.
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ block: "start" });
  }, []);

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 6px", letterSpacing: "-0.02em" }}>
          Thư viện chart
        </h1>
        <p style={{ color: "var(--ink-soft)", margin: 0, fontSize: 15, maxWidth: 700, lineHeight: 1.55 }}>
          {CHART_TYPES.length} loại chart app này vẽ được, xếp theo mục đích phân tích —
          người đi tìm không nghĩ “tôi cần treemap”, họ nghĩ “tôi cần so sánh cơ cấu”.
          Bảng màu và nguyên tắc lấy từ app <strong>ui-chart-catalog</strong>.
        </p>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 22 }}>
        {[TAT_CA, ...JOBS.map((j) => j.id)].map((k) => {
          const nhan = k === TAT_CA ? TAT_CA : JOBS.find((j) => j.id === k)!.ten;
          return (
            <button
              key={k}
              onClick={() => setJob(k)}
              style={{
                padding: "8px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", borderRadius: 8,
                border: "1px solid " + (job === k ? "var(--accent)" : "var(--line-strong)"),
                background: job === k ? "var(--accent)" : "var(--panel)",
                color: job === k ? "#fff" : "var(--ink-soft)",
              }}
            >
              {nhan}
            </button>
          );
        })}
      </div>

      {nhom.map(({ job: j, types }) => (
        <section key={j.id} style={{ marginBottom: 34 }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 3px" }}>{j.ten}</h2>
          <p style={{ margin: "0 0 14px", fontSize: 13.5, color: "var(--ink-soft)" }}>{j.cau_hoi}</p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14 }}>
            {types.map((t) => (
              <div
                key={t.id}
                id={t.id}
                className="chart-card"
                style={{
                  background: "var(--panel)", border: "1px solid var(--line)",
                  borderRadius: 12, padding: "16px 18px",
                  // Chừa chỗ để khi nhảy từ badge ⓘ (/charts#id) thẻ không dính mép trên.
                  scrollMarginTop: 20,
                }}
              >
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 15.5, fontWeight: 700 }}>{t.ten}</span>
                  <span className="mono" style={{ fontSize: 11.5, color: "var(--ink-soft)" }}>{t.id}</span>
                </div>
                <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.5 }}>
                  {t.mo_ta}
                </p>

                <ChartTile loai={t.id} rows={sampleRows(t.id)} config={{ dinh_dang: "tien" }} height={220} />

                <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                  <Muc tieu_de="Nên dùng khi" mau="var(--accent)" items={t.nen_dung} />
                  <Muc tieu_de="Tránh khi" mau="#b5423a" items={t.tranh} />
                </div>
                <p style={{ margin: "10px 0 0", fontSize: 12, color: "var(--ink-soft)", lineHeight: 1.5 }}>
                  <strong>Dữ liệu cần có:</strong> {t.dang_du_lieu}
                </p>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function Muc({ tieu_de, mau, items }: { tieu_de: string; mau: string; items: string[] }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: mau, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.04em" }}>
        {tieu_de}
      </div>
      <ul style={{ margin: 0, paddingLeft: 16, display: "grid", gap: 4 }}>
        {items.map((s) => (
          <li key={s} style={{ fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.45 }}>{s}</li>
        ))}
      </ul>
    </div>
  );
}
