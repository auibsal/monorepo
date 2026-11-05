import { RequireModule } from "@/components/diwan/admin/admin-shell";
import { NewOffer } from "@/components/diwan/admin/partners/admin";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.admin.partners.offers.new")
);

/** A new perk, on its own page under Perks. */
const Page = () => (
  <RequireModule module="partners">
    <NewOffer />
  </RequireModule>
);

export default Page;
