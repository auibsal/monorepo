import { RequireModule } from "@/components/diwan/admin/admin-shell";
import { MembersDirectory } from "@/components/diwan/admin/members/directory";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.admin.members.title")
);

const MembersPage = () => (
  <RequireModule module="members">
    <MembersDirectory />
  </RequireModule>
);

export default MembersPage;
