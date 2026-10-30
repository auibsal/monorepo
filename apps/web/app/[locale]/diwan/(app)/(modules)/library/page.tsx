import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { LibraryAdmin } from "@/components/nexus/admin/documents/admin";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.documents.title")
);

/** The Library's management, for whoever keeps the documents. */
const LibraryPage = () => (
  <RequireModule module="library">
    <LibraryAdmin />
  </RequireModule>
);

export default LibraryPage;
