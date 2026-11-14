"use client";

import { FormHeader } from "@repo/brand/components/sal/form-header";
import { Button } from "@repo/brand/components/ui/button";
import { Checkbox } from "@repo/brand/components/ui/checkbox";
import { Input } from "@repo/brand/components/ui/input";
import { Label } from "@repo/brand/components/ui/label";
import { Link } from "@repo/internationalization/navigation";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useId, useState } from "react";
import { PasswordInput } from "@/components/fields/password-input";
import {
  AUIB_DOMAIN,
  MIN_PASSWORD_LENGTH,
  signUpWithEmail,
} from "@/lib/auth/email";
import { useAuth } from "@/lib/auth/provider";
import { names as nameParts } from "@/lib/data";
import { useAuthError } from "@/lib/diwan/auth-messages";
import { callbackUrl, safeNextPath } from "@/lib/diwan/navigation";
import { useScreenTop } from "@/lib/diwan/use-screen-top";
import { isBreachedPassword } from "@/lib/password";
import { ChoiceInput } from "../admin/choice-input";
import { NamePartsFields } from "../name-parts-fields";
import { EmailCode } from "./email-code";
import { useHumanCheck } from "./human-check";
import { ResendConfirmation } from "./resend-confirmation";

/**
 * What an invitation or a partner application brings to the one sign-up
 * (decisions.md, Members): the invitation's address, when it names one, is
 * fixed, and its role is attached on confirming.
 */
interface OutsideSignUp {
  readonly email?: string | null;
  readonly reason: { invitation: string } | { partnerApplicant: true };
}

interface SignUpFormProps {
  /** Where the confirmation link brings them back to. */
  readonly next?: string;
  readonly outside?: OutsideSignUp;
}

/** A birth year for someone under 18: four digits. */
const MINOR_YEAR = /^(19|20)\d{2}$/u;
const EMAIL_SHAPE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/u;
const NOT_DIGITS = /\D/gu;

/** January to December in the page's language (Iraqi month names in Arabic). */
const monthNames = (locale: string) => {
  const format = new Intl.DateTimeFormat(locale === "ar" ? "ar-IQ" : "en-US", {
    month: "long",
    timeZone: "UTC",
  });
  return Array.from({ length: 12 }, (_, m) =>
    format.format(new Date(Date.UTC(2026, m, 1)))
  );
};

interface MinorForm {
  readonly month: string;
  readonly parent: string;
  readonly year: string;
}

type Adult = "" | "no" | "yes";

/** 18 or older, or under 18 with the month, year and a parent's address. */
const isAgeAnswered = (adult: Adult, minorAllowed: boolean, minor: MinorForm) =>
  adult === "yes" ||
  (minorAllowed &&
    adult === "no" &&
    minor.month !== "" &&
    MINOR_YEAR.test(minor.year) &&
    EMAIL_SHAPE.test(minor.parent.trim()));

const minorDetails = (adult: Adult, minorAllowed: boolean, minor: MinorForm) =>
  adult === "no" && minorAllowed
    ? {
        birthMonth: Number(minor.month),
        birthYear: Number(minor.year),
        parentEmail: minor.parent.trim(),
      }
    : undefined;

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
  const email = values.email.trim().toLowerCase();
  const auib = email.endsWith(`@${AUIB_DOMAIN}`);
  const invited = Boolean(outside && "invitation" in outside.reason);
  // The official name (decisions.md, Members): four parts in each
  // language as on the person's papers, locked once the account is made.
  const [fullNames, setFullNames] = useState<nameParts.FourPartNames>({
    ar: nameParts.emptyParts(),
    en: nameParts.emptyParts(),
  });
  const named =
    nameParts.partsReady(fullNames.en, "en") &&
    nameParts.partsReady(fullNames.ar, "ar");
  // An AUIB address says which it is: a student is a Member; faculty,
  // staff or alumni are Associates. Any other address is a Guest, and
  // "I studied at AUIB" asks for Associate membership.
  const [klass, setKlass] = useState<"" | "student" | "staff">("");
  const [studied, setStudied] = useState(false);
  const [titleForm, setTitleForm] = useState<"" | "masculine" | "feminine">(
    ""
  );
  // Under 18: the month and year of birth (deleted at 18) and a parent's
  // address for the consent link; for an AUIB student or by invitation.
  const minorAllowed = auib || invited;
  const [adult, setAdult] = useState<Adult>("");
  const [minor, setMinor] = useState({ month: "", parent: "", year: "" });
  const ageAnswered = isAgeAnswered(adult, minorAllowed, minor);
  // The mailing list (decisions.md, Channels and email): members are on it
  // unless they untick the box; everyone else only if they tick it.
  const [mailing, setMailing] = useState<boolean | null>(null);
  const mailingOn = mailing ?? auib;
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [sentTo, setSentTo] = useState<string>();
  useScreenTop(sentTo);
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
      adult: adult === "yes",
      captchaToken: human.token,
      class: auib && klass ? klass : undefined,
      email,
      locale: locale === "ar" ? "ar" : "en",
      mailing: mailingOn,
      minor: minorDetails(adult, minorAllowed, minor),
      names: fullNames,
      outside: outside?.reason,
      password: values.password,
      // The confirmation link brings the person back to what they started.
      redirectTo: callbackUrl(locale, next),
      studiedAtAuib: !(auib || outside) && studied,
      titleForm: titleForm || undefined,
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
      {outside ? null : (
        <FormHeader title={t("signUp.title")}>
          {t("signUp.description")}
        </FormHeader>
      )}
      <form className="grid gap-4" noValidate onSubmit={submit}>
        <div className="grid gap-2">
          <Label htmlFor={`${id}-email`}>{t("email")}</Label>
          <Input
            aria-describedby={`${id}-email-hint`}
            autoCapitalize="none"
            autoComplete="email"
            dir="ltr"
            id={`${id}-email`}
            inputMode="email"
            onChange={set("email")}
            readOnly={Boolean(outside?.email)}
            required
            spellCheck={false}
            type="email"
            value={values.email}
          />
          <p className="type-caption" id={`${id}-email-hint`}>
            {t("signUp.emailHint", { domain: AUIB_DOMAIN })}
          </p>
        </div>
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
        {auib ? (
          <div className="grid gap-2">
            <Label htmlFor={`${id}-class`}>{t("signUp.classQuestion")}</Label>
            <ChoiceInput
              id={`${id}-class`}
              onChange={(event) =>
                setKlass(event.target.value as "student" | "staff")
              }
              value={klass}
            >
              <option value="student">{t("signUp.classStudent")}</option>
              <option value="staff">{t("signUp.classStaff")}</option>
            </ChoiceInput>
          </div>
        ) : null}
        {email.includes("@") && !auib && !outside ? (
          <div className="flex items-start gap-3">
            <Checkbox
              aria-describedby={`${id}-studied-hint`}
              checked={studied}
              id={`${id}-studied`}
              onCheckedChange={(v) => setStudied(v === true)}
            />
            <div className="grid gap-1">
              <Label className="leading-normal" htmlFor={`${id}-studied`}>
                {t("signUp.studied")}
              </Label>
              <p className="type-caption" id={`${id}-studied-hint`}>
                {t("signUp.studiedHint")}
              </p>
            </div>
          </div>
        ) : null}
        <div className="grid gap-4">
          <p className="type-caption" id={`${id}-names-hint`}>
            {t("signUp.namesHint")}
          </p>
          {(["en", "ar"] as const).map((lang) => (
            <fieldset className="grid gap-3" key={lang}>
              <legend className="mb-2 text-sm font-medium">
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
        <div className="grid gap-2">
          <Label htmlFor={`${id}-title-form`}>{t("signUp.titleForm")}</Label>
          <ChoiceInput
            id={`${id}-title-form`}
            onChange={(event) =>
              setTitleForm(event.target.value as "masculine" | "feminine")
            }
            value={titleForm}
          >
            <option value="masculine">{t("signUp.titleForms.masculine")}</option>
            <option value="feminine">{t("signUp.titleForms.feminine")}</option>
          </ChoiceInput>
        </div>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor={`${id}-adult`}>{t("signUp.adultQuestion")}</Label>
            <ChoiceInput
              id={`${id}-adult`}
              onChange={(event) => setAdult(event.target.value as "no" | "yes")}
              value={adult}
            >
              <option value="yes">{t("signUp.adultYes")}</option>
              <option value="no">{t("signUp.adultNo")}</option>
            </ChoiceInput>
          </div>
          {adult === "no" && !minorAllowed ? (
            <p className="type-caption" role="status">
              {t("signUp.adultOnly")}
            </p>
          ) : null}
          {adult === "no" && minorAllowed ? (
            <div className="grid gap-4">
              <p className="type-caption">{t("signUp.minorHint")}</p>
              <div className="grid gap-2">
                <Label htmlFor={`${id}-month`}>{t("signUp.birthMonth")}</Label>
                <ChoiceInput
                  id={`${id}-month`}
                  onChange={(event) =>
                    setMinor((m) => ({ ...m, month: event.target.value }))
                  }
                  value={minor.month}
                >
                  {monthNames(locale).map((name, index) => (
                    <option key={name} value={String(index + 1)}>
                      {name}
                    </option>
                  ))}
                </ChoiceInput>
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`${id}-year`}>{t("signUp.birthYear")}</Label>
                <Input
                  dir="ltr"
                  id={`${id}-year`}
                  inputMode="numeric"
                  maxLength={4}
                  onChange={(event) =>
                    setMinor((m) => ({
                      ...m,
                      year: event.target.value.replace(NOT_DIGITS, ""),
                    }))
                  }
                  value={minor.year}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor={`${id}-parent`}>
                  {t("signUp.parentEmail")}
                </Label>
                <Input
                  autoComplete="off"
                  dir="ltr"
                  id={`${id}-parent`}
                  inputMode="email"
                  onChange={(event) =>
                    setMinor((m) => ({ ...m, parent: event.target.value }))
                  }
                  type="email"
                  value={minor.parent}
                />
                <p className="type-caption">{t("signUp.parentHint")}</p>
              </div>
            </div>
          ) : null}
        </div>
        <div className="flex items-start gap-3">
          <Checkbox
            checked={mailingOn}
            id={`${id}-mailing`}
            onCheckedChange={(v) => setMailing(v === true)}
          />
          <Label className="leading-normal" htmlFor={`${id}-mailing`}>
            {t("signUp.mailing")}
          </Label>
        </div>
        {human.element}
        {error ? (
          <p className="text-text" role="alert">
            {error}
          </p>
        ) : null}
        {/* No boxes to agree and no signature: one line by the button
            (decisions.md, Members), logged on the account. */}
        <p className="type-caption max-w-[60ch]">
          {t.rich("signUp.line", {
            conduct: (chunks) => (
              <Link className="link" href="/code-of-conduct" target="_blank">
                {chunks}
              </Link>
            ),
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
        </p>
        <Button
          className="justify-self-start"
          disabled={
            pending ||
            !human.ready ||
            !EMAIL_SHAPE.test(email) ||
            !ageAnswered ||
            !named ||
            !titleForm ||
            (auib && !klass)
          }
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
