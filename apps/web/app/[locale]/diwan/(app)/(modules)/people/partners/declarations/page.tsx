import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { PartnersAdmin } from "@/components/nexus/admin/partners/admin";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.partners.tabs.declarations")
);

const Page = () => (
  <RequireModule module="partners">
    <PartnersAdmin view="declarations" />
  </RequireModule>
);

export default Page;
