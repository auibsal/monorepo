import { journal } from "@repo/sal-data";
import { notFound } from "next/navigation";
import { WriteType } from "@/components/diwan/journal/write";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) => t("diwan.journal.title"));

interface PageProps {
  readonly params: Promise<{ type: string }>;
}

/** /qirtas/write/<type>: the form for one type. */
const Page = async ({ params }: PageProps) => {
  const { type } = await params;
  if (!journal.isWritableType(type)) {
    notFound();
  }
  return <WriteType type={type} />;
};

export default Page;
