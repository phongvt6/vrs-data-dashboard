"use client";

// App "Doanh thu tự doanh" — bản NATIVE (React + ECharts + theme app), dựng lại
// 1:1 bản port của team kinh doanh. Sidebar trái + 5 view, dữ liệu fetch từ
// /api/tu-doanh/* (đúng API bản port dùng → số khớp). Bản port gốc giữ song song
// ở /bang/doanh-thu-tu-doanh-cu.

import { useEffect, useState } from "react";
import type { Meta, Filter } from "./lib/api";
import { api, emptyFilter, bustCache } from "./lib/api";
import { FilterBar, preset, type PeriodType } from "./filter";
import { Loading, Loi } from "./ui";
import OverviewView from "./views/Overview";
import CompareView from "./views/Compare";
import GroupsView from "./views/Groups";
import CatalogView from "./views/Catalog";
import HuongDanView from "./views/HuongDan";

type View = "dashboard" | "compare" | "groups" | "catalog" | "huong-dan";

const NAV: { id: View; icon: string; ten: string }[] = [
  { id: "dashboard", icon: "📊", ten: "Tổng quan" },
  { id: "compare", icon: "🔀", ten: "So sánh thời gian" },
  { id: "groups", icon: "🗂️", ten: "Nhóm hàng" },
  { id: "catalog", icon: "📦", ten: "Danh sách hàng hóa" },
  { id: "huong-dan", icon: "❓", ten: "Hướng dẫn" },
];

const HIDE_DIMS: Partial<Record<View, (keyof Filter)[]>> = {
  groups: ["group"],
  catalog: ["tram", "diem", "bp", "store"],
};

export default function TuDoanhApp() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [err, setErr] = useState("");
  const [view, setView] = useState<View>("dashboard");
  const [thuGon, setThuGon] = useState(false);
  const [filter, setFilter] = useState<Filter>(emptyFilter());
  const [periodType, setPeriodType] = useState<PeriodType>("month");
  const [nonce, setNonce] = useState(0); // buộc refetch khi bấm "Cập nhật"

  useEffect(() => {
    let alive = true;
    api<Meta>("meta", "")
      .then((m) => {
        if (!alive) return;
        setMeta(m);
        setFilter({ ...emptyFilter(), ...preset("month", m.lastDate) });
      })
      .catch((e) => alive && setErr(String(e.message ?? e)));
    return () => { alive = false; };
  }, []);

  if (err) return <div style={{ padding: 24 }}><Loi e={err} /></div>;
  if (!meta) return <div style={{ padding: 24 }}><Loading cao={400} /></div>;

  const refresh = () => { bustCache(); setNonce((n) => n + 1); };
  const fkey = JSON.stringify(filter) + "#" + nonce;

  return (
    <div style={{ display: "flex", minHeight: "100dvh", background: "var(--surface, #fafafa)" }}>
      {/* Sidebar */}
      <aside
        style={{
          width: thuGon ? 60 : 210, flexShrink: 0, borderRight: "1px solid var(--line)",
          background: "var(--panel)", display: "flex", flexDirection: "column", padding: "12px 8px",
          position: "sticky", top: 0, height: "100dvh", transition: "width .15s",
        }}
      >
        <a href="/dashboards" style={{ fontSize: 12, color: "var(--ink-soft)", textDecoration: "none", padding: "4px 8px", marginBottom: 8, whiteSpace: "nowrap" }}>
          {thuGon ? "←" : "← Về app chính"}
        </a>
        <nav style={{ display: "grid", gap: 3, flex: 1 }}>
          {NAV.map((n) => {
            const on = n.id === view;
            return (
              <button
                key={n.id}
                onClick={() => setView(n.id)}
                title={n.ten}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "9px 11px", borderRadius: 9,
                  border: "none", cursor: "pointer", textAlign: "left", fontSize: 13.5, whiteSpace: "nowrap",
                  fontWeight: on ? 700 : 500,
                  background: on ? "var(--accent)" : "transparent",
                  color: on ? "#fff" : "var(--ink)",
                  justifyContent: thuGon ? "center" : "flex-start",
                }}
              >
                <span style={{ fontSize: 15 }}>{n.icon}</span>
                {!thuGon && <span style={{ flex: 1 }}>{n.ten}</span>}
              </button>
            );
          })}
        </nav>
        <button onClick={() => setThuGon((v) => !v)} style={{ marginTop: 8, fontSize: 12, color: "var(--ink-soft)", background: "none", border: "1px solid var(--line)", borderRadius: 8, padding: "6px", cursor: "pointer" }}>
          {thuGon ? "»" : "« Thu gọn"}
        </button>
      </aside>

      {/* Nội dung */}
      <main style={{ flex: 1, minWidth: 0, padding: "16px 20px 40px" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }}>
              {NAV.find((n) => n.id === view)?.ten}
            </h1>
            <p style={{ fontSize: 12.5, color: "var(--ink-soft)", margin: "2px 0 0" }}>
              Doanh thu tự doanh · số liệu đến {meta.lastDate.split("-").reverse().join("/")}
            </p>
          </div>
        </div>

        {view !== "huong-dan" && (
          <FilterBar meta={meta} filter={filter} setFilter={setFilter} periodType={periodType} setPeriodType={setPeriodType}
            hideDims={HIDE_DIMS[view] ?? []} onRefresh={refresh} />
        )}

        <div style={{ marginTop: 8 }}>
          {view === "dashboard" && <OverviewView key={fkey} filter={filter} periodType={periodType} />}
          {view === "compare" && <CompareView key={fkey} filter={filter} periodType={periodType} />}
          {view === "groups" && <GroupsView key={fkey} filter={filter} periodType={periodType} />}
          {view === "catalog" && <CatalogView key={fkey} filter={filter} meta={meta} periodType={periodType} />}
          {view === "huong-dan" && <HuongDanView />}
        </div>
      </main>
    </div>
  );
}
