import { journal } from "@repo/sal-data";
import { notFound } from "next/navigation";
import { WriteType } from "@/components/diwan/journal/write";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.journal.write.draftTitle")
);

interface PageProps {
  readonly params: Promise<{ draft: string; type: string }>;
}

/** /qirtas/write/<type>/<draft>: a saved draft, back in its form. */
const Page = async ({ params }: PageProps) => {
  const { draft, type } = await params;
  if (!journal.isWritableType(type)) {
    notFound();
  }
  return <WriteType draftId={draft} type={type} />;
};

export default Page;
