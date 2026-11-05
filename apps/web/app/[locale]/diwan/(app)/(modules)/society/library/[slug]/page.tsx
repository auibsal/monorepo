import { RequireModule } from "@/components/diwan/admin/admin-shell";
import { LibraryDocument } from "@/components/diwan/admin/documents/admin";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.admin.society.library.title")
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
