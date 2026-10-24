import type { ReactNode } from "react";
import { AppShell } from "@/components/nexus/app-shell";
import {
  RequireAuth,
  RequireMember,
  RequireStaff,
} from "@/components/nexus/gates";

interface AppLayoutProps {
  readonly children: ReactNode;
}

/**
 * The Diwan: officers only (anyone holding a role), signed in, verified,
 * with current pledges. The shell paints at once; the gates wait for the
 * session, the membership and the roles inside it.
 */
const AppLayout = ({ children }: AppLayoutProps) => (
  <AppShell>
    <RequireAuth>
      <RequireMember>
        <RequireStaff>{children}</RequireStaff>
      </RequireMember>
    </RequireAuth>
  </AppShell>
);

export default AppLayout;
