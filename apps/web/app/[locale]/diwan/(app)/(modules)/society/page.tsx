import { RequireModule } from "@/components/diwan/admin/admin-shell";
import { SocietyView } from "@/components/diwan/admin/governance/admin";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.admin.society.meetings.title")
);

const SocietyMeetingsPage = () => (
  <RequireModule module="governance">
    <SocietyView view="meetings" />
  </RequireModule>
);

export default SocietyMeetingsPage;
