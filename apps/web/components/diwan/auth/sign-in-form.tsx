"use client";

import { FormHeader } from "@repo/brand/components/sal/form-header";
import { Button } from "@repo/brand/components/ui/button";
import { Input } from "@repo/brand/components/ui/input";
import { Label } from "@repo/brand/components/ui/label";
import { formatLongDate } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useEffect, useId, useRef, useState } from "react";
import { PasswordInput } from "@/components/fields/password-input";
import { signInWithPassword } from "@/lib/auth/email";
import { passkeysSupported, signInWithPasskey } from "@/lib/auth/passkeys";
import { useAuth } from "@/lib/auth/provider";
import { useAuthError, usePasskeyError } from "@/lib/diwan/auth-messages";
import { safeNextPath } from "@/lib/diwan/navigation";
import { useHumanCheck } from "./human-check";

/** A day as the deletion route returns it (yyyy-mm-dd). */
const DAY = /^\d{4}-\d{2}-\d{2}$/u;

/** The address asked on the first step of the one way in (AccountStart). */
export interface StartedWith {
  readonly email: string;
  readonly onChangeEmail: () => void;
  /** When the first step couldn't tell whether the address has an account. */
  readonly onNewAccount?: () => void;
}

/**
 * The password, for an address with an account. `start`: the address was
 * asked on the first step (AccountStart) and is shown with "Change".
 * `embedded`: inside another page, which has its own title and its own
 * way to make an account.
 */
export const SignInForm = ({
  embedded = false,
  start,
}: {
  readonly embedded?: boolean;
  readonly start?: StartedWith;
} = {}) => {
  const t = useTranslations("auth");
  const errorText = useAuthError();
  const passkeyErrorText = usePasskeyError();
  const { supabase } = useAuth();
  const params = useSearchParams();
  const next = safeNextPath(params.get("next"));
  const id = useId();
  const [email, setEmail] = useState(start?.email ?? "");
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
        <FormHeader title={t(start ? "start.passwordTitle" : "signIn.title")}>
          {start ? null : t("signIn.description")}
        </FormHeader>
      )}
      {start ? null : <SignInNotices />}
      {
        <form className="grid gap-4" noValidate onSubmit={submit}>
          {start ? (
            <StartedEmail email={start.email} onChange={start.onChangeEmail} />
          ) : (
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
          )}
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
          {canUsePasskey && !start ? (
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
        {start?.onNewAccount ? (
          <p>
            {t("signIn.noAccount")}{" "}
            <button className="link" onClick={start.onNewAccount} type="button">
              {t("signIn.createAccount")}
            </button>
          </p>
        ) : null}
        {embedded || start ? null : (
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

/** The address from the first step, with the way back to change it. */
export const StartedEmail = ({
  email,
  onChange,
}: {
  readonly email: string;
  readonly onChange: () => void;
}) => {
  const t = useTranslations("auth");
  return (
    <div className="grid gap-1">
      {/* For password managers: the account the password belongs to. */}
      <input
        autoComplete="username"
        dir="ltr"
        hidden
        readOnly
        type="email"
        value={email}
      />
      <p className="type-caption">{t("email")}</p>
      <p className="type-body flex flex-wrap items-baseline gap-x-4">
        <bdi dir="ltr">{email}</bdi>
        <button className="link type-caption" onClick={onChange} type="button">
          {t("start.change")}
        </button>
      </p>
    </div>
  );
};

/** Why someone is at the sign-in: signed out when idle, or deleting. */
export const SignInNotices = () => {
  const t = useTranslations("auth.signIn");
  const locale = useLocale();
  const params = useSearchParams();
  const deleted = params.get("deleted") ?? "";
  return (
    <>
      {params.get("idle") ? <p role="status">{t("idle")}</p> : null}
      {DAY.test(deleted) ? (
        <p role="status">
          {t("deleted", {
            date: formatLongDate(`${deleted}T12:00:00+03:00`, locale, true),
          })}
        </p>
      ) : null}
    </>
  );
};
