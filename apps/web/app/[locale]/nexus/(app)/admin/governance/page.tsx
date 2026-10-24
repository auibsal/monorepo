import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { GovernanceAdmin } from "@/components/nexus/admin/governance/admin";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.governance.title")
);

const GovernancePage = () => (
  <RequireModule module="governance">
    <GovernanceAdmin />
  </RequireModule>
);

export default GovernancePage;
