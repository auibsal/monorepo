import { RequireModule } from "@/components/diwan/admin/admin-shell";
import { MembersDirectory } from "@/components/diwan/admin/members/directory";
import {
  EnrollmentCheck,
  IncompleteNames,
} from "@/components/diwan/admin/members/register-checks";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.admin.members.title")
);

const MembersPage = () => (
  <RequireModule module="members">
    <div className="grid gap-16">
      <MembersDirectory />
      <IncompleteNames />
      <EnrollmentCheck />
    </div>
  </RequireModule>
);

export default MembersPage;
