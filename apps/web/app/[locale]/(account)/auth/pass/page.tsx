import { Suspense } from "react";
import { AuthFrame } from "@/components/nexus/auth/auth-frame";
import { PassReturn } from "@/components/nexus/auth/pass";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) => t("auth.pass.signingIn"));

/** Where The IDEA Pass sends people back to (one address for both languages). */
const PassPage = () => (
  <AuthFrame>
    <Suspense>
      <PassReturn />
    </Suspense>
  </AuthFrame>
);

export default PassPage;
