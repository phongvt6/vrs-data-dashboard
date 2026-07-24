import { connection } from "next/server";
import { notFound } from "next/navigation";
import { getCatalog } from "@/lib/catalog";
import { getDashboard } from "@/lib/dashboards";
import DashboardForm from "../../DashboardForm";


export default async function EditDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Trang đọc DB trực tiếp — chạy tại request-time, không prerender lúc build.
  await connection();
  const { id } = await params;
  const isNew = id === "new";

  const { datasets } = await getCatalog();

  if (isNew) {
    return <DashboardForm isNew datasets={datasets} />;
  }

  const dashboard = await getDashboard(id);
  if (!dashboard) notFound();
  return <DashboardForm isNew={false} initial={dashboard} datasets={datasets} />;
}
