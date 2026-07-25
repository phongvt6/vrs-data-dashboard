"use client";

// Diễn giải bằng LUẬT (không LLM) — theo mẫu insight*/deepUnits của bản port.
// Insight = câu phân tích nhanh; Deep = 3 khối Điểm sáng / Cảnh báo / Kiến nghị.

import type { ReactNode } from "react";
import { tien, fmtPct, share as pctShare, delta } from "../lib/format";

/* ---- khối phân tích nhanh ---- */
export function Insight({ lines, tieu_de = "✦ Phân tích nhanh" }: { lines: string[]; tieu_de?: string }) {
  if (!lines.length) return null;
  return (
    <div style={{ background: "var(--accent-soft)", border: "1px solid var(--line)", borderRadius: 12, padding: "12px 16px" }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--accent)", marginBottom: 6 }}>{tieu_de}</div>
      <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 3 }}>
        {lines.map((l, i) => <li key={i} style={{ fontSize: 13, lineHeight: 1.5 }}>{l}</li>)}
      </ul>
    </div>
  );
}

export type Block = { icon: string; title: string; tone: "good" | "bad" | "note"; lines: ReactNode[] };

const TONE: Record<Block["tone"], { bg: string; bd: string; fg: string }> = {
  good: { bg: "rgba(0,131,0,0.06)", bd: "rgba(0,131,0,0.25)", fg: "#006300" },
  bad: { bg: "rgba(208,59,59,0.06)", bd: "rgba(208,59,59,0.25)", fg: "#b02a2a" },
  note: { bg: "rgba(120,90,40,0.06)", bd: "rgba(120,90,40,0.22)", fg: "#7a5a2a" },
};

export function Deep({ blocks }: { blocks: Block[] }) {
  const shown = blocks.filter((b) => b.lines.length);
  if (!shown.length) return null;
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(3, shown.length)}, 1fr)`, gap: 12 }}>
      {shown.map((b, i) => {
        const c = TONE[b.tone];
        return (
          <div key={i} style={{ background: c.bg, border: `1px solid ${c.bd}`, borderRadius: 12, padding: "12px 14px" }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: c.fg, marginBottom: 6 }}>{b.icon} {b.title}</div>
            <ul style={{ margin: 0, paddingLeft: 16, display: "grid", gap: 3 }}>
              {b.lines.map((l, j) => <li key={j} style={{ fontSize: 12.5, lineHeight: 1.5 }}>{l}</li>)}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

/* ---- luật deepUnits: 3 khối cho một tập đơn vị {name,cur,prev} ---- */
export function deepUnits(
  units: { name: string; cur: number; prev: number }[],
  dv: string,
  tongKy: number,
  tongTruoc: number
): Block[] {
  const sorted = [...units].filter((u) => u.cur > 0).sort((a, b) => b.cur - a.cur);
  const dd = delta(tongKy, tongTruoc);

  // Pareto 80%
  let acc = 0;
  let n80 = 0;
  for (const u of sorted) { acc += u.cur; n80++; if (acc >= tongKy * 0.8) break; }

  const movers = [...sorted].sort((a, b) => (b.cur - b.prev) - (a.cur - a.prev));
  const up = movers.filter((u) => u.cur > u.prev).slice(0, 3);
  const down = movers.filter((u) => u.cur < u.prev).slice(-3).reverse();
  const top1 = sorted[0];
  const top1Share = top1 && tongKy ? top1.cur / tongKy : 0;

  const good: ReactNode[] = [];
  good.push(<>Tổng doanh thu {tien(tongKy)}, {fmtPct(dd.pct)} so kỳ trước.</>);
  if (sorted.length) good.push(<><b>{n80}</b>/{sorted.length} {dv} tạo ~80% doanh thu.</>);
  up.forEach((u) => good.push(<>Tăng mạnh: <b>{u.name}</b> ({fmtPct(delta(u.cur, u.prev).pct)}, +{tien(u.cur - u.prev)}).</>));

  const bad: ReactNode[] = [];
  if (top1Share > 0.35) bad.push(<>Tập trung cao: <b>{top1.name}</b> chiếm {pctShare(top1Share)} tổng — rủi ro phụ thuộc.</>);
  down.forEach((u) => { const dl = delta(u.cur, u.prev); if (dl.pct != null && dl.pct <= -15) bad.push(<>Giảm sâu: <b>{u.name}</b> ({fmtPct(dl.pct)}).</>); });

  const note: ReactNode[] = [];
  if (up.length) note.push(<>Nhân rộng cách làm của {up.map((u) => u.name).join(", ")}.</>);
  if (down.length) note.push(<>Rà soát & phục hồi {down.map((u) => u.name).join(", ")}.</>);
  if (n80 <= sorted.length * 0.25 && sorted.length > 4) note.push(<>Doanh thu dồn vào ít {dv} — cân nhắc phân tán rủi ro.</>);

  return [
    { icon: "📈", title: "Điểm sáng & động lực", tone: "good", lines: good },
    { icon: "⚠️", title: "Cảnh báo & rủi ro", tone: "bad", lines: bad },
    { icon: "✅", title: "Kiến nghị hành động", tone: "note", lines: note },
  ];
}
