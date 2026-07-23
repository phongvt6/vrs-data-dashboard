import { notFound } from "next/navigation";
import { getSourceView } from "@/lib/sources";
import SourceForm from "../SourceForm";

export const dynamic = "force-dynamic";

export default async function EditSourcePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (id === "new") return <SourceForm isNew />;

  const source = await getSourceView(id);
  if (!source) notFound();
  return <SourceForm isNew={false} initial={source} />;
}
