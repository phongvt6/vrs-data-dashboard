import { connection } from "next/server";
import { getCatalog, getSettings } from "@/lib/catalog";
import CatalogBrowser from "@/app/_components/CatalogBrowser";


export default async function Home() {
  // Trang đọc DB trực tiếp — chạy tại request-time, không prerender lúc build.
  await connection();
  const [{ datasets }, settings] = await Promise.all([getCatalog(), getSettings()]);
  return (
    <CatalogBrowser
      datasets={datasets}
      title={settings.home_title}
      subtitle={settings.home_subtitle}
    />
  );
}
