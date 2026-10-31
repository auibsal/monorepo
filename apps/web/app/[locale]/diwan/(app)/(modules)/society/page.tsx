import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { SocietyView } from "@/components/nexus/admin/governance/admin";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.society.meetings.title")
);

const SocietyMeetingsPage = () => (
  <RequireModule module="governance">
    <SocietyView view="meetings" />
  </RequireModule>
);

export default SocietyMeetingsPage;
