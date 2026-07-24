import { connection } from "next/server";
import { notFound } from "next/navigation";
import { getCatalog, getDataset } from "@/lib/catalog";
import { sourcesInUse } from "@/lib/types";
import DatasetForm from "../../DatasetForm";


export default async function EditDatasetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // Trang đọc DB trực tiếp — chạy tại request-time, không prerender lúc build.
  await connection();
  const { id } = await params;
  const isNew = id === "new";

  const { datasets } = await getCatalog();
  const sources = sourcesInUse(datasets);

  if (isNew) {
    return <DatasetForm isNew sources={sources} />;
  }

  const dataset = await getDataset(id);
  if (!dataset) notFound();
  return <DatasetForm isNew={false} initial={dataset} sources={sources} />;
}
