import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { PartnersAdmin } from "@/components/nexus/admin/partners/admin";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.partners.title")
);

const PartnersPage = () => (
  <RequireModule module="partners">
    <PartnersAdmin />
  </RequireModule>
);

export default PartnersPage;
