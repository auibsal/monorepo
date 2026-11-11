"use client";

import { FormHeader } from "@repo/brand/components/sal/form-header";
import { Button } from "@repo/brand/components/ui/button";
import { Input } from "@repo/brand/components/ui/input";
import { Label } from "@repo/brand/components/ui/label";
import { Link } from "@repo/internationalization/navigation";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { type FormEvent, useEffect, useId, useRef, useState } from "react";
import { PasswordInput } from "@/components/fields/password-input";
import { signInWithPassword } from "@/lib/auth/email";
import { passkeysSupported, signInWithPasskey } from "@/lib/auth/passkeys";
import { useAuth } from "@/lib/auth/provider";
import { useAuthError, usePasskeyError } from "@/lib/diwan/auth-messages";
import { safeNextPath } from "@/lib/diwan/navigation";
import { useHumanCheck } from "./human-check";

/**
 * `embedded`: inside another page (the partner application), which has
 * its own title and its own way to make an account.
 */
export const SignInForm = ({
  embedded = false,
}: {
  readonly embedded?: boolean;
} = {}) => {
  const t = useTranslations("auth");
  const errorText = useAuthError();
  const passkeyErrorText = usePasskeyError();
  const { supabase } = useAuth();
  const params = useSearchParams();
  const next = safeNextPath(params.get("next"));
  const id = useId();
  const [email, setEmail] = useState("");
  // The email and password is the way in (decisions.md, Members); a
  // passkey is an optional other way, never pushed. There is no sign-in
  // link by email: every link spends the email quota.
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  // Checked after mount: the page is prerendered without a browser.
  const [canUsePasskey, setCanUsePasskey] = useState(false);
  useEffect(() => setCanUsePasskey(passkeysSupported()), []);

  // One request at a time.
  const inFlight = useRef<boolean>(false);
  const human = useHumanCheck("sign-in");

  const submitLabel = human.label(
    pending,
    t("signIn.submit"),
    t("signIn.submitting")
  );

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inFlight.current) {
      return;
    }
    inFlight.current = true;
    setPending(true);
    setError(undefined);
    // The answer never says whether an address has an account (OWASP ASVS
    // 2.2.2, NIST SP 800-63B): a wrong address and a wrong password read
    // the same.
    const result = await signInWithPassword(
      supabase,
      email,
      password,
      human.token
    );
    inFlight.current = false;
    human.reset();
    setPending(false);
    if (!result.ok) {
      setError(errorText(result.code));
    }
    // Signed in: GuestOnly sends the member on to `next`.
  };

  const signInPasskey = async () => {
    if (inFlight.current) {
      return;
    }
    inFlight.current = true;
    setPending(true);
    setError(undefined);
    const result = await signInWithPasskey(supabase, human.token);
    inFlight.current = false;
    human.reset();
    setPending(false);
    if (!result.ok) {
      setError(passkeyErrorText(result.code));
    }
    // Signed in: GuestOnly sends the member on to `next`.
  };

  return (
    <>
      {embedded ? null : (
        <FormHeader title={t("signIn.title")}>
          {t("signIn.description")}
        </FormHeader>
      )}
      {params.get("idle") ? <p role="status">{t("signIn.idle")}</p> : null}
      {params.get("deleted") ? (
        <p role="status">{t("signIn.deleted")}</p>
      ) : null}
      {
        <form className="grid gap-4" noValidate onSubmit={submit}>
          <div className="grid gap-2">
            <Label htmlFor={`${id}-email`}>{t("email")}</Label>
            <Input
              aria-describedby={`${id}-email-hint`}
              autoComplete="email"
              dir="ltr"
              id={`${id}-email`}
              inputMode="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
            <p className="type-caption" id={`${id}-email-hint`}>
              {t("emailHint")}
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`${id}-password`}>{t("password")}</Label>
            <PasswordInput
              autoComplete="current-password"
              id={`${id}-password`}
              onChange={(event) => setPassword(event.target.value)}
              required
              value={password}
            />
          </div>
          {human.element}
          {error ? (
            <p className="text-text" role="alert">
              {error}
            </p>
          ) : null}
          <Button disabled={pending || !human.ready} type="submit">
            {submitLabel}
          </Button>
          {canUsePasskey ? (
            <Button
              disabled={pending || !human.ready}
              onClick={signInPasskey}
              type="button"
              variant="link"
            >
              {t("signIn.passkey")}
            </Button>
          ) : null}
        </form>
      }
      <nav className="type-body grid gap-2">
        <Link className="link" href="/forgot-password">
          {t("signIn.forgot")}
        </Link>
        {embedded ? null : (
          <p>
            {t("signIn.noAccount")}{" "}
            <Link
              className="link"
              href={{ pathname: "/sign-up", query: next ? { next } : {} }}
            >
              {t("signIn.createAccount")}
            </Link>
          </p>
        )}
      </nav>
    </>
  );
};
