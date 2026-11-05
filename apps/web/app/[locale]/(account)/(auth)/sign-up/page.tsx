import { Suspense } from "react";
import { SignUpForm } from "@/components/diwan/auth/sign-up-form";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) => t("auth.signUp.title"));

const SignUpPage = () => (
  <Suspense>
    <SignUpForm />
  </Suspense>
);

export default SignUpPage;
