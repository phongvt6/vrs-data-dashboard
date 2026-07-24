import { connection } from "next/server";
import { getCatalog } from "@/lib/catalog";
import { getDashboards } from "@/lib/dashboards";
import LineageGraph from "@/app/_components/LineageGraph";


export default async function LineagePage() {
  // Trang đọc DB trực tiếp — chạy tại request-time, không prerender lúc build.
  await connection();
  const [{ datasets, relationships }, dashboards] = await Promise.all([
    getCatalog(),
    getDashboards(),
  ]);
  return (
    <LineageGraph datasets={datasets} relationships={relationships} dashboards={dashboards} />
  );
}
