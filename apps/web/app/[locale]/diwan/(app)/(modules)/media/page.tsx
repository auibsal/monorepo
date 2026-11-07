import { RequireModule } from "@/components/diwan/admin/admin-shell";
import { MediaAdmin } from "@/components/diwan/admin/programmes/admin";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.admin.sections.media")
);

/** Media (the Director of Media, decisions §6): Next Stop and its reels. */
const MediaPage = () => (
  <RequireModule module="media">
    <MediaAdmin />
  </RequireModule>
);

export default MediaPage;
