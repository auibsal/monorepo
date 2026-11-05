import type { ReactNode } from "react";
import { AuthFrame } from "@/components/diwan/auth/auth-frame";
import { GuestOnly } from "@/components/diwan/gates";

interface AuthLayoutProps {
  readonly children: ReactNode;
}

const AuthLayout = ({ children }: AuthLayoutProps) => (
  <GuestOnly>
    <AuthFrame>{children}</AuthFrame>
  </GuestOnly>
);

export default AuthLayout;
