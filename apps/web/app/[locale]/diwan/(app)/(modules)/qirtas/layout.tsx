import type { ReactNode } from "react";
import { QirtasTabs } from "@/components/nexus/admin/section-tabs";

const QirtasLayout = ({ children }: { readonly children: ReactNode }) => (
  <div className="grid gap-8">
    <QirtasTabs />
    {children}
  </div>
);

export default QirtasLayout;
