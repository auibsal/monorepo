import { RequireModule } from "@/components/diwan/admin/admin-shell";
import { SocietyView } from "@/components/diwan/admin/governance/admin";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.admin.society.concerns.title")
);

const SocietyConcernsPage = () => (
  <RequireModule module="forms">
    <SocietyView view="concerns" />
  </RequireModule>
);

export default SocietyConcernsPage;
