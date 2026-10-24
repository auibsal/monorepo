import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { FormsAdmin } from "@/components/nexus/admin/forms/admin";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) => t("nexus.admin.forms.title"));

const FormsAdminPage = () => (
  <RequireModule module="forms">
    <FormsAdmin />
  </RequireModule>
);

export default FormsAdminPage;
