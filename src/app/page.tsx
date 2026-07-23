import { getCatalog, getSettings } from "@/lib/catalog";
import CatalogBrowser from "./_components/CatalogBrowser";

export const dynamic = "force-dynamic"; // luôn đọc dữ liệu mới từ DB

export default async function Home() {
  const [{ datasets }, settings] = await Promise.all([getCatalog(), getSettings()]);
  return (
    <CatalogBrowser
      datasets={datasets}
      title={settings.home_title}
      subtitle={settings.home_subtitle}
    />
  );
}
