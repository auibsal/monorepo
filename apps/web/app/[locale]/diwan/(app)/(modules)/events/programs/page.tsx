import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { ProgramsIndex } from "@/components/nexus/admin/programmes/admin";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.programmes.title")
);

const ProgramsPage = () => (
  <RequireModule module="programs">
    <ProgramsIndex />
  </RequireModule>
);

export default ProgramsPage;
