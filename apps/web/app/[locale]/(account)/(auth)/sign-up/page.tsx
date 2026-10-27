import { Suspense } from "react";
import { PassSignIn } from "@/components/nexus/auth/pass";
import { SignUpForm } from "@/components/nexus/auth/sign-up-form";
import { titleFrom } from "@/lib/nexus/metadata";
import { passEnabled } from "@/lib/nexus/pass-enabled";

export const generateMetadata = titleFrom((t) => t("auth.signUp.title"));

const SignUpPage = () => (
  <Suspense>{passEnabled ? <PassSignIn /> : <SignUpForm />}</Suspense>
);

export default SignUpPage;
