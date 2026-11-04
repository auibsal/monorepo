import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { NewPartnerPlace } from "@/components/nexus/admin/partners/places";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.partners.places.new")
);

/** A new place with a partner, on its own page under Places. */
const Page = () => (
  <RequireModule module="partners">
    <NewPartnerPlace />
  </RequireModule>
);

export default Page;
