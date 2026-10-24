import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { AdminOverview } from "@/components/nexus/admin/overview";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.overview.title")
);

const AdminPage = () => (
  <RequireModule module="overview">
    <AdminOverview />
  </RequireModule>
);

export default AdminPage;
