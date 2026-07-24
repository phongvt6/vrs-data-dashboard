"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { deleteChart, getChart, moveChart, saveChart } from "@/lib/dashboards";
import {
  deleteChartQuery,
  kiemTraSql,
  saveChartQuery,
  xoaCache,
  type QueryParams,
} from "@/lib/chart-data";
import { chartType } from "@/chart/types";
import type { ChartConfig } from "@/chart/types";

export type FormState = { error?: string; ok?: boolean };

const DINH_DANG = new Set(["so", "tien", "phan_tram"]);
const W_HOP_LE = new Set([3, 4, 6, 8, 12]);
const PHEP = new Set(["sum", "count", "avg", "min", "max", "khong"]);
const SAP_XEP = new Set(["gia_tri_giam", "gia_tri_tang", "nhan", "khong"]);

function revalidateAll(dashboardId: string) {
  revalidatePath("/dashboards");
  revalidatePath(`/dashboard/${dashboardId}`);
  revalidatePath(`/admin/dashboard/${dashboardId}/charts`);
}

export async function saveChartAction(_prev: FormState, formData: FormData): Promise<FormState> {
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(String(formData.get("payload") ?? "{}"));
  } catch {
    return { error: "Dữ liệu form hỏng." };
  }

  const dashboard_id = String(payload.dashboard_id ?? "").trim();
  const id = String(payload.id ?? "").trim();
  const loai = String(payload.loai ?? "").trim();
  const tieu_de = String(payload.tieu_de ?? "").trim();

  if (!dashboard_id) return { error: "Thiếu dashboard." };
  if (!tieu_de) return { error: "Thiếu tiêu đề chart." };
  if (!chartType(loai)) return { error: `Loại chart "${loai}" không có trong thư viện.` };

  const w = Number(payload.w);
  const cfgVao = (payload.config ?? {}) as Record<string, unknown>;
  const config: ChartConfig = {
    dinh_dang: DINH_DANG.has(String(cfgVao.dinh_dang)) ? (String(cfgVao.dinh_dang) as ChartConfig["dinh_dang"]) : "so",
    ...(cfgVao.don_vi ? { don_vi: String(cfgVao.don_vi).trim() } : {}),
    ...(Number.isFinite(Number(cfgVao.muc_tieu)) && String(cfgVao.muc_tieu) !== ""
      ? { muc_tieu: Number(cfgVao.muc_tieu) }
      : {}),
  };

  // Chart không cần mã người gõ — sinh tự động, không ai phải nghĩ tên.
  const chartId = id || `ch_${crypto.randomUUID().slice(0, 8)}`;

  await saveChart({
    id: chartId,
    dashboard_id,
    tieu_de,
    loai,
    mo_ta: String(payload.mo_ta ?? "").trim(),
    config,
    pos: Number(payload.pos) || 0,
    w: W_HOP_LE.has(w) ? w : 6,
    h: Number(payload.h) || 2,
  });

  // Phần nguồn dữ liệu: không chọn nguồn = chart chạy bằng số liệu mẫu.
  const tv = (payload.truy_van ?? {}) as Record<string, unknown>;
  const sourceId = String(tv.source_id ?? "").trim();
  if (!sourceId) {
    await deleteChartQuery(chartId);
    xoaCache(chartId);
  } else {
    const sql = String(tv.sql ?? "");
    if (sql.trim()) {
      const loiSql = kiemTraSql(sql);
      if (loiSql) return { error: loiSql };
    }
    await saveChartQuery({
      chart_id: chartId,
      source_id: sourceId,
      sql,
      params: {
        tab: String(tv.tab ?? "") || undefined,
        cot_label: String(tv.cot_label ?? "") || undefined,
        cot_series: String(tv.cot_series ?? "") || undefined,
        cot_value: String(tv.cot_value ?? "") || undefined,
        cot_value2: String(tv.cot_value2 ?? "") || undefined,
        phep: PHEP.has(String(tv.phep)) ? (String(tv.phep) as QueryParams["phep"]) : "sum",
        sap_xep: SAP_XEP.has(String(tv.sap_xep)) ? (String(tv.sap_xep) as QueryParams["sap_xep"]) : "khong",
        gioi_han: Number(tv.gioi_han) > 0 ? Number(tv.gioi_han) : undefined,
      },
      cache_ttl_giay: Number.isFinite(Number(tv.cache_ttl_giay)) ? Math.max(0, Number(tv.cache_ttl_giay)) : 900,
    });
    // Đổi cấu hình thì cache cũ vô nghĩa.
    xoaCache(chartId);
  }

  revalidateAll(dashboard_id);
  redirect(`/admin/dashboard/${dashboard_id}/charts`);
}

export async function deleteChartAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const ch = id ? await getChart(id) : undefined;
  if (ch) {
    await deleteChart(id);
    revalidateAll(ch.dashboard_id);
    redirect(`/admin/dashboard/${ch.dashboard_id}/charts`);
  }
  redirect("/admin/dashboards");
}

export async function moveChartAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const dir = formData.get("dir") === "up" ? -1 : 1;
  const dashboardId = id ? await moveChart(id, dir) : undefined;
  if (dashboardId) {
    revalidateAll(dashboardId);
    redirect(`/admin/dashboard/${dashboardId}/charts`);
  }
  redirect("/admin/dashboards");
}
