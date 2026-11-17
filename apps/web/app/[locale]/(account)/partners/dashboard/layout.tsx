import type { ReactNode } from "react";
import { RequireAuth, RequirePartner } from "@/components/diwan/gates";
import { PartnerShell } from "@/components/diwan/partner/partner-shell";

/**
 * A partner's dashboard (decisions.md: /partners/dashboard, in the
 * header where officers see the Diwan): for its team, members or not. Row
 * Level Security keeps each to its own partner.
 */
const PartnerDashboardLayout = ({
  children,
}: {
  readonly children: ReactNode;
}) => (
  <PartnerShell>
    <RequireAuth>
      <RequirePartner>{children}</RequirePartner>
    </RequireAuth>
  </PartnerShell>
);

export default PartnerDashboardLayout;
