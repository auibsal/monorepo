import { FillForm } from "@/components/nexus/forms/fill";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) => t("nexus.forms.fillTitle"));

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
