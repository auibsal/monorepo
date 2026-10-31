import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { SocietyView } from "@/components/nexus/admin/governance/admin";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.society.minutes.title")
);

const SocietyMinutesPage = () => (
  <RequireModule module="governance">
    <SocietyView view="minutes" />
  </RequireModule>
);

export default SocietyMinutesPage;
