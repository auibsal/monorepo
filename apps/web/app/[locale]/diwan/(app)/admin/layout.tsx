import type { ReactNode } from "react";
import { AdminShell } from "@/components/nexus/admin/admin-shell";

const AdminLayout = ({ children }: { readonly children: ReactNode }) => (
  <AdminShell>{children}</AdminShell>
);

export default AdminLayout;
