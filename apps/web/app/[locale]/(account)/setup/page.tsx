import { Suspense } from "react";
import { AuthFrame } from "@/components/nexus/auth/auth-frame";
import { RequireAuth } from "@/components/nexus/gates";
import { SetupForm } from "@/components/nexus/setup-form";
import { titleFrom } from "@/lib/nexus/metadata";

export const generateMetadata = titleFrom((t) => t("nexus.setup.title"));

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
