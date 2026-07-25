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
import { DashboardShell, type NavItem } from "@/dashboard/Shell";
import OverviewView from "./views/Overview";
import CompareView from "./views/Compare";
import GroupsView from "./views/Groups";
import CatalogView from "./views/Catalog";
import HuongDanView from "./views/HuongDan";

type View = "dashboard" | "compare" | "groups" | "catalog" | "huong-dan";

const NAV: (NavItem & { id: View })[] = [
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
    <DashboardShell
      nav={NAV}
      active={view}
      onNavigate={(id) => setView(id as View)}
      title={NAV.find((n) => n.id === view)?.ten ?? ""}
      subtitle={`Doanh thu tự doanh · số liệu đến ${meta.lastDate.split("-").reverse().join("/")}`}
    >
      {view !== "huong-dan" && (
        <FilterBar meta={meta} filter={filter} setFilter={setFilter} periodType={periodType} setPeriodType={setPeriodType}
          hideDims={HIDE_DIMS[view] ?? []} onRefresh={refresh} />
      )}

      <div style={{ marginTop: 10 }}>
        {view === "dashboard" && <OverviewView key={fkey} filter={filter} periodType={periodType} />}
        {view === "compare" && <CompareView key={fkey} filter={filter} periodType={periodType} />}
        {view === "groups" && <GroupsView key={fkey} filter={filter} periodType={periodType} />}
        {view === "catalog" && <CatalogView key={fkey} filter={filter} meta={meta} periodType={periodType} />}
        {view === "huong-dan" && <HuongDanView />}
      </div>
    </DashboardShell>
  );
}
