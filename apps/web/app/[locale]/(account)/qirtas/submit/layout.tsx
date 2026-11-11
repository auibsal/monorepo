import type { ReactNode } from "react";
import { MemberShell } from "@/components/account/member-shell";

/** The members' frame, without the gates: visitors read the gateway too. */
const WriteLayout = ({ children }: { readonly children: ReactNode }) => (
  <MemberShell>{children}</MemberShell>
);

export default WriteLayout;
