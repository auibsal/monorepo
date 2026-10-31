import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { AgreementPage } from "@/components/nexus/admin/partners/admin";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.partners.tabs.agreements")
);

/** A memorandum on its own page: new to draft one, its id to sign it. */
const Page = async ({
  params,
}: {
  readonly params: Promise<{ agreement: string }>;
}) => {
  const { agreement } = await params;
  return (
    <RequireModule module="partners">
      <AgreementPage id={agreement} />
    </RequireModule>
  );
};

export default Page;
