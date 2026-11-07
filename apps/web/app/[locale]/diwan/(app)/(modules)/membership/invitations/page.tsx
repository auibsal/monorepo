import { RequireModule } from "@/components/diwan/admin/admin-shell";
import { InvitationLists } from "@/components/diwan/admin/members/invitation-lists";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.admin.sections.tabs.invitations")
);

/** Membership → Invitations: each list, its test and the President's go. */
const InvitationsPage = () => (
  <RequireModule module="members">
    <InvitationLists />
  </RequireModule>
);

export default InvitationsPage;
