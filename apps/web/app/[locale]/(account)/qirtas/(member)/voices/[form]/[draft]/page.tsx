import { notFound } from "next/navigation";
import { WriteType } from "@/components/diwan/journal/write";
import { journal } from "@/lib/data";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.journal.write.draftTitle")
);

interface PageProps {
  readonly params: Promise<{ draft: string; form: string }>;
}

/** /qirtas/voices/<form>/<draft>: a saved letter or op-ed. */
const Page = async ({ params }: PageProps) => {
  const { draft, form } = await params;
  if (!journal.isVoicesForm(form)) {
    notFound();
  }
  return <WriteType draftId={draft} type={journal.voicesForms[form]} />;
};

export default Page;
