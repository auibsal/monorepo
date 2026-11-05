import { Suspense } from "react";
import { AuthFrame } from "@/components/diwan/auth/auth-frame";
import { RequireAuth } from "@/components/diwan/gates";
import { SetupForm } from "@/components/diwan/setup-form";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) => t("diwan.setup.title"));

const SetupPage = () => (
  <RequireAuth>
    <AuthFrame>
      <Suspense>
        <SetupForm />
      </Suspense>
    </AuthFrame>
  </RequireAuth>
);

export default SetupPage;
