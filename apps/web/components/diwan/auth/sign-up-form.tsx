"use client";

import { FormHeader } from "@repo/brand/components/sal/form-header";
import { Button } from "@repo/brand/components/ui/button";
import { Checkbox } from "@repo/brand/components/ui/checkbox";
import { Input } from "@repo/brand/components/ui/input";
import { Label } from "@repo/brand/components/ui/label";
import { apiPath } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, type ReactNode, useId, useState } from "react";
import { PasswordInput } from "@/components/fields/password-input";
import {
  AUIB_DOMAIN,
  isStudentAddress,
  MIN_PASSWORD_LENGTH,
  newSignUpKey,
  signUpWithEmail,
  unusualStudentNumber,
} from "@/lib/auth/email";
import { useAuth } from "@/lib/auth/provider";
import { names as nameParts } from "@/lib/data";
import { useAuthError } from "@/lib/diwan/auth-messages";
import { callbackUrl, safeNextPath } from "@/lib/diwan/navigation";
import { useScreenTop } from "@/lib/diwan/use-screen-top";
import { isBreachedPassword } from "@/lib/password";
import { ChoiceInput } from "../admin/choice-input";
import { EmailCode } from "./email-code";
import { useHumanCheck } from "./human-check";
import { ResendConfirmation } from "./resend-confirmation";

/**
 * What an invitation or a partner application brings to the one sign-up
 * (decisions.md, Members): the invitation's address, when it names one, is
 * fixed, and its role is attached on confirming.
 */
interface OutsideSignUp {
  /** An invitation to Associate or Honorary membership: 18 or older only. */
  readonly adultsOnly?: boolean;
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

export interface MinorForm {
  readonly month: string;
  readonly parent: string;
  readonly year: string;
}

/** "I'm 18 or older" ticked, or "Under 18?" opened. */
type Adult = "" | "no" | "yes";

/**
 * Under 13 (decisions.md, Members: minors, as US sites follow COPPA): an
 * account is for people 13 or older, unless an invitation brings its own
 * consent. Only the month and year are asked, so the birthday is taken as
 * the end of the month; private.under_minimum_age refuses the same.
 */
export const underMinimumAge = (minor: MinorForm, now = new Date()) => {
  if (minor.month === "" || !MINOR_YEAR.test(minor.year)) {
    return false;
  }
  const thirteen = new Date(
    Date.UTC(Number(minor.year) + 13, Number(minor.month), 1)
  );
  return thirteen > now;
};

/** Says at once that an account is for people 13 or older. */
const MinimumAgeNote = ({
  invited,
  minor,
}: {
  readonly invited: boolean;
  readonly minor: MinorForm;
}) => {
  const t = useTranslations("auth.signUp");
  return invited || !underMinimumAge(minor) ? null : (
    <p className="type-caption" role="status">
      {t("tooYoung")}
    </p>
  );
};

/** 18 or older, or under 18 with the month, year and a parent's address. */
const isAgeAnswered = (
  adult: Adult,
  minorAllowed: boolean,
  minor: MinorForm,
  invited: boolean
) =>
  adult === "yes" ||
  (minorAllowed &&
    adult === "no" &&
    minor.month !== "" &&
    MINOR_YEAR.test(minor.year) &&
    (invited || !underMinimumAge(minor)) &&
    EMAIL_SHAPE.test(minor.parent.trim()));

const minorDetails = (adult: Adult, minorAllowed: boolean, minor: MinorForm) =>
  adult === "no" && minorAllowed
    ? {
        birthMonth: Number(minor.month),
        birthYear: Number(minor.year),
        parentEmail: minor.parent.trim(),
      }
    : undefined;

/**
 * Where a partner's application continues (decisions.md, Partners): an
 * account made on the way there applies for the organization.
 */
export const PARTNER_APPLY_PATH = "/partners/apply";

/**
 * Where the sign-up returns to, and what it brings: signing up on the way
 * to the memorandum makes a partner's account, never a guest's.
 */
const useSignUpContext = ({
  next: given,
  outside: givenOutside,
}: SignUpFormProps) => {
  const asked = safeNextPath(useSearchParams().get("next"));
  const next = given ?? asked;
  const partner = !givenOutside && next === PARTNER_APPLY_PATH;
  const outside: OutsideSignUp | undefined =
    givenOutside ??
    (partner ? { reason: { partnerApplicant: true } } : undefined);
  return { next, outside, partner };
};

/**
 * "Wrong address?" on the inbox screen: the sign-up just made is deleted
 * (it was never confirmed), and the form comes back with everything typed
 * so the address can be put right; no second account is left behind.
 */
const WrongAddress = ({
  email,
  onDropped,
  signUpKey,
}: {
  readonly email: string;
  readonly onDropped: () => void;
  readonly signUpKey: string;
}) => {
  const t = useTranslations("auth.signUp");
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const fix = async () => {
    setPending(true);
    setFailed(false);
    const response = await fetch(apiPath("/sign-up/wrong-address"), {
      body: JSON.stringify({ email, key: signUpKey }),
      headers: { "content-type": "application/json" },
      method: "POST",
    }).catch(() => null);
    const body = (await response?.json().catch(() => null)) as {
      dropped?: boolean;
    } | null;
    setPending(false);
    if (body?.dropped) {
      onDropped();
    } else {
      setFailed(true);
    }
  };
  return (
    <div className="grid gap-2">
      <button
        className="link justify-self-start"
        disabled={pending}
        onClick={fix}
        type="button"
      >
        {t("wrongAddress")}
      </button>
      {failed ? (
        <p className="type-caption" role="alert">
          {t("wrongAddressFailed")}
        </p>
      ) : null}
    </div>
  );
};

/** Capitalized, hyphens closed up: what an English line is saved as. */
const tidyName = nameParts.tidyEnglishName;

/**
 * One line of four names in one language (decisions.md, Members): as on
 * the person's papers, letters only. Under it the words are shown back
 * with a tap between each two: a name of two words written with a space
 * ("Mohammed Ali", «أبو بكر») is joined by tapping between them. «أبو»
 * and «عبد» come joined in Arabic. The line under that says what is
 * missing, or that the four are ready.
 */
const NameLine = ({
  choices,
  describedBy,
  joins,
  language,
  onChange,
  onJoin,
  value,
}: {
  readonly choices: nameParts.JoinChoices;
  readonly describedBy: string;
  readonly joins: nameParts.Joins;
  readonly language: "ar" | "en";
  readonly onChange: (value: string) => void;
  readonly onJoin: (key: string, joined: boolean) => void;
  readonly value: string;
}) => {
  const t = useTranslations("auth.signUp");
  const id = useId();
  // A fifth name was refused: the words show, to join two of one name.
  const [full, setFull] = useState(false);
  const [left, setLeft] = useState(false);
  const words = nameParts.wordsInLine(value);
  const problem =
    words.length > 0 ? nameParts.lineProblem(value, language, joins) : null;
  const names = nameParts.namesInLine(value, language, joins);
  let caption: ReactNode = t(language === "en" ? "nameHintEn" : "nameHintAr");
  if (full) {
    caption = t("nameFull");
  } else if (problem && left) {
    caption = t(`nameProblems.${problem}`, { count: String(names.length) });
  }
  const type = (raw: string) => {
    const next = nameParts.typedName(raw, language);
    if (!nameParts.roomForNames(next, language, choices)) {
      setFull(true);
      return;
    }
    setFull(false);
    onChange(next);
  };
  const dir = language === "en" ? "ltr" : "rtl";
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>
        {language === "en" ? t("nameEn") : t("nameAr")}
      </Label>
      <Input
        aria-describedby={`${describedBy} ${id}-read`}
        aria-invalid={problem && left ? true : undefined}
        autoCapitalize={language === "en" ? "words" : "none"}
        autoComplete="off"
        dir={dir}
        id={id}
        lang={language}
        onBlur={() => {
          setLeft(true);
          if (language === "en") {
            onChange(tidyName(value));
          }
        }}
        onChange={(event) => type(event.target.value)}
        spellCheck={false}
        value={value}
      />
      {words.length > 1 && (full || joins.size > 0) ? (
        <ol
          aria-label={t("nameWords")}
          className="flex flex-wrap items-center"
          dir={dir}
          lang={language}
        >
          {words.map((word, i) => (
            <li
              className="flex items-center"
              // The same words whatever the capitals (English is
              // capitalized when the field is left), so a tap isn't lost.
              key={words
                .slice(0, i + 1)
                .join(" ")
                .toLowerCase()}
            >
              <span>{word}</span>
              {i < words.length - 1 ? (
                <button
                  aria-label={t(joins.has(i) ? "nameSeparate" : "nameJoin", {
                    first: word,
                    second: words[i + 1] ?? "",
                  })}
                  aria-pressed={joins.has(i)}
                  className="text-text-secondary hover:text-text min-h-11 min-w-11 px-2"
                  onClick={() => {
                    setFull(false);
                    onJoin(nameParts.gapKey(words, i), !joins.has(i));
                  }}
                  type="button"
                >
                  {joins.has(i) ? "‿" : "·"}
                </button>
              ) : null}
            </li>
          ))}
        </ol>
      ) : null}
      <p className="type-caption" id={`${id}-read`} role="status">
        {caption}
      </p>
    </div>
  );
};

export const SignUpForm = (props: SignUpFormProps) => {
  const t = useTranslations("auth");
  const tp = useTranslations("diwan.partnerJoin");
  const errorText = useAuthError();
  const { supabase } = useAuth();
  const locale = useLocale();
  const { next, outside, partner } = useSignUpContext(props);
  const id = useId();
  const [values, setValues] = useState({
    email: outside?.email ?? "",
    password: "",
  });
  const email = values.email.trim().toLowerCase();
  const auib = email.endsWith(`@${AUIB_DOMAIN}`);
  const invited = Boolean(outside && "invitation" in outside.reason);
  // The official name (decisions.md, Members): four names in each
  // language as on the person's papers, one line each, locked once the
  // account is made.
  const [lines, setLines] = useState({ ar: "", en: "" });
  // Two words of one name ("Mohammed Ali"), joined by a tap.
  const [choices, setChoices] = useState<
    Record<"ar" | "en", nameParts.JoinChoices>
  >({ ar: new Map(), en: new Map() });
  const joins = {
    ar: nameParts.joinsFor(lines.ar, "ar", choices.ar),
    en: nameParts.joinsFor(lines.en, "en", choices.en),
  };
  const named =
    nameParts.lineProblem(lines.en, "en", joins.en) === null &&
    nameParts.lineProblem(lines.ar, "ar", joins.ar) === null;
  // An AUIB address says which it is: a student is a Member; faculty,
  // staff or alumni are Associates. Any other address is a Guest, and
  // "I studied at AUIB" asks for Associate membership.
  const [studied, setStudied] = useState(false);
  // Under 18: the month and year of birth (deleted at 18) and a parent's
  // address for the consent link; for an AUIB student, or by an
  // invitation that isn't to a class. Associate Members are 18 or older
  // (decisions.md, Members).
  const minorAllowed =
    !outside?.adultsOnly && (isStudentAddress(email) || invited);
  const [adult, setAdult] = useState<Adult>("");
  const [minor, setMinor] = useState({ month: "", parent: "", year: "" });
  const ageAnswered = isAgeAnswered(adult, minorAllowed, minor, invited);
  // The mailing list (decisions.md, Channels and email): ticked for
  // everyone, who can untick it.
  const [mailingOn, setMailing] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [sentTo, setSentTo] = useState<string>();
  // "Wrong address?" (decisions.md, Members): only this browser holds the
  // key that deletes the sign-up it just made.
  const [signUpKey] = useState(newSignUpKey);
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
      email,
      locale: locale === "ar" ? "ar" : "en",
      mailing: mailingOn,
      minor: minorDetails(adult, minorAllowed, minor),
      names: {
        ar: nameParts.partsFromLine(lines.ar, "ar", joins.ar),
        en: nameParts.partsFromLine(tidyName(lines.en), "en", joins.en),
      },
      outside: outside?.reason,
      password: values.password,
      // The confirmation link brings the person back to what they started.
      redirectTo: callbackUrl(locale, next),
      signUpKey,
      // Associate Members are 18 or older (decisions.md, Members).
      studiedAtAuib: !(auib || outside) && studied && adult === "yes",
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
        <WrongAddress
          email={sentTo}
          onDropped={() => setSentTo(undefined)}
          signUpKey={signUpKey}
        />
      </>
    );
  }

  return (
    <>
      {/* Invited, the page around the form says what it is for. */}
      {partner ? (
        <FormHeader title={tp("title")}>
          <span className="grid gap-2">
            <span>{tp("account")}</span>
            <span>{tp("members")}</span>
          </span>
        </FormHeader>
      ) : null}
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
          {unusualStudentNumber(email) ? (
            <p className="type-caption text-text" role="status">
              {t("signUp.numberCheck")}
            </p>
          ) : null}
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
        {email.includes("@") && !auib && !outside && adult !== "no" ? (
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
            <NameLine
              choices={choices[lang]}
              describedBy={`${id}-names-hint`}
              joins={joins[lang]}
              key={lang}
              language={lang}
              onChange={(value) =>
                setLines((current) => ({ ...current, [lang]: value }))
              }
              onJoin={(key, joined) =>
                setChoices((current) => ({
                  ...current,
                  [lang]: new Map(current[lang]).set(key, joined),
                }))
              }
              value={lines[lang]}
            />
          ))}
        </div>
        <div className="grid gap-4">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={adult === "yes"}
                id={`${id}-adult`}
                onCheckedChange={(v) => setAdult(v === true ? "yes" : "")}
              />
              <Label className="leading-normal" htmlFor={`${id}-adult`}>
                {t("signUp.adultYes")}
              </Label>
            </div>
            {adult === "no" ? null : (
              <button
                className="link"
                onClick={() => setAdult("no")}
                type="button"
              >
                {t("signUp.under18")}
              </button>
            )}
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
                <MinimumAgeNote invited={invited} minor={minor} />
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
            !named
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
