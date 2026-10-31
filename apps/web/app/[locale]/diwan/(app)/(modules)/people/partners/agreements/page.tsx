import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { PartnersAdmin } from "@/components/nexus/admin/partners/admin";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.partners.tabs.agreements")
);

const Page = () => (
  <RequireModule module="partners">
    <PartnersAdmin view="agreements" />
  </RequireModule>
);

export default Page;
