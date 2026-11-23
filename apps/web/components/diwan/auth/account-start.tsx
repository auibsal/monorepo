"use client";

import { FormHeader } from "@repo/brand/components/sal/form-header";
import { Button } from "@repo/brand/components/ui/button";
import { Input } from "@repo/brand/components/ui/input";
import { Label } from "@repo/brand/components/ui/label";
import { apiPath } from "@repo/internationalization";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { type FormEvent, useEffect, useId, useState } from "react";
import { normalizeEmail, unusualStudentNumber } from "@/lib/auth/email";
import { passkeysSupported, signInWithPasskey } from "@/lib/auth/passkeys";
import { useAuth } from "@/lib/auth/provider";
import { usePasskeyError } from "@/lib/diwan/auth-messages";
import { safeNextPath } from "@/lib/diwan/navigation";
import { useHumanCheck } from "./human-check";
import { SignInForm, SignInNotices } from "./sign-in-form";
import { PARTNER_APPLY_PATH, SignUpForm } from "./sign-up-form";

const EMAIL_SHAPE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/u;

/** Whether the address has an account; null when the check couldn't say. */
const hasAccount = async (email: string): Promise<boolean | null> => {
  const response = await fetch(apiPath("/account/exists"), {
    body: JSON.stringify({ email }),
    headers: { "content-type": "application/json" },
    method: "POST",
  }).catch(() => null);
  if (!response?.ok) {
    return null;
  }
  const body = (await response.json().catch(() => null)) as {
    exists?: boolean;
  } | null;
  return typeof body?.exists === "boolean" ? body.exists : null;
};

type Step = "email" | "in" | "up" | "either";

/**
 * The one way in (decisions.md, Members), at /sign-in and at /sign-up
 * alike: the address first, then the password when it has an account, or
 * what a new account needs when it hasn't. Nobody has to know which page
 * to choose. A passkey signs in straight from the first step.
 */
export const AccountStart = () => {
  const t = useTranslations("auth");
  const tp = useTranslations("diwan.partnerJoin");
  const passkeyErrorText = usePasskeyError();
  const { supabase } = useAuth();
  const params = useSearchParams();
  const next = safeNextPath(params.get("next"));
  const partner = next === PARTNER_APPLY_PATH;
  const id = useId();
  const [email, setEmail] = useState("");
  const [step, setStep] = useState<Step>("email");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  // Checked after mount: the page is prerendered without a browser.
  const [canUsePasskey, setCanUsePasskey] = useState(false);
  useEffect(() => setCanUsePasskey(passkeysSupported()), []);
  const human = useHumanCheck("sign-in");
  const address = normalizeEmail(email);
  const back = () => {
    setStep("email");
    setError(undefined);
  };

  const proceed = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!EMAIL_SHAPE.test(address)) {
      return;
    }
    setPending(true);
    setError(undefined);
    const known = await hasAccount(address);
    setPending(false);
    if (known === null) {
      setStep("either");
    } else {
      setStep(known ? "in" : "up");
    }
  };

  const signInPasskey = async () => {
    setPending(true);
    setError(undefined);
    const result = await signInWithPasskey(supabase, human.token);
    human.reset();
    setPending(false);
    if (!result.ok) {
      setError(passkeyErrorText(result.code));
    }
    // Signed in: GuestOnly sends the member on to `next`.
  };

  if (step === "up") {
    return <SignUpForm start={{ email: address, onChangeEmail: back }} />;
  }
  if (step === "in" || step === "either") {
    return (
      <SignInForm
        start={{
          email: address,
          onChangeEmail: back,
          // The check couldn't say: making an account stays one tap away.
          onNewAccount: step === "either" ? () => setStep("up") : undefined,
        }}
      />
    );
  }

  return (
    <>
      {partner ? (
        <FormHeader title={tp("title")}>
          <span className="grid gap-2">
            <span>{tp("account")}</span>
            <span>{tp("members")}</span>
          </span>
        </FormHeader>
      ) : (
        <FormHeader title={t("start.title")}>
          {t("start.description")}
        </FormHeader>
      )}
      <SignInNotices />
      <form className="grid gap-4" noValidate onSubmit={proceed}>
        <div className="grid gap-2">
          <Label htmlFor={`${id}-email`}>{t("email")}</Label>
          <Input
            aria-describedby={`${id}-email-hint`}
            autoCapitalize="none"
            autoComplete="email"
            dir="ltr"
            id={`${id}-email`}
            inputMode="email"
            onChange={(event) => setEmail(event.target.value)}
            required
            spellCheck={false}
            type="email"
            value={email}
          />
          <p className="type-caption" id={`${id}-email-hint`}>
            {t("emailHint")}
          </p>
          {unusualStudentNumber(address) ? (
            <p className="type-caption text-text" role="status">
              {t("signUp.numberCheck")}
            </p>
          ) : null}
        </div>
        {error ? (
          <p className="text-text" role="alert">
            {error}
          </p>
        ) : null}
        <Button
          className="justify-self-start"
          disabled={pending || !EMAIL_SHAPE.test(address)}
          type="submit"
        >
          {pending ? t("start.checking") : t("start.continue")}
        </Button>
        {canUsePasskey ? (
          <>
            {human.element}
            <Button
              className="justify-self-start"
              disabled={pending || !human.ready}
              onClick={signInPasskey}
              type="button"
              variant="link"
            >
              {t("signIn.passkey")}
            </Button>
          </>
        ) : null}
      </form>
    </>
  );
};
