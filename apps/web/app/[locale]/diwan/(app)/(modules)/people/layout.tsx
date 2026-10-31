import type { ReactNode } from "react";
import { PeopleTabs } from "@/components/nexus/admin/section-tabs";

const PeopleLayout = ({ children }: { readonly children: ReactNode }) => (
  <div className="grid gap-8">
    <PeopleTabs />
    {children}
  </div>
);

export default PeopleLayout;
