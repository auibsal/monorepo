import { Suspense } from "react";
import { AuthConfirm } from "@/components/diwan/auth/auth-confirm";
import { FullPageSpinner } from "@/components/diwan/states";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) => t("auth.confirm.title"));

const AuthConfirmPage = () => (
  <Suspense fallback={<FullPageSpinner />}>
    <AuthConfirm />
  </Suspense>
);

export default AuthConfirmPage;
