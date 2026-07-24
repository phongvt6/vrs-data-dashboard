"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { archiveAndDelete } from "@/lib/archive";
import { saveDashboard, dashboardExists, type DashboardInput } from "@/lib/dashboards";
import { TRANG_THAI_DASHBOARD, VAI_TRO_DATASET } from "@/lib/types";

export type FormState = { error?: string; ok?: boolean };

const SLUG = /^[a-z0-9_]+$/;

// Chỉ nhận link http/https — chặn javascript:, data:… vì link này được render
// thành thẻ <a> cho cả team bấm.
function sanitizeUrl(raw: string): string | null {
  const url = raw.trim();
  if (!url) return "";
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

function revalidateAll(id?: string) {
  revalidatePath("/dashboards");
  revalidatePath("/lineage");
  revalidatePath("/admin/dashboards");
  if (id) revalidatePath(`/dashboard/${id}`);
}

export async function saveDashboardAction(
  _prev: FormState,
  formData: FormData
): Promise<FormState> {
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(String(formData.get("payload") ?? "{}"));
  } catch {
    return { error: "Dữ liệu form hỏng." };
  }
  const isNew = formData.get("isNew") === "1";
  const id = String(payload.id ?? "").trim();

  if (!SLUG.test(id)) return { error: "Mã (id) chỉ gồm chữ thường, số và gạch dưới." };
  if (!String(payload.ten ?? "").trim()) return { error: "Thiếu tên dashboard." };
  if (isNew && (await dashboardExists(id))) return { error: `Mã "${id}" đã tồn tại.` };

  const url = sanitizeUrl(String(payload.url ?? ""));
  if (url === null) return { error: "Link dashboard phải bắt đầu bằng http:// hoặc https://" };

  const anh_bia = sanitizeUrl(String(payload.anh_bia ?? ""));
  if (anh_bia === null) return { error: "Link ảnh bìa phải bắt đầu bằng http:// hoặc https://" };

  // route chỉ nhận ký tự an toàn cho URL — nó ghép vào /bang/<route>.
  const route = String(payload.route ?? "").trim();
  if (route && !/^[a-z0-9-]+$/.test(route)) {
    return { error: "Route chỉ gồm chữ thường, số và gạch ngang (vd tu-doanh)." };
  }

  const trang_thai = String(payload.trang_thai ?? "");
  const rawLinks = Array.isArray(payload.datasets) ? payload.datasets : [];

  // Bỏ dòng trống và trùng dataset (khóa chính là cặp dashboard+dataset).
  const seen = new Set<string>();
  const links = rawLinks
    .map((l: Record<string, unknown>) => ({
      dataset_id: String(l.dataset_id ?? "").trim(),
      vai_tro: VAI_TRO_DATASET.includes(String(l.vai_tro))
        ? String(l.vai_tro)
        : VAI_TRO_DATASET[0],
      ghi_chu: String(l.ghi_chu ?? "").trim(),
    }))
    .filter((l) => {
      if (!l.dataset_id || seen.has(l.dataset_id)) return false;
      seen.add(l.dataset_id);
      return true;
    });

  const d: DashboardInput = {
    id,
    ten: String(payload.ten).trim(),
    mo_ta: String(payload.mo_ta ?? "").trim(),
    cong_cu: String(payload.cong_cu ?? "").trim() || "Khác",
    url,
    route,
    chu_so_huu: String(payload.chu_so_huu ?? "").trim(),
    phong_ban: String(payload.phong_ban ?? "").trim(),
    doi_tuong: String(payload.doi_tuong ?? "").trim(),
    tan_suat: String(payload.tan_suat ?? "").trim(),
    phan_loai_bao_mat: String(payload.phan_loai_bao_mat ?? "").trim() || "Nội bộ",
    trang_thai: TRANG_THAI_DASHBOARD.includes(trang_thai) ? trang_thai : "prototype",
    anh_bia,
    cap_nhat_lan_cuoi: String(payload.cap_nhat_lan_cuoi ?? "").trim(),
    datasets: links,
  };

  try {
    await saveDashboard(d);
  } catch (e) {
    // Hay gặp nhất: dataset_id không còn trong danh mục (FK) — nói rõ thay vì đổ stack.
    const msg = e instanceof Error ? e.message : String(e);
    return { error: `Không lưu được: ${msg}` };
  }

  revalidateAll(id);
  redirect("/admin/dashboards");
}

// Xoá dashboard = chụp cả chart + link vào lưu trữ rồi mới xoá.
export async function deleteDashboardAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (id) {
    await archiveAndDelete("dashboard", id);
    revalidateAll(id);
    revalidatePath("/admin/archive");
  }
  redirect("/admin/dashboards");
}
