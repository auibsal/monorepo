import { RequireModule } from "@/components/diwan/admin/admin-shell";
import { SocietyView } from "@/components/diwan/admin/governance/admin";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.admin.society.library.title")
);

const SocietyLibraryPage = () => (
  <RequireModule module="library">
    <SocietyView view="library" />
  </RequireModule>
);

export default SocietyLibraryPage;
