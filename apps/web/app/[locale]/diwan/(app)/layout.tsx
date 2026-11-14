import type { ReactNode } from "react";
import { AppShell } from "@/components/diwan/app-shell";
import {
  RequireAuth,
  RequireMember,
  RequireStaff,
} from "@/components/diwan/gates";

interface AppLayoutProps {
  readonly children: ReactNode;
}

/**
 * The Diwan: officers only (anyone holding a role), signed in. The shell
 * paints at once; the gates wait for the session, the membership and the
 * roles inside it. A device stays signed in for 30 days; a role that needs
 * two-step sign-in asks for the second step again after 12 hours
 * (decisions.md, Members; RequireStaff).
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
