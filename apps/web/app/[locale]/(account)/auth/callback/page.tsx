import { Suspense } from "react";
import { AuthCallback } from "@/components/diwan/auth/auth-callback";
import { FullPageSpinner } from "@/components/diwan/states";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) => t("auth.callback.title"));

const AuthCallbackPage = () => (
  <Suspense fallback={<FullPageSpinner />}>
    <AuthCallback />
  </Suspense>
);

export default AuthCallbackPage;
