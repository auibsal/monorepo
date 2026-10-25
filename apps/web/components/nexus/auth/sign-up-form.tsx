"use client";

import { isAuibEmail, signUpWithEmail } from "@repo/auth/email";
import { useAuth } from "@repo/auth/provider";
import { FormHeader } from "@repo/design-system/components/sal/form-header";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { Link } from "@repo/internationalization/navigation";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useId, useState } from "react";
import { useAuthError } from "@/lib/nexus/auth-messages";
import { callbackUrl, safeNextPath } from "@/lib/nexus/navigation";
import { EmailCode } from "./email-code";
import { useHumanCheck } from "./human-check";

export const SignUpForm = () => {
  const t = useTranslations("auth");
  const errorText = useAuthError();
  const { supabase } = useAuth();
  const locale = useLocale();
  const next = safeNextPath(useSearchParams().get("next"));
  const id = useId();
  const [values, setValues] = useState({
    email: "",
    familyAr: "",
    familyEn: "",
    givenAr: "",
    givenEn: "",
    password: "",
    statement: "",
  });
  // AUIB addresses give their names in setup; the Council verifies others
  // by theirs, so they give them here.
  const named = [
    values.givenEn,
    values.familyEn,
    values.givenAr,
    values.familyAr,
  ].every((part) => part.trim() !== "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [sentTo, setSentTo] = useState<string>();
  const external = values.email.includes("@") && !isAuibEmail(values.email);
  const human = useHumanCheck("sign-up");

  const set =
    (key: keyof typeof values) => (event: { target: { value: string } }) =>
      setValues((current) => ({ ...current, [key]: event.target.value }));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setError(undefined);
    const result = await signUpWithEmail(supabase, {
      captchaToken: human.token,
      email: values.email,
      locale: locale === "ar" ? "ar" : "en",
      names: external
        ? {
            familyAr: values.familyAr,
            familyEn: values.familyEn,
            givenAr: values.givenAr,
            givenEn: values.givenEn,
          }
        : undefined,
      password: values.password,
      // The confirmation link brings the member back to what they started.
      redirectTo: callbackUrl(locale, next),
      verificationStatement: values.statement,
    });
    setPending(false);
    human.reset();
    if (result.ok) {
      setSentTo(values.email);
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
      </>
    );
  }

  return (
    <>
      <FormHeader title={t("signUp.title")}>
        {t("signUp.description")}
      </FormHeader>
      <form className="grid gap-4" noValidate onSubmit={submit}>
        <div className="grid gap-2">
          <Label htmlFor={`${id}-email`}>{t("email")}</Label>
          <Input
            aria-describedby={`${id}-email-hint`}
            autoComplete="email"
            dir="ltr"
            id={`${id}-email`}
            inputMode="email"
            onChange={set("email")}
            required
            type="email"
            value={values.email}
          />
          <p className="type-caption" id={`${id}-email-hint`}>
            {t("emailHint")}
          </p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${id}-password`}>{t("password")}</Label>
          <Input
            aria-describedby={`${id}-password-hint`}
            autoComplete="new-password"
            dir="ltr"
            id={`${id}-password`}
            minLength={10}
            onChange={set("password")}
            required
            type="password"
            value={values.password}
          />
          <p className="type-caption" id={`${id}-password-hint`}>
            {t("passwordHint")}
          </p>
        </div>
        {external ? (
          <div className="grid gap-4">
            <p className="type-body">{t("signUp.outsideAuib")}</p>
            <p className="type-caption" id={`${id}-names-hint`}>
              {t("signUp.namesHint")}
            </p>
            <fieldset
              aria-describedby={`${id}-names-hint`}
              className="grid gap-3 sm:grid-cols-2"
            >
              <legend className="mb-2 font-medium text-sm">
                {t("signUp.nameEn")}
              </legend>
              <div className="grid gap-2">
                <Label htmlFor={`${id}-given-en`}>
                  {t("signUp.givenName")}
                </Label>
                <Input
                  autoComplete="given-name"
                  dir="ltr"
                  id={`${id}-given-en`}
                  lang="en"
                  maxLength={60}
                  onChange={set("givenEn")}
                  required
                  value={values.givenEn}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`${id}-family-en`}>
                  {t("signUp.familyName")}
                </Label>
                <Input
                  autoComplete="family-name"
                  dir="ltr"
                  id={`${id}-family-en`}
                  lang="en"
                  maxLength={60}
                  onChange={set("familyEn")}
                  required
                  value={values.familyEn}
                />
              </div>
            </fieldset>
            <fieldset
              aria-describedby={`${id}-names-hint`}
              className="grid gap-3 sm:grid-cols-2"
            >
              <legend className="mb-2 font-medium text-sm">
                {t("signUp.nameAr")}
              </legend>
              <div className="grid gap-2">
                <Label htmlFor={`${id}-given-ar`}>
                  {t("signUp.givenName")}
                </Label>
                <Input
                  dir="rtl"
                  id={`${id}-given-ar`}
                  lang="ar"
                  maxLength={60}
                  onChange={set("givenAr")}
                  required
                  value={values.givenAr}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`${id}-family-ar`}>
                  {t("signUp.familyName")}
                </Label>
                <Input
                  dir="rtl"
                  id={`${id}-family-ar`}
                  lang="ar"
                  maxLength={60}
                  onChange={set("familyAr")}
                  required
                  value={values.familyAr}
                />
              </div>
            </fieldset>
            <div className="grid gap-2">
              <Label htmlFor={`${id}-statement`}>{t("signUp.statement")}</Label>
              <Textarea
                aria-describedby={`${id}-statement-hint`}
                id={`${id}-statement`}
                maxLength={1000}
                onChange={set("statement")}
                rows={3}
                value={values.statement}
              />
              <p className="type-caption" id={`${id}-statement-hint`}>
                {t("signUp.statementHint")}
              </p>
            </div>
          </div>
        ) : null}
        {human.element}
        {error ? (
          <p className="text-text" role="alert">
            {error}
          </p>
        ) : null}
        <Button
          disabled={pending || !human.ready || (external && !named)}
          type="submit"
        >
          {human.label(pending, t("signUp.submit"), t("signUp.submitting"))}
        </Button>
      </form>
      <p className="type-body">
        {t("signUp.haveAccount")}{" "}
        <Link
          className="link"
          href={{ pathname: "/sign-in", query: next ? { next } : {} }}
        >
          {t("signUp.signIn")}
        </Link>
      </p>
    </>
  );
};
