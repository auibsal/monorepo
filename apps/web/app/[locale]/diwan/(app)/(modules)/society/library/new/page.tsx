import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { LibraryDocument } from "@/components/nexus/admin/documents/admin";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.documents.newTitle")
);

const NewLibraryDocumentPage = () => (
  <RequireModule module="library">
    <LibraryDocument slug={null} />
  </RequireModule>
);

export default NewLibraryDocumentPage;
