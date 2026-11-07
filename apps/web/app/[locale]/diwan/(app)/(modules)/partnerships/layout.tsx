import type { ReactNode } from "react";
import { PartnershipsTabs } from "@/components/diwan/admin/section-tabs";

const PartnershipsLayout = ({ children }: { readonly children: ReactNode }) => (
  <div className="grid gap-8">
    <PartnershipsTabs />
    {children}
  </div>
);

export default PartnershipsLayout;
