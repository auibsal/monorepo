import { RequireModule } from "@/components/diwan/admin/admin-shell";
import { PartnerPage } from "@/components/diwan/admin/partners/admin";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.admin.partners.title")
);

/** One partner in the register, by its slug, or new for a blank one. */
const Page = async ({
  params,
}: {
  readonly params: Promise<{ partner: string }>;
}) => {
  const { partner } = await params;
  return (
    <RequireModule module="partners">
      <PartnerPage partnerRef={decodeURIComponent(partner)} />
    </RequireModule>
  );
};

export default Page;
