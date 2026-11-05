import { RequireModule } from "@/components/diwan/admin/admin-shell";
import { Awards } from "@/components/diwan/admin/journal/awards";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.admin.sections.tabs.awards")
);

const AwardsPage = () => (
  <RequireModule module="journal">
    <Awards />
  </RequireModule>
);

export default AwardsPage;
