import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { SocietyView } from "@/components/nexus/admin/governance/admin";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.society.library.title")
);

const SocietyLibraryPage = () => (
  <RequireModule module="library">
    <SocietyView view="library" />
  </RequireModule>
);

export default SocietyLibraryPage;
