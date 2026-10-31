import type { ReactNode } from "react";
import { RequireAuth, RequirePartner } from "@/components/nexus/gates";

/**
 * A partner's dashboard (owner, Oct 31, 2026: /partners/dashboard, in the
 * header where officers see the Diwan): for its team, members or not. Row
 * Level Security keeps each to its own partner.
 */
const PartnerDashboardLayout = ({
  children,
}: {
  readonly children: ReactNode;
}) => (
  <main
    className="mx-auto w-full max-w-6xl flex-1 px-4 pt-12 pb-20 sm:pt-16 sm:pb-24"
    id="main"
  >
    <RequireAuth>
      <RequirePartner>{children}</RequirePartner>
    </RequireAuth>
  </main>
);

export default PartnerDashboardLayout;
