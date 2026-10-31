import { notFound } from "next/navigation";
import { isWritableType, WriteType } from "@/components/nexus/journal/write";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) => t("nexus.journal.title"));

interface PageProps {
  readonly params: Promise<{ type: string }>;
}

/** /qirtas/write/<type>: the form for one type. */
const Page = async ({ params }: PageProps) => {
  const { type } = await params;
  if (!isWritableType(type)) {
    notFound();
  }
  return <WriteType type={type} />;
};

export default Page;
