import { Suspense } from "react";
import { SignInForm } from "@/components/diwan/auth/sign-in-form";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) => t("auth.signIn.title"));

const SignInPage = () => (
  <Suspense>
    <SignInForm />
  </Suspense>
);

export default SignInPage;
