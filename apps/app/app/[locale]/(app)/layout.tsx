import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { RequireAuth, RequireMember } from "@/components/gates";

interface AppLayoutProps {
  readonly children: ReactNode;
}

/**
 * Signed-in, verified members with current pledges. The shell (header,
 * navigation, footer) paints at once; the gates wait for the session and
 * the membership inside it, so a slow connection shows the frame first
 * rather than a blank screen.
 */
const AppLayout = ({ children }: AppLayoutProps) => (
  <AppShell>
    <RequireAuth>
      <RequireMember>{children}</RequireMember>
    </RequireAuth>
  </AppShell>
);

export default AppLayout;
