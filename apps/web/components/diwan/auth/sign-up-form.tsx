"use client";

import {
  AUIB_DOMAIN,
  auibLocalPart,
  MIN_PASSWORD_LENGTH,
  signUpWithEmail,
} from "@repo/auth/email";
import { useAuth } from "@repo/auth/provider";
import { FormHeader } from "@repo/brand/components/sal/form-header";
import { Button } from "@repo/brand/components/ui/button";
import { Checkbox } from "@repo/brand/components/ui/checkbox";
import { Input } from "@repo/brand/components/ui/input";
import { Label } from "@repo/brand/components/ui/label";
import { Link } from "@repo/internationalization/navigation";
import { names as nameParts } from "@repo/sal-data";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useId, useState } from "react";
import { PasswordInput } from "@/components/fields/password-input";
import { useAuthError } from "@/lib/diwan/auth-messages";
import { callbackUrl, safeNextPath } from "@/lib/diwan/navigation";
import { useScreenTop } from "@/lib/diwan/use-screen-top";
import { isBreachedPassword } from "@/lib/password";
import { NamePartsFields } from "../setup-form";
import { EmailCode } from "./email-code";
import { useHumanCheck } from "./human-check";
import { ResendConfirmation } from "./resend-confirmation";

/**
 * Why someone without an AUIB address may sign up (decisions.md):
 * a partner's invitation (its address, when it names one, is fixed) or an
 * application to partner. Without one, the form takes AUIB addresses only.
 */
interface OutsideSignUp {
  readonly email?: string | null;
  readonly reason:
    | { invitation: string }
    | { partnerApplicant: true }
    | { guest: true };
}

interface SignUpFormProps {
  /** Where the confirmation link brings them back to. */
  readonly next?: string;
  readonly outside?: OutsideSignUp;
}

export const SignUpForm = ({ next: given, outside }: SignUpFormProps) => {
  const t = useTranslations("auth");
  const errorText = useAuthError();
  const { supabase } = useAuth();
  const locale = useLocale();
  const asked = safeNextPath(useSearchParams().get("next"));
  const next = given ?? asked;
  const id = useId();
  const [values, setValues] = useState({
    email: outside?.email ?? "",
    password: "",
  });
  // Membership is for AUIB addresses (decisions.md): the field takes
  // what goes before @auib.edu.iq. Those invited by a partner, or applying
  // for one, give their own address and, since no AUIB record names them,
  // their name in four parts in each language as on their papers.
  const [fullNames, setFullNames] = useState<nameParts.FourPartNames>({
    ar: nameParts.emptyParts(),
    en: nameParts.emptyParts(),
  });
  const named =
    nameParts.partsComplete(fullNames.en) &&
    nameParts.partsComplete(fullNames.ar);
  // Students join themselves and say so (decisions §2); faculty and staff
  // ask for Associate membership on /join instead.
  const [student, setStudent] = useState(false);
  // 18 or older, and the Terms of Use and the Privacy Notice (decisions §11).
  const [agreed, setAgreed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [sentTo, setSentTo] = useState<string>();
  useScreenTop(sentTo);
  const external = Boolean(outside);
  const email = external
    ? values.email.trim()
    : `${auibLocalPart(values.email)}@${AUIB_DOMAIN}`;
  const human = useHumanCheck("sign-up");

  const set =
    (key: keyof typeof values) => (event: { target: { value: string } }) =>
      setValues((current) => ({ ...current, [key]: event.target.value }));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setError(undefined);
    if (await isBreachedPassword(values.password)) {
      setPending(false);
      setError(errorText("breached_password"));
      return;
    }
    const result = await signUpWithEmail(supabase, {
      agreed,
      captchaToken: human.token,
      email,
      locale: locale === "ar" ? "ar" : "en",
      names: external ? fullNames : undefined,
      outside: outside?.reason,
      password: values.password,
      // The confirmation link brings the member back to what they started.
      redirectTo: callbackUrl(locale, next),
    });
    setPending(false);
    human.reset();
    if (result.ok) {
      setSentTo(email);
    } else {
      setError(errorText(result.code));
    }
  };

  if (sentTo) {
    return (
      <>
        <FormHeader title={t("signUp.checkInbox")} />
        <p role="status">{t("signUp.checkInboxBody", { email: sentTo })}</p>
        <EmailCode email={sentTo} />
        <ResendConfirmation
          email={sentTo}
          redirectTo={callbackUrl(locale, next)}
        />
      </>
    );
  }

  return (
    <>
      {/* Invited or applying, the page around the form says what it is for. */}
      {external ? null : (
        <FormHeader title={t("signUp.title")}>
          {t("signUp.description")}
        </FormHeader>
      )}
      <form className="grid gap-4" noValidate onSubmit={submit}>
        {external ? (
          <div className="grid gap-2">
            <Label htmlFor={`${id}-email`}>{t("email")}</Label>
            <Input
              autoComplete="email"
              dir="ltr"
              id={`${id}-email`}
              inputMode="email"
              onChange={set("email")}
              readOnly={Boolean(outside?.email)}
              required
              type="email"
              value={values.email}
            />
          </div>
        ) : (
          <div className="grid gap-2">
            <Label htmlFor={`${id}-email`}>{t("auibEmail")}</Label>
            <div className="flex items-stretch" dir="ltr">
              <Input
                aria-describedby={`${id}-email-hint`}
                autoCapitalize="none"
                autoComplete="username"
                className="min-w-0 flex-1"
                id={`${id}-email`}
                onBlur={(event) =>
                  setValues((current) => ({
                    ...current,
                    email: auibLocalPart(event.target.value),
                  }))
                }
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    email: event.target.value.replace(/\s/g, ""),
                  }))
                }
                required
                spellCheck={false}
                value={values.email}
              />
              <span className="flex items-center border-line border-y border-e px-3 text-sm text-text-secondary">
                @{AUIB_DOMAIN}
              </span>
            </div>
            <p className="type-caption" id={`${id}-email-hint`}>
              {t("auibEmailHint")}
            </p>
          </div>
        )}
        <div className="grid gap-2">
          <Label htmlFor={`${id}-password`}>{t("password")}</Label>
          <PasswordInput
            aria-describedby={`${id}-password-hint`}
            autoComplete="new-password"
            id={`${id}-password`}
            minLength={MIN_PASSWORD_LENGTH}
            onChange={set("password")}
            required
            value={values.password}
          />
          <p className="type-caption" id={`${id}-password-hint`}>
            {t("passwordHint")}
          </p>
        </div>
        {external ? (
          <div className="grid gap-4">
            <p className="type-caption" id={`${id}-names-hint`}>
              {t("signUp.namesHint")}
            </p>
            {(["en", "ar"] as const).map((lang) => (
              <fieldset className="grid gap-3" key={lang}>
                <legend className="mb-2 font-medium text-sm">
                  {lang === "en" ? t("signUp.nameEn") : t("signUp.nameAr")}
                </legend>
                <NamePartsFields
                  describedBy={`${id}-names-hint`}
                  language={lang}
                  onChange={(parts) =>
                    setFullNames((current) => ({ ...current, [lang]: parts }))
                  }
                  parts={fullNames[lang]}
                />
              </fieldset>
            ))}
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <Checkbox
              checked={student}
              id={`${id}-student`}
              onCheckedChange={(v) => setStudent(v === true)}
            />
            <Label className="leading-normal" htmlFor={`${id}-student`}>
              {t("signUp.student")}
            </Label>
          </div>
        )}
        <div className="flex items-start gap-3">
          <Checkbox
            checked={agreed}
            id={`${id}-agree`}
            onCheckedChange={(v) => setAgreed(v === true)}
          />
          <Label className="leading-normal" htmlFor={`${id}-agree`}>
            {t.rich("signUp.agree", {
              privacy: (chunks) => (
                <Link className="link" href="/privacy" target="_blank">
                  {chunks}
                </Link>
              ),
              terms: (chunks) => (
                <Link className="link" href="/terms" target="_blank">
                  {chunks}
                </Link>
              ),
            })}
          </Label>
        </div>
        {human.element}
        {error ? (
          <p className="text-text" role="alert">
            {error}
          </p>
        ) : null}
        <Button
          disabled={
            pending ||
            !human.ready ||
            !agreed ||
            (external ? !named : auibLocalPart(values.email) === "" || !student)
          }
          type="submit"
        >
          {human.label(pending, t("signUp.submit"), t("signUp.submitting"))}
        </Button>
      </form>
      <p className="type-body">
        {external ? t("signUp.haveAnAccount") : t("signUp.haveAccount")}{" "}
        <Link
          className="link"
          href={{ pathname: "/sign-in", query: next ? { next } : {} }}
        >
          {t("signUp.signIn")}
        </Link>
      </p>
      {external ? null : (
        <p className="type-body">
          {t("signUp.notAuib")}{" "}
          <Link
            className="link"
            href={{ pathname: "/sign-up/guest", query: next ? { next } : {} }}
          >
            {t("signUp.guestLink")}
          </Link>
        </p>
      )}
    </>
  );
};
