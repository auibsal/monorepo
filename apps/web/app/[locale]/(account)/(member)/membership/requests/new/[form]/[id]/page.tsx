import { FillForm } from "@/components/nexus/forms/fill";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) => t("nexus.forms.fillTitle"));

/** A draft request, carried on: /membership/requests/new/<kind>/<id>. */
const DraftPage = async ({
  params,
}: {
  readonly params: Promise<{ form: string; id: string }>;
}) => {
  const { form, id } = await params;
  return <FillForm formKey={form} id={id} />;
};

export default DraftPage;
