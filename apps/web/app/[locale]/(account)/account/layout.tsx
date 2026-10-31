import type { ReactNode } from "react";
import { MemberShell } from "@/components/account/member-shell";
import { RequireAccount, RequireAuth } from "@/components/nexus/gates";

/**
 * The account of someone who is not a member (owner, Oct 31, 2026): a
 * partner's guests and team, and whoever applies to partner. Members are
 * sent to /membership.
 */
const AccountLayout = ({ children }: { readonly children: ReactNode }) => (
  <MemberShell>
    <RequireAuth>
      <RequireAccount>{children}</RequireAccount>
    </RequireAuth>
  </MemberShell>
);

export default AccountLayout;
