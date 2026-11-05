import { FillForm } from "@/components/diwan/forms/fill";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) => t("diwan.forms.fillTitle"));

/** A new request: /membership/requests/new/<kind>. */
const FillPage = async ({
  params,
}: {
  readonly params: Promise<{ form: string }>;
}) => {
  const { form } = await params;
  return <FillForm formKey={form} />;
};

export default FillPage;
