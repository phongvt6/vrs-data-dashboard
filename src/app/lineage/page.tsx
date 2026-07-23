import { getCatalog } from "@/lib/catalog";
import { getDashboards } from "@/lib/dashboards";
import LineageGraph from "../_components/LineageGraph";

export const dynamic = "force-dynamic";

export default async function LineagePage() {
  const [{ datasets, relationships }, dashboards] = await Promise.all([
    getCatalog(),
    getDashboards(),
  ]);
  return (
    <LineageGraph datasets={datasets} relationships={relationships} dashboards={dashboards} />
  );
}
