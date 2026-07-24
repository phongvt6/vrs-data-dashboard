import { getCatalog } from "@/lib/catalog";
import { getDashboards } from "@/lib/dashboards";
import LineageGraph from "@/app/_components/LineageGraph";


export default async function LineagePage() {
  const [{ datasets, relationships }, dashboards] = await Promise.all([
    getCatalog(),
    getDashboards(),
  ]);
  return (
    <LineageGraph datasets={datasets} relationships={relationships} dashboards={dashboards} />
  );
}
