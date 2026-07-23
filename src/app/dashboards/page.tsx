import { getCatalog, getSettings } from "@/lib/catalog";
import { countChartsByDashboard, getDashboards } from "@/lib/dashboards";
import DashboardBrowser from "../_components/DashboardBrowser";

export const dynamic = "force-dynamic"; // luôn đọc dữ liệu mới từ DB

export default async function DashboardsPage() {
  const [dashboards, { datasets }, chartCounts, settings] = await Promise.all([
    getDashboards(),
    getCatalog(),
    countChartsByDashboard(),
    getSettings(),
  ]);

  const datasetNames = Object.fromEntries(datasets.map((d) => [d.id, d.ten]));

  return (
    <DashboardBrowser
      dashboards={dashboards}
      datasetNames={datasetNames}
      chartCounts={chartCounts}
      title={settings.dashboards_title}
      subtitle={settings.dashboards_subtitle}
    />
  );
}
