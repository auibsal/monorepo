import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { SocietyView } from "@/components/nexus/admin/governance/admin";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.society.resolutions.title")
);

const SocietyResolutionsPage = () => (
  <RequireModule module="governance">
    <SocietyView view="resolutions" />
  </RequireModule>
);

export default SocietyResolutionsPage;
