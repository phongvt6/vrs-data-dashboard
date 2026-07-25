"use client";

// Thanh lọc dùng chung: khoảng ngày + preset (Tuần/Tháng/Năm) + 5 multiselect
// liên thông (cascade từ meta.stores). Giá trị gửi API dạng CSV.

import { useMemo, useRef, useState, useEffect } from "react";
import type { Meta, Filter } from "./lib/api";

export type PeriodType = "week" | "month" | "year" | "custom";

/* -------- ngày -------- */

const iso = (d: Date) => d.toISOString().slice(0, 10);

export function preset(type: PeriodType, anchorISO: string): { from: string; to: string } {
  const to = anchorISO;
  const a = new Date(anchorISO + "T00:00:00");
  if (type === "week") {
    const dow = (a.getDay() + 6) % 7; // T2 = 0
    const mon = new Date(a);
    mon.setDate(a.getDate() - dow);
    return { from: iso(mon), to };
  }
  if (type === "year") return { from: `${anchorISO.slice(0, 4)}-01-01`, to };
  // month (mặc định): đầu tháng → ngày dữ liệu cuối
  return { from: `${anchorISO.slice(0, 7)}-01`, to };
}

/* -------- cascade -------- */

/** Options khả dụng cho từng chiều (mỗi facet loại trừ chính nó). */
export function cascade(meta: Meta, f: Filter) {
  const has = (arr: string[], v: string) => arr.length === 0 || arr.includes(v);
  const match = (s: Meta["stores"][number], skip: keyof Filter) =>
    (skip === "tram" || has(f.tram, s.tram)) &&
    (skip === "diem" || has(f.diem, s.diem)) &&
    (skip === "bp" || has(f.bp, s.bp)) &&
    (skip === "store" || has(f.store, s.code));
  const uniq = (xs: string[]) => [...new Set(xs)].sort();
  return {
    tram: uniq(meta.stores.filter((s) => match(s, "tram")).map((s) => s.tram)),
    diem: uniq(meta.stores.filter((s) => match(s, "diem")).map((s) => s.diem)),
    bp: uniq(meta.stores.filter((s) => match(s, "bp")).map((s) => s.bp)),
    store: uniq(meta.stores.filter((s) => match(s, "store")).map((s) => s.code)),
    group: meta.groups,
  };
}

/* -------- multiselect -------- */

export function MultiSelect({
  nhan,
  values,
  selected,
  onChange,
  width = 150,
}: {
  nhan: string;
  values: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  width?: number;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const shown = useMemo(
    () => (q ? values.filter((v) => v.toLowerCase().includes(q.toLowerCase())) : values),
    [values, q]
  );
  const toggle = (v: string) =>
    onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v]);

  const label = selected.length === 0 ? "Tất cả" : selected.length === 1 ? selected[0] : `${selected.length} mục`;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 1,
          width, minWidth: width, padding: "4px 10px", borderRadius: 8,
          border: "1px solid var(--line-strong, var(--line))", background: "var(--panel)",
          cursor: "pointer", textAlign: "left",
        }}
      >
        <span style={{ fontSize: 10, color: "var(--ink-soft)" }}>{nhan}</span>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: selected.length ? "var(--accent)" : "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: width - 20 }}>
          {label}
        </span>
      </button>
      {open && (
        <div
          style={{
            position: "absolute", zIndex: 40, top: "calc(100% + 4px)", left: 0, minWidth: Math.max(width, 200),
            maxHeight: 320, overflow: "hidden", display: "flex", flexDirection: "column",
            background: "var(--panel)", border: "1px solid var(--line-strong, var(--line))", borderRadius: 10,
            boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
          }}
        >
          <div style={{ padding: 8, borderBottom: "1px solid var(--line)", display: "flex", gap: 6 }}>
            <input
              autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm…"
              style={{ flex: 1, fontSize: 12.5, padding: "5px 8px", borderRadius: 6, border: "1px solid var(--line)", background: "var(--surface, transparent)" }}
            />
            {selected.length > 0 && (
              <button onClick={() => onChange([])} style={{ fontSize: 11.5, color: "var(--accent)", border: "none", background: "none", cursor: "pointer" }}>Xoá</button>
            )}
          </div>
          <div style={{ overflowY: "auto" }}>
            {shown.map((v) => (
              <label key={v} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", fontSize: 12.5, cursor: "pointer" }}>
                <input type="checkbox" checked={selected.includes(v)} onChange={() => toggle(v)} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v}</span>
              </label>
            ))}
            {!shown.length && <div style={{ padding: 12, color: "var(--ink-soft)", fontSize: 12 }}>Không có mục.</div>}
          </div>
        </div>
      )}
    </div>
  );
}

/* -------- filter bar -------- */

const DIM_LABEL: Record<string, string> = { group: "Nhóm hàng", tram: "Trạm", diem: "Điểm trạm", bp: "Bộ phận", store: "Cửa hàng" };

export function FilterBar({
  meta,
  filter,
  setFilter,
  periodType,
  setPeriodType,
  hideDims = [],
  onRefresh,
}: {
  meta: Meta;
  filter: Filter;
  setFilter: (f: Filter) => void;
  periodType: PeriodType;
  setPeriodType: (p: PeriodType) => void;
  hideDims?: (keyof Filter)[];
  onRefresh: () => void;
}) {
  const opts = cascade(meta, filter);
  const applyPreset = (p: PeriodType) => {
    setPeriodType(p);
    if (p !== "custom") setFilter({ ...filter, ...preset(p, meta.lastDate) });
  };
  const setDim = (k: keyof Filter, v: string[]) => setFilter({ ...filter, [k]: v });

  const btn = (active: boolean): React.CSSProperties => ({
    fontSize: 12, fontWeight: 600, padding: "5px 11px", borderRadius: 8, cursor: "pointer",
    border: `1px solid ${active ? "var(--accent)" : "var(--line-strong, var(--line))"}`,
    background: active ? "var(--accent)" : "var(--panel)",
    color: active ? "#fff" : "var(--ink)",
  });

  const monthLabel = `Tháng ${Number(meta.lastDate.slice(5, 7))}/${meta.lastDate.slice(0, 4)}`;
  const yearLabel = `Năm ${meta.lastDate.slice(0, 4)}`;
  type DimKey = "group" | "tram" | "diem" | "bp" | "store";
  const dims: DimKey[] = (["group", "tram", "diem", "bp", "store"] as DimKey[]).filter((d) => !hideDims.includes(d));

  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 8, padding: "10px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <input type="date" value={filter.from ?? ""} min={meta.firstDate} max={meta.lastDate}
          onChange={(e) => { setPeriodType("custom"); setFilter({ ...filter, from: e.target.value }); }}
          style={{ fontSize: 12.5, padding: "5px 8px", borderRadius: 8, border: "1px solid var(--line-strong, var(--line))", background: "var(--panel)" }} />
        <span style={{ color: "var(--ink-soft)" }}>→</span>
        <input type="date" value={filter.to ?? ""} min={meta.firstDate} max={meta.lastDate}
          onChange={(e) => { setPeriodType("custom"); setFilter({ ...filter, to: e.target.value }); }}
          style={{ fontSize: 12.5, padding: "5px 8px", borderRadius: 8, border: "1px solid var(--line-strong, var(--line))", background: "var(--panel)" }} />
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <button style={btn(periodType === "week")} onClick={() => applyPreset("week")}>Tuần này</button>
        <button style={btn(periodType === "month")} onClick={() => applyPreset("month")}>{monthLabel}</button>
        <button style={btn(periodType === "year")} onClick={() => applyPreset("year")}>{yearLabel}</button>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {dims.map((d) => (
          <MultiSelect key={d} nhan={DIM_LABEL[d]} values={opts[d]} selected={filter[d] as string[]} onChange={(v) => setDim(d, v)} />
        ))}
      </div>
      <div style={{ display: "flex", gap: 6, marginLeft: "auto" }}>
        <button style={btn(false)} onClick={() => { setPeriodType("month"); setFilter({ tram: [], diem: [], bp: [], store: [], group: [], ...preset("month", meta.lastDate) }); }}>↺ Đặt lại</button>
        <button style={btn(false)} onClick={onRefresh}>⟳ Cập nhật</button>
      </div>
    </div>
  );
}
