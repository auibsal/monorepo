import { notFound } from "next/navigation";
import { WriteType } from "@/components/diwan/journal/write";
import { journal } from "@/lib/data";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) => t("diwan.journal.title"));

interface PageProps {
  readonly params: Promise<{ form: string }>;
}

/**
 * Voices' own door (decisions.md, Qirtas): a letter to the editor at
 * /qirtas/voices/letter and an op-ed at /qirtas/voices/op-ed, for members
 * and guests, by name, to no call.
 */
const Page = async ({ params }: PageProps) => {
  const { form } = await params;
  if (!journal.isVoicesForm(form)) {
    notFound();
  }
  return <WriteType type={journal.voicesForms[form]} />;
};

export default Page;
