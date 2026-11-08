import { FormHeader } from "@repo/brand/components/sal/form-header";
import { useTranslations } from "next-intl";
import { Suspense } from "react";
import { SignUpForm } from "@/components/diwan/auth/sign-up-form";
import { titleFrom } from "@/lib/diwan/metadata";

export const generateMetadata = titleFrom((t) => t("auth.signUp.guestTitle"));

/**
 * A guest account (decisions.md): anyone outside AUIB may make one to
 * book a place at the Society's open events. A guest isn't a member: no
 * vote, no office and no place in the Register.
 */
const GuestSignUpPage = () => {
  const t = useTranslations("auth.signUp");
  return (
    <>
      <FormHeader title={t("guestTitle")}>{t("guestLede")}</FormHeader>
      <Suspense>
        <SignUpForm outside={{ reason: { guest: true } }} />
      </Suspense>
    </>
  );
};

export default GuestSignUpPage;
