import { RequireModule } from "@/components/diwan/admin/admin-shell";
import { SocietyGuests } from "@/components/diwan/admin/members/guests";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.admin.members.guests.title")
);

const GuestsPage = () => (
  <RequireModule module="members">
    <SocietyGuests />
  </RequireModule>
);

export default GuestsPage;
