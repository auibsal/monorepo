import { RequireModule } from "@/components/diwan/admin/admin-shell";
import { PartnersAdmin } from "@/components/diwan/admin/partners/admin";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.admin.partners.title")
);

const PartnersPage = () => (
  <RequireModule module="partners">
    <PartnersAdmin />
  </RequireModule>
);

export default PartnersPage;
