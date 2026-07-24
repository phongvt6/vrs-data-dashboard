import { notFound } from "next/navigation";
import { getChart, getCharts, getDashboard } from "@/lib/dashboards";
import { getChartQuery } from "@/lib/chart-data";
import { getSources } from "@/lib/sources";
import ChartForm from "../../../../ChartForm";
import { truyVanRong, type TruyVan } from "../../../../ChartSource";


export default async function EditChartPage({
  params,
}: {
  params: Promise<{ id: string; chartId: string }>;
}) {
  const { id, chartId } = await params;
  const [dashboard, sources] = await Promise.all([getDashboard(id), getSources()]);
  if (!dashboard) notFound();

  const charts = await getCharts(id);

  if (chartId === "new") {
    return (
      <ChartForm
        dashboardId={id}
        dashboardTen={dashboard.ten}
        soChartHienCo={charts.length}
        sources={sources}
      />
    );
  }

  const chart = await getChart(chartId);
  if (!chart || chart.dashboard_id !== id) notFound();

  const q = await getChartQuery(chartId);
  const truyVan: TruyVan = q
    ? {
        ...truyVanRong(),
        ...(q.params ?? {}),
        source_id: q.source_id ?? "",
        sql: q.sql ?? "",
        cache_ttl_giay: q.cache_ttl_giay ?? 900,
      }
    : truyVanRong();

  return (
    <ChartForm
      dashboardId={id}
      dashboardTen={dashboard.ten}
      initial={chart}
      soChartHienCo={charts.length}
      sources={sources}
      truyVanBanDau={truyVan}
    />
  );
}
