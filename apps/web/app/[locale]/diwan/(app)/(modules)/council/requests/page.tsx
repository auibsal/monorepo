import { RequireModule } from "@/components/diwan/admin/admin-shell";
import { SocietyView } from "@/components/diwan/admin/governance/admin";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.admin.society.requests.title")
);

const SocietyRequestsPage = () => (
  <RequireModule module="governance">
    <SocietyView view="requests" />
  </RequireModule>
);

export default SocietyRequestsPage;
