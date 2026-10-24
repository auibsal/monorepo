import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { DocumentsAdmin } from "@/components/nexus/admin/documents/admin";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.documents.title")
);

const DocumentsAdminPage = () => (
  <RequireModule module="documents">
    <DocumentsAdmin />
  </RequireModule>
);

export default DocumentsAdminPage;
