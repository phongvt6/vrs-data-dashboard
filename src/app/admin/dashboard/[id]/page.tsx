import { notFound } from "next/navigation";
import { getCatalog } from "@/lib/catalog";
import { getDashboard } from "@/lib/dashboards";
import DashboardForm from "../../DashboardForm";

export const dynamic = "force-dynamic";

export default async function EditDashboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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
