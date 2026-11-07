import type { ReactNode } from "react";
import { CouncilTabs } from "@/components/diwan/admin/section-tabs";

const CouncilLayout = ({ children }: { readonly children: ReactNode }) => (
  <div className="grid gap-8">
    <CouncilTabs />
    {children}
  </div>
);

export default CouncilLayout;
