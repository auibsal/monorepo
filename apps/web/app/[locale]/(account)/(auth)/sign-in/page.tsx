import { Suspense } from "react";
import { AccountStart } from "@/components/diwan/auth/account-start";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) => t("auth.start.title"));

/** The one way in: /sign-in and /sign-up show the same page. */
const SignInPage = () => (
  <Suspense>
    <AccountStart />
  </Suspense>
);

export default SignInPage;
