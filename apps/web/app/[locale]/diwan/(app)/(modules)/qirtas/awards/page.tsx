import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { Prizes } from "@/components/nexus/admin/journal/prizes";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.sections.tabs.awards")
);

const AwardsPage = () => (
  <RequireModule module="journal">
    <Prizes />
  </RequireModule>
);

export default AwardsPage;
