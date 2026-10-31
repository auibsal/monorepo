import type { ReactNode } from "react";
import { SocietyTabs } from "@/components/nexus/admin/section-tabs";

const SocietyLayout = ({ children }: { readonly children: ReactNode }) => (
  <div className="grid gap-8">
    <SocietyTabs />
    {children}
  </div>
);

export default SocietyLayout;
