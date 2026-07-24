"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { purgeArchive, restoreArchive } from "@/lib/archive";

export async function restoreArchiveAction(formData: FormData): Promise<void> {
  const id = Number(formData.get("id"));
  let loi = "";
  if (Number.isFinite(id)) {
    const kq = await restoreArchive(id);
    if (!kq.ok) loi = kq.error ?? "Phục hồi không thành công.";
  }
  revalidatePath("/");
  revalidatePath("/dashboards");
  revalidatePath("/lineage");
  revalidatePath("/admin");
  revalidatePath("/admin/dashboards");
  revalidatePath("/admin/archive");
  // Lỗi đi qua query string: trang lưu trữ là server component, không giữ state.
  redirect(loi ? `/admin/archive?loi=${encodeURIComponent(loi)}` : "/admin/archive");
}

export async function purgeArchiveAction(formData: FormData): Promise<void> {
  const id = Number(formData.get("id"));
  if (Number.isFinite(id)) await purgeArchive(id);
  revalidatePath("/admin/archive");
  redirect("/admin/archive");
}
