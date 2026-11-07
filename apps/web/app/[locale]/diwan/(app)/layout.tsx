import type { ReactNode } from "react";
import { AppShell } from "@/components/diwan/app-shell";
import {
  RequireAuth,
  RequireMember,
  RequireStaff,
} from "@/components/diwan/gates";
import { IdleSignOut } from "@/components/diwan/idle-sign-out";

interface AppLayoutProps {
  readonly children: ReactNode;
}

/**
 * The Diwan: officers only (anyone holding a role), signed in, verified,
 * with current pledges. The shell paints at once; the gates wait for the
 * session, the membership and the roles inside it. Thirty minutes unused
 * signs the device out (decisions §11).
 */
const AppLayout = ({ children }: AppLayoutProps) => (
  <AppShell>
    <RequireAuth>
      <RequireMember>
        <RequireStaff>
          <IdleSignOut />
          {children}
        </RequireStaff>
      </RequireMember>
    </RequireAuth>
  </AppShell>
);

export default AppLayout;
