import { notFound } from "next/navigation";
import { WriteType } from "@/components/diwan/journal/write";
import { journal } from "@/lib/data";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) => t("diwan.journal.title"));

interface PageProps {
  readonly params: Promise<{ slug: string; type: string }>;
}

/**
 * /qirtas/editions/:edition/submit/:type: the form for one type, under
 * the Edition whose call it answers (decisions.md, Qirtas).
 */
const Page = async ({ params }: PageProps) => {
  const { slug, type } = await params;
  if (!journal.isWritableType(type)) {
    notFound();
  }
  return <WriteType edition={slug} type={type} />;
};

export default Page;
