"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { archiveAndDelete } from "@/lib/archive";
import {
  saveDataset,
  datasetExists,
  saveRelationship,
  deleteRelationship,
  setSetting,
  type DatasetInput,
} from "@/lib/catalog";

export type FormState = { error?: string; ok?: boolean };

const SLUG = /^[a-z0-9_]+$/;
const KHOA = new Set(["", "PK", "FK"]);

function revalidateAll(id?: string) {
  revalidatePath("/");
  revalidatePath("/lineage");
  revalidatePath("/admin");
  revalidatePath("/admin/relationships");
  if (id) revalidatePath(`/dataset/${id}`);
}

// ---- Dataset ----

export async function saveDatasetAction(_prev: FormState, formData: FormData): Promise<FormState> {
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(String(formData.get("payload") ?? "{}"));
  } catch {
    return { error: "Dữ liệu form hỏng." };
  }
  const isNew = formData.get("isNew") === "1";
  const id = String(payload.id ?? "").trim();

  if (!SLUG.test(id)) return { error: "Mã (id) chỉ gồm chữ thường, số và gạch dưới." };
  if (!String(payload.ten ?? "").trim()) return { error: "Thiếu tên dataset." };
  if (isNew && (await datasetExists(id))) return { error: `Mã "${id}" đã tồn tại.` };

  const rawCols = Array.isArray(payload.columns) ? payload.columns : [];
  const d: DatasetInput = {
    id,
    ten: String(payload.ten).trim(),
    nguon: String(payload.nguon ?? "").trim() || "Khác",
    duong_dan: String(payload.duong_dan ?? ""),
    chu_so_huu: String(payload.chu_so_huu ?? ""),
    tan_suat: String(payload.tan_suat ?? ""),
    phan_loai_bao_mat: String(payload.phan_loai_bao_mat ?? "") || "Nội bộ",
    trang_thai: payload.trang_thai === "production" ? "production" : "prototype",
    so_dong: Number(payload.so_dong) || 0,
    mo_ta: String(payload.mo_ta ?? ""),
    cap_nhat_lan_cuoi: String(payload.cap_nhat_lan_cuoi ?? ""),
    columns: rawCols
      .map((c: Record<string, unknown>) => ({
        ten: String(c.ten ?? "").trim(),
        kieu: String(c.kieu ?? ""),
        khoa: KHOA.has(String(c.khoa)) ? String(c.khoa) : "",
        mo_ta: String(c.mo_ta ?? ""),
      }))
      .filter((c) => c.ten),
  };

  await saveDataset(d);
  revalidateAll(id);
  redirect("/admin");
}

// Xoá dataset = chụp vào lưu trữ rồi mới xoá, để còn phục hồi được.
export async function deleteDatasetAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (id) {
    await archiveAndDelete("dataset", id);
    revalidateAll(id);
    revalidatePath("/admin/archive");
  }
  redirect("/admin");
}

// ---- Relationship ----

export async function saveRelationshipAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const id = String(formData.get("id") ?? "").trim() || `r_${crypto.randomUUID().slice(0, 8)}`;
  const from = String(formData.get("from") ?? "");
  const to = String(formData.get("to") ?? "");
  const loai = String(formData.get("loai") ?? "").trim();
  const mo_ta = String(formData.get("mo_ta") ?? "").trim();

  if (!from || !to) return { error: "Chọn cả dataset nguồn và đích." };
  if (from === to) return { error: "Nguồn và đích phải khác nhau." };

  await saveRelationship({ id, from, to, loai: loai || "liên kết", mo_ta });
  revalidateAll();
  redirect("/admin/relationships");
}

export async function deleteRelationshipAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (id) {
    await deleteRelationship(id);
    revalidateAll();
  }
  redirect("/admin/relationships");
}

// ---- Settings ----

export async function saveSettingsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await setSetting("home_title", String(formData.get("home_title") ?? "").trim() || "Danh mục dữ liệu");
  await setSetting("home_subtitle", String(formData.get("home_subtitle") ?? "").trim());
  revalidatePath("/");
  revalidatePath("/admin/settings");
  return { ok: true };
}
