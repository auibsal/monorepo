import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { SocietyView } from "@/components/nexus/admin/governance/admin";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.society.requests.title")
);

const SocietyRequestsPage = () => (
  <RequireModule module="governance">
    <SocietyView view="requests" />
  </RequireModule>
);

export default SocietyRequestsPage;
