import { Suspense } from "react";
import { ForgotForm } from "@/components/nexus/auth/forgot-form";
import { PassSignIn } from "@/components/nexus/auth/pass";
import { titleFrom } from "@/lib/nexus/metadata";
import { passEnabled } from "@/lib/nexus/pass-enabled";

export const generateMetadata = titleFrom((t) => t("auth.forgot.title"));

// Passwords live on The IDEA Pass once it is the way in.
const ForgotPasswordPage = () =>
  passEnabled ? (
    <Suspense>
      <PassSignIn forgot />
    </Suspense>
  ) : (
    <ForgotForm />
  );

export default ForgotPasswordPage;
