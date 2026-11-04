import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { Awards } from "@/components/nexus/admin/journal/awards";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.sections.tabs.awards")
);

const AwardsPage = () => (
  <RequireModule module="journal">
    <Awards />
  </RequireModule>
);

export default AwardsPage;
