import type { ReactNode } from "react";
import { MemberShell } from "@/components/account/member-shell";

/** The members' frame, without the gates: visitors read it too. */
const GetInvolvedLayout = ({ children }: { readonly children: ReactNode }) => (
  <MemberShell>{children}</MemberShell>
);

export default GetInvolvedLayout;
