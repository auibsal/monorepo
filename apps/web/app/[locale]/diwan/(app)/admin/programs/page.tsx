import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { ProgrammesAdmin } from "@/components/nexus/admin/programmes/admin";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.programmes.title")
);

const ProgrammesPage = () => (
  <RequireModule module="programs">
    <ProgrammesAdmin />
  </RequireModule>
);

export default ProgrammesPage;
