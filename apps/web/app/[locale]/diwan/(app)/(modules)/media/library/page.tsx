import { MediaLibrary } from "@/components/diwan/admin/media/library";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.admin.sections.tabs.mediaLibrary")
);

/** Diwan → Media → Library (decisions.md, The site: "One media library"). */
const LibraryPage = () => <MediaLibrary />;

export default LibraryPage;
