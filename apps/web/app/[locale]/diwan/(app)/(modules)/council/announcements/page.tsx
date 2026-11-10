import { RequireModule } from "@/components/diwan/admin/admin-shell";
import { Announcements } from "@/components/diwan/admin/governance/announcements";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.admin.sections.tabs.announcements")
);

/** The Council → Announcements: the President's notices (decisions §17). */
const AnnouncementsPage = () => (
  <RequireModule module="governance">
    <Announcements />
  </RequireModule>
);

export default AnnouncementsPage;
