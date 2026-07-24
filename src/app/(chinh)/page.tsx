import { getCatalog, getSettings } from "@/lib/catalog";
import CatalogBrowser from "@/app/_components/CatalogBrowser";


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
