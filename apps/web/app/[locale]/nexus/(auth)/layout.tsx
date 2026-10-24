import type { ReactNode } from "react";
import { AuthFrame } from "@/components/nexus/auth/auth-frame";
import { GuestOnly } from "@/components/nexus/gates";

interface AuthLayoutProps {
  readonly children: ReactNode;
}

const AuthLayout = ({ children }: AuthLayoutProps) => (
  <GuestOnly>
    <AuthFrame>{children}</AuthFrame>
  </GuestOnly>
);

export default AuthLayout;
