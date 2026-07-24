import { getCatalog, getSettings } from "@/lib/catalog";
import { getDashboards } from "@/lib/dashboards";
import DashboardBrowser from "@/app/_components/DashboardBrowser";


export default async function DashboardsPage() {
  const [dashboards, { datasets }, settings] = await Promise.all([
    getDashboards(),
    getCatalog(),
    getSettings(),
  ]);

  const datasetNames = Object.fromEntries(datasets.map((d) => [d.id, d.ten]));

  return (
    <DashboardBrowser
      dashboards={dashboards}
      datasetNames={datasetNames}
      title={settings.dashboards_title}
      subtitle={settings.dashboards_subtitle}
    />
  );
}
