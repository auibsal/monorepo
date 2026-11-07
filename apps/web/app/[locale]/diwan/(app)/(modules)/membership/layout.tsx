import type { ReactNode } from "react";
import { MembershipTabs } from "@/components/diwan/admin/section-tabs";

const MembershipLayout = ({ children }: { readonly children: ReactNode }) => (
  <div className="grid gap-8">
    <MembershipTabs />
    {children}
  </div>
);

export default MembershipLayout;
