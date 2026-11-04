import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { NewOffer } from "@/components/nexus/admin/partners/admin";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.partners.offers.new")
);

/** A new perk, on its own page under Perks. */
const Page = () => (
  <RequireModule module="partners">
    <NewOffer />
  </RequireModule>
);

export default Page;
