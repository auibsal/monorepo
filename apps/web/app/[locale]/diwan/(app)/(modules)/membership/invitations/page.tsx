import { RequireModule } from "@/components/diwan/admin/admin-shell";
import { AssociateRequests } from "@/components/diwan/admin/members/associate-requests";
import { InvitationLists } from "@/components/diwan/admin/members/invitation-lists";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) =>
  t("diwan.admin.sections.tabs.invitations")
);

/**
 * Membership → Invitations: requests for Associate membership, then each
 * invitation list, its test and the President's go.
 */
const InvitationsPage = () => (
  <RequireModule module="members">
    <div className="grid gap-12">
      <AssociateRequests />
      <InvitationLists />
    </div>
  </RequireModule>
);

export default InvitationsPage;
