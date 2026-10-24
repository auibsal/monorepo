import { Suspense } from "react";
import { AuthCallback } from "@/components/nexus/auth/auth-callback";
import { FullPageSpinner } from "@/components/nexus/states";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) => t("auth.callback.title"));

const AuthCallbackPage = () => (
  <Suspense fallback={<FullPageSpinner />}>
    <AuthCallback />
  </Suspense>
);

export default AuthCallbackPage;
