import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { CharityAdmin } from "@/components/nexus/admin/charity/list";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.charity.title")
);

const CharityPage = () => (
  <RequireModule module="charity">
    <CharityAdmin />
  </RequireModule>
);

export default CharityPage;
