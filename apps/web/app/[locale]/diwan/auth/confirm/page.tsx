import { Suspense } from "react";
import { AuthConfirm } from "@/components/nexus/auth/auth-confirm";
import { FullPageSpinner } from "@/components/nexus/states";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) => t("auth.confirm.title"));

const AuthConfirmPage = () => (
  <Suspense fallback={<FullPageSpinner />}>
    <AuthConfirm />
  </Suspense>
);

export default AuthConfirmPage;
