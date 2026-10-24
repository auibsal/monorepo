import { RequireModule } from "@/components/nexus/admin/admin-shell";
import { MembersDirectory } from "@/components/nexus/admin/members/directory";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) =>
  t("nexus.admin.members.title")
);

const MembersPage = () => (
  <RequireModule module="members">
    <MembersDirectory />
  </RequireModule>
);

export default MembersPage;
