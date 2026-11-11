import { RequireModule } from "@/components/diwan/admin/admin-shell";
import { Announcements } from "@/components/diwan/admin/governance/announcements";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.admin.sections.tabs.announcements")
);

/**
 * The Council → Announcements (decisions.md, Channels and email): the
 * President's notices, and Media's "From the Society" (decisions.md, Qirtas).
 */
const AnnouncementsPage = () => (
  <RequireModule module="media">
    <Announcements />
  </RequireModule>
);

export default AnnouncementsPage;
