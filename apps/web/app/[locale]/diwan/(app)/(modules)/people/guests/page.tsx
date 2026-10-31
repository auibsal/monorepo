import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { SocietyGuests } from "@/components/nexus/admin/members/guests";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.members.guests.title")
);

const GuestsPage = () => (
  <RequireModule module="members">
    <SocietyGuests />
  </RequireModule>
);

export default GuestsPage;
