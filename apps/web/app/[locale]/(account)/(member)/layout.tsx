import type { ReactNode } from "react";
import { MemberShell } from "@/components/account/member-shell";
import { RequireAuth, RequireMember } from "@/components/nexus/gates";

interface MemberLayoutProps {
  readonly children: ReactNode;
}

/**
 * Signed-in, verified members with current pledges. The frame paints at
 * once; the gates wait for the session and the membership inside it.
 */
const MemberLayout = ({ children }: MemberLayoutProps) => (
  <MemberShell>
    <RequireAuth>
      <RequireMember>{children}</RequireMember>
    </RequireAuth>
  </MemberShell>
);

export default MemberLayout;
