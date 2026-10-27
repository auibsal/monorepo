import { Suspense } from "react";
import { PassSignIn } from "@/components/nexus/auth/pass";
import { SignInForm } from "@/components/nexus/auth/sign-in-form";
import { titleFrom } from "@/lib/nexus/metadata";
import { passEnabled } from "@/lib/nexus/pass-enabled";

export const generateMetadata = titleFrom((t) => t("auth.signIn.title"));

const SignInPage = () => (
  <Suspense>{passEnabled ? <PassSignIn /> : <SignInForm />}</Suspense>
);

export default SignInPage;
