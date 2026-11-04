import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { PartnersAdmin } from "@/components/nexus/admin/partners/admin";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.partners.tabs.applications")
);

/** Partner applications, the first view of Partners. */
const Page = () => (
  <RequireModule module="partners">
    <PartnersAdmin view="applications" />
  </RequireModule>
);

export default Page;
