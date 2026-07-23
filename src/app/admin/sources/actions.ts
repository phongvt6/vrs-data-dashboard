"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { saveSource, deleteSource, type SourceInput } from "@/lib/sources";
import { syncSource, type SyncReport } from "@/lib/sync";
import type { SourceType } from "@/lib/types";

export type SourceFormState = { error?: string; ok?: boolean };
export type SyncState = { error?: string; report?: SyncReport };

const TYPES: SourceType[] = ["postgres", "bigquery", "airtable", "sheets"];
const NGUON_MAC_DINH: Record<SourceType, string> = {
  postgres: "Supabase",
  bigquery: "BigQuery",
  airtable: "Airtable",
  sheets: "Google Sheets",
};

function splitList(v: string): string[] {
  return v.split(",").map((s) => s.trim()).filter(Boolean);
}

export async function saveSourceAction(
  _prev: SourceFormState,
  formData: FormData
): Promise<SourceFormState> {
  const type = String(formData.get("type") ?? "") as SourceType;
  if (!TYPES.includes(type)) return { error: "Loại nguồn không hợp lệ." };
  const label = String(formData.get("label") ?? "").trim();
  if (!label) return { error: "Thiếu tên nguồn." };

  const isNew = formData.get("isNew") === "1";
  const id = isNew ? `src_${crypto.randomUUID().slice(0, 8)}` : String(formData.get("id") ?? "");
  if (!id) return { error: "Thiếu id nguồn." };

  const nguon = String(formData.get("nguon") ?? "").trim() || NGUON_MAC_DINH[type];
  const enabled = formData.get("enabled") === "on" || formData.get("enabled") === "1";
  const secret = String(formData.get("secret") ?? "");

  let config: Record<string, unknown> = {};
  if (type === "postgres") config = { schemas: splitList(String(formData.get("schemas") ?? "public")) };
  else if (type === "airtable") config = { baseId: String(formData.get("baseId") ?? "").trim() };
  else if (type === "bigquery")
    config = {
      project: String(formData.get("project") ?? "").trim(),
      dataset: String(formData.get("dataset") ?? "").trim(),
      // Bỏ trống thì để BigQuery tự đoán (mặc định US).
      location: String(formData.get("location") ?? "").trim(),
    };
  else if (type === "sheets")
    config = { spreadsheetId: String(formData.get("spreadsheetId") ?? "").trim(), tabs: splitList(String(formData.get("tabs") ?? "")) };

  const input: SourceInput = { id, type, label, nguon, enabled, config, secret };
  await saveSource(input);
  revalidatePath("/admin/sources");
  redirect("/admin/sources");
}

export async function deleteSourceAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (id) {
    await deleteSource(id);
    revalidatePath("/admin/sources");
  }
  redirect("/admin/sources");
}

export async function syncSourceAction(_prev: SyncState, formData: FormData): Promise<SyncState> {
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Thiếu id nguồn." };
  try {
    const report = await syncSource(id);
    revalidatePath("/");
    revalidatePath("/lineage");
    revalidatePath("/admin");
    revalidatePath("/admin/sources");
    return { report };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Đồng bộ thất bại." };
  }
}
