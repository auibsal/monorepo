import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { PartnersAdmin } from "@/components/nexus/admin/partners/admin";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.partners.tabs.offers")
);

const Page = () => (
  <RequireModule module="partners">
    <PartnersAdmin view="offers" />
  </RequireModule>
);

export default Page;
