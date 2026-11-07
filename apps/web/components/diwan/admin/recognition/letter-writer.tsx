"use client";

import { Letter } from "@repo/brand/components/sal/letter";
import { Button } from "@repo/brand/components/ui/button";
import { Input } from "@repo/brand/components/ui/input";
import { Textarea } from "@repo/brand/components/ui/textarea";
import { formatPlainDate } from "@repo/internationalization/format";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useProfile } from "@/lib/diwan/queries";
import { Field, RecordPage, SelectInput } from "../kit";

/**
 * The letters of the register (SAL-EXB-01) other than service letters,
 * which have their own records: the wording lives in the Leadership
 * Handbook's templates, and every one is sent on the one letter template.
 */
const LETTER_FORMS = ["f03", "f30", "f32", "f33", "f34", "f42"] as const;
type LetterForm = (typeof LETTER_FORMS)[number];
type Lang = "en" | "ar";

const PARAGRAPHS = /\n{2,}/;

const SIGN_OFF: Record<Lang, string> = {
  ar: "مع خالص التحية،",
  en: "Sincerely,",
};

/**
 * One letter template for every letter (owner, Nov 7, 2026; F-03, F-30,
 * F-32, F-33, F-34, F-42): the officer picks the letter, writes it from the
 * register's template in the recipient's language, and prints it or saves
 * it as PDF from the browser. Nothing is stored here: the record stays in
 * Notion (or, for F-42, with the submission).
 */
const LetterWriter = () => {
  const t = useTranslations("diwan.admin.recognition.letterWriter");
  const profile = useProfile();
  const [form, setForm] = useState<LetterForm>("f03");
  const [lang, setLang] = useState<Lang>("en");
  const [recipient, setRecipient] = useState("");
  const [greeting, setGreeting] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [seat, setSeat] = useState("");
  const ar = lang === "ar";
  const signer =
    (ar ? profile.data?.full_name_ar : null) ??
    profile.data?.full_name_en ??
    "";

  return (
    <div className="grid gap-8">
      <div className="grid max-w-3xl gap-4 print:hidden">
        <p className="type-body">{t("lede")}</p>
        <Field label={t("form")}>
          {(id) => (
            <SelectInput
              id={id}
              onChange={(e) => setForm(e.target.value as LetterForm)}
              value={form}
            >
              {LETTER_FORMS.map((key) => (
                <option key={key} value={key}>
                  {t(`forms.${key}`)}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
        <Field label={t("language")}>
          {(id) => (
            <SelectInput
              id={id}
              onChange={(e) => setLang(e.target.value as Lang)}
              value={lang}
            >
              <option value="en">{t("languages.en")}</option>
              <option value="ar">{t("languages.ar")}</option>
            </SelectInput>
          )}
        </Field>
        <Field hint={t("recipientHint")} label={t("recipient")}>
          {(id) => (
            <Textarea
              dir="auto"
              id={id}
              onChange={(e) => setRecipient(e.target.value)}
              rows={3}
              value={recipient}
            />
          )}
        </Field>
        <Field label={t("subject")}>
          {(id) => (
            <Input
              dir="auto"
              id={id}
              onChange={(e) => setSubject(e.target.value)}
              value={subject}
            />
          )}
        </Field>
        <Field hint={t("greetingHint")} label={t("greeting")}>
          {(id) => (
            <Input
              dir="auto"
              id={id}
              onChange={(e) => setGreeting(e.target.value)}
              value={greeting}
            />
          )}
        </Field>
        <Field hint={t("bodyHint")} label={t("body")}>
          {(id) => (
            <Textarea
              dir="auto"
              id={id}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              value={body}
            />
          )}
        </Field>
        <Field label={t("seat")}>
          {(id) => (
            <Input
              dir="auto"
              id={id}
              onChange={(e) => setSeat(e.target.value)}
              value={seat}
            />
          )}
        </Field>
        <Button
          className="justify-self-start"
          onClick={() => window.print()}
          type="button"
        >
          {t("print")}
        </Button>
      </div>
      <div dir={ar ? "rtl" : "ltr"} lang={lang}>
        <Letter
          code={`SAL-EXB-01 · F-${form.slice(1)}`}
          date={formatPlainDate(new Date(), lang)}
          foot="hello@auibsal.org · auibsal.org"
          greeting={greeting}
          locale={lang}
          recipient={recipient.split("\n").filter((line) => line.trim())}
          signer={{ name: signer, role: seat }}
          signOff={SIGN_OFF[lang]}
          subject={subject}
        >
          {body
            .split(PARAGRAPHS)
            .filter((paragraph) => paragraph.trim())
            .map((paragraph) => (
              <p className="whitespace-pre-line" key={paragraph}>
                {paragraph}
              </p>
            ))}
        </Letter>
      </div>
    </div>
  );
};

/** The letter writer on its own page, under Service letters. */
export const LetterWriterPage = () => {
  const t = useTranslations("diwan.admin.recognition");
  return (
    <RecordPage
      back="/people/service/letters"
      backLabel={t("tabs.letters")}
      title={t("letterWriter.title")}
    >
      <LetterWriter />
    </RecordPage>
  );
};
