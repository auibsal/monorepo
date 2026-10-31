import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { LibraryDocument } from "@/components/nexus/admin/documents/admin";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.society.library.title")
);

const LibraryDocumentPage = async ({
  params,
}: {
  readonly params: Promise<{ slug: string }>;
}) => {
  const { slug } = await params;
  return (
    <RequireModule module="library">
      <LibraryDocument slug={decodeURIComponent(slug)} />
    </RequireModule>
  );
};

export default LibraryDocumentPage;
