import { RequireModule } from "@/components/diwan/admin/admin-shell";
import { PrizeAdmin } from "@/components/diwan/admin/journal/prize";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.admin.sections.tabs.prize")
);

const PrizePage = () => (
  <RequireModule module="journal">
    <PrizeAdmin />
  </RequireModule>
);

export default PrizePage;
