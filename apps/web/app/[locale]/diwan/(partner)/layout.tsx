import type { ReactNode } from "react";
import { AppShell } from "@/components/nexus/app-shell";
import { RequireAuth, RequirePartner } from "@/components/nexus/gates";

/**
 * A partner's own page (owner, Oct 31, 2026): for its representatives,
 * members of the Society or not, so no membership gate. Row Level
 * Security keeps each to its own partner.
 */
const PartnerLayout = ({ children }: { readonly children: ReactNode }) => (
  <AppShell>
    <RequireAuth>
      <RequirePartner>{children}</RequirePartner>
    </RequireAuth>
  </AppShell>
);

export default PartnerLayout;
