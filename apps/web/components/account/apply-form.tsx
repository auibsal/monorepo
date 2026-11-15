"use client";

import { Field } from "@repo/brand/components/sal/field";
import { ReviewStep } from "@repo/brand/components/sal/form-flow";
import { Checkbox } from "@repo/brand/components/ui/checkbox";
import { Label } from "@repo/brand/components/ui/label";
import { Textarea } from "@repo/brand/components/ui/textarea";
import { formatClock, formatLongDate } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { ChoiceInput } from "@/components/diwan/admin/choice-input";
import { ErrorLine } from "@/components/diwan/admin/kit";
import { DiwanSection } from "@/components/diwan/page";
import { SectionSpinner } from "@/components/diwan/states";
import { useAuth } from "@/lib/auth/provider";
import { programmes } from "@/lib/data";
import { useMyMembership } from "@/lib/diwan/queries";
import { FlowReceipt, StatusLine, useReviewWords } from "./flow";

const MAX_LINKS = 5;
/** Drafts save as you go (decisions.md, The site: "One form flow"). */
const AUTOSAVE_MS = 4000;

/**
 * Saves the draft a few seconds after each change, while it is a draft
 * and its links are valid; says when it last saved.
 */
const useAutosave = (snapshot: string, ready: boolean, save: () => void) => {
  const last = useRef<string | null>(null);
  useEffect(() => {
    if (last.current === null) {
      last.current = snapshot;
      return;
    }
    if (!ready || snapshot === last.current) {
      return;
    }
    const timer = setTimeout(() => {
      last.current = snapshot;
      save();
    }, AUTOSAVE_MS);
    return () => clearTimeout(timer);
  }, [ready, save, snapshot]);
};

/** The reply time (decisions.md, Get involved: within 14 days of closing). */
const useReplyLine = (closesAt: string | null) => {
  const t = useTranslations("diwan.flow.reply");
  const locale = useLocale();
  return closesAt
    ? t("opening", { date: formatLongDate(closesAt, locale) })
    : t("openingAnyTime");
};

/**
 * The application (decisions.md, Get involved and roles): the opening's questions, availability,
 * the language to be written to in, links to work when asked, an optional
 * request for accommodation and, for a director seat, the consent to
 * Student Life's GPA check, signed by typing one's legal name. A draft can
 * be saved and finished later; sending it brings a receipt by email.
 */
const ApplicationEditor = ({
  existing,
  onSent,
  askFiles,
  closesAt,
  director,
  openingId,
  questions,
}: {
  readonly existing: Existing | undefined;
  readonly onSent: () => void;
  readonly askFiles: boolean;
  /** When the opening closes, for the reply time; null: any time. */
  readonly closesAt: string | null;
  readonly director: boolean;
  readonly openingId: string;
  readonly questions: readonly programmes.Question[];
}) => {
  const t = useTranslations("diwan.getInvolved.apply");
  const tf = useTranslations("diwan.flow");
  const locale = useLocale();
  const words = useReviewWords();
  const reply = useReplyLine(closesAt);
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  const key = ["applications", user?.id ?? ""];
  // The name the register holds: the GPA consent is signed in it.
  const signer = useQuery({
    queryFn: async () => {
      const { data, error } = await supabase
        .schema("core")
        .rpc("my_register_name");
      if (error) {
        throw error;
      }
      return data;
    },
    queryKey: ["register-name"],
  });
  const [form, setForm] = useState({
    accommodation: "",
    answers: {} as Record<string, string>,
    availability: "",
    gpa: "",
    lang: (locale === "ar" ? "ar" : "en") as "ar" | "en",
    links: "",
  });
  // A saved draft comes back into the form.
  useEffect(() => {
    if (existing?.status === "draft") {
      setForm((f) => ({
        ...f,
        accommodation: existing.accommodation ?? "",
        answers: (existing.answers ?? {}) as Record<string, string>,
        availability: existing.availability ?? "",
        gpa: existing.gpa_consent_name ? "yes" : "",
        lang: existing.lang === "ar" ? "ar" : "en",
        links: (existing.files ?? []).join("\n"),
      }));
    }
  }, [existing]);
  const links = form.links
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const linksOk =
    links.length <= MAX_LINKS &&
    links.every((l) => programmes.WORK_LINK.test(l));
  const input = {
    accommodation: form.accommodation,
    answers: form.answers,
    availability: form.availability,
    files: links,
    gpaConsentName: form.gpa,
    lang: form.lang,
    openingId,
  };
  const autosave = useMutation({
    mutationFn: () => programmes.saveApplication(supabase, input, false),
  });
  const send = useMutation({
    mutationFn: () => programmes.saveApplication(supabase, input, true),
    onSuccess: async () => {
      onSent();
      await queryClient.invalidateQueries({ queryKey: key });
    },
  });
  useAutosave(
    JSON.stringify(form),
    linksOk && !send.isPending,
    autosave.mutate
  );

  const complete =
    questions.every(
      (q) => !q.required || (form.answers[q.key] ?? "").trim() !== ""
    ) &&
    linksOk &&
    (!director || form.gpa.trim() !== "");

  const reviewRows: [string, string][] = [
    ...questions.map((q): [string, string] => [
      locale === "ar" ? q.ar : q.en,
      form.answers[q.key] ?? "",
    ]),
    [t("availability"), form.availability],
    [t("language"), form.lang === "ar" ? t("arabic") : t("english")],
    ...(askFiles ? [[t("links"), links.join("\n")] as [string, string]] : []),
    ...(form.accommodation
      ? [[t("accommodation"), form.accommodation] as [string, string]]
      : []),
  ];

  return (
    <DiwanSection id="apply" title={t("title")}>
      <form
        className="grid gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          send.mutate();
        }}
      >
        {questions.map((q) => (
          <Field
            key={q.key}
            label={`${locale === "ar" ? q.ar : q.en}${q.required ? "" : ` ${t("optional")}`}`}
          >
            {(id) => (
              <Textarea
                id={id}
                maxLength={3000}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    answers: { ...f.answers, [q.key]: e.target.value },
                  }))
                }
                rows={5}
                value={form.answers[q.key] ?? ""}
              />
            )}
          </Field>
        ))}
        <Field hint={t("availabilityHint")} label={t("availability")}>
          {(id) => (
            <Textarea
              id={id}
              maxLength={600}
              onChange={(e) =>
                setForm((f) => ({ ...f, availability: e.target.value }))
              }
              rows={3}
              value={form.availability}
            />
          )}
        </Field>
        <Field hint={t("languageHint")} label={t("language")}>
          {(id) => (
            <ChoiceInput
              id={id}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  lang: e.target.value === "ar" ? "ar" : "en",
                }))
              }
              value={form.lang}
            >
              <option value="en">{t("english")}</option>
              <option value="ar">{t("arabic")}</option>
            </ChoiceInput>
          )}
        </Field>
        {askFiles ? (
          <Field hint={t("linksHint")} label={t("links")}>
            {(id) => (
              <Textarea
                dir="ltr"
                id={id}
                onChange={(e) =>
                  setForm((f) => ({ ...f, links: e.target.value }))
                }
                rows={3}
                value={form.links}
              />
            )}
          </Field>
        ) : null}
        <Field hint={t("accommodationHint")} label={t("accommodation")}>
          {(id) => (
            <Textarea
              id={id}
              maxLength={600}
              onChange={(e) =>
                setForm((f) => ({ ...f, accommodation: e.target.value }))
              }
              rows={2}
              value={form.accommodation}
            />
          )}
        </Field>
        {director ? (
          <div className="border-line grid gap-3 border-y py-4">
            <p className="type-body">{t("gpaConsent")}</p>
            {/* "Sign as …": the register's name signs it, never typed. */}
            <div className="flex items-start gap-3">
              <Checkbox
                checked={form.gpa !== ""}
                id={`${openingId}-gpa`}
                onCheckedChange={(checked) =>
                  setForm((f) => ({ ...f, gpa: checked === true ? "yes" : "" }))
                }
              />
              <Label htmlFor={`${openingId}-gpa`}>
                {t("gpaSignAs", { name: signer.data ?? "" })}
              </Label>
            </div>
          </div>
        ) : null}
        <p className="type-caption" role="status">
          {autosave.isPending ? tf("draft.saving") : null}
          {autosave.isSuccess && !autosave.isPending
            ? tf("draft.saved", { time: formatClock(new Date(), locale) })
            : null}
          {autosave.isIdle ? tf("draft.resume") : null}
        </p>
        <p className="type-caption">{reply}</p>
        <ReviewStep
          missing={complete ? null : t("incomplete")}
          rows={reviewRows}
          sending={send.isPending}
          words={words}
        />
        <ErrorLine error={send.error ?? autosave.error} />
      </form>
    </DiwanSection>
  );
};

type Existing = Awaited<ReturnType<typeof programmes.myApplications>>[number];

/** One application once sent: the receipt the first time, then where it stands. */
const SentApplication = ({
  closesAt,
  existing,
  justSent,
}: {
  readonly closesAt: string | null;
  readonly existing: Existing;
  readonly justSent: boolean;
}) => {
  const t = useTranslations("diwan.getInvolved.apply");
  const tf = useTranslations("diwan.flow");
  const reply = useReplyLine(closesAt);
  if (justSent) {
    return (
      <FlowReceipt
        href="/account/roles"
        reference={existing.reference}
        reply={reply}
      />
    );
  }
  return (
    <div className="grid gap-3">
      <p className="type-body">
        {existing.reference
          ? tf("receipt.number", { number: existing.reference })
          : null}{" "}
        {reply}
      </p>
      <StatusLine kind="opening" status={existing.status} />
      <Link className="link justify-self-start" href="/account/roles">
        {t("yours")}
      </Link>
    </div>
  );
};

/**
 * The application (decisions.md, Get involved and roles), for members:
 * signed out, the way to sign in; sent, its receipt and where it stands;
 * otherwise the form, its draft saved as you go.
 */
export const ApplyForm = (props: {
  readonly askFiles: boolean;
  readonly closesAt: string | null;
  readonly director: boolean;
  readonly openingId: string;
  readonly questions: readonly programmes.Question[];
}) => {
  const { openingId } = props;
  const t = useTranslations("diwan.getInvolved.apply");
  const { loading, supabase, user } = useAuth();
  const mine = useMyMembership();
  const [justSent, setJustSent] = useState(false);
  const applications = useQuery({
    enabled: Boolean(user),
    queryFn: () => programmes.myApplications(supabase, user?.id ?? ""),
    queryKey: ["applications", user?.id ?? ""],
  });
  const existing = applications.data?.find((a) => a.opening_id === openingId);
  if (loading || (user && (mine.isPending || applications.isPending))) {
    return <SectionSpinner />;
  }
  if (!user) {
    return (
      <DiwanSection id="apply" title={t("title")}>
        <p className="type-body">
          {t("signInFirst")}{" "}
          <Link
            className="link"
            href={{
              pathname: "/sign-in",
              query: { next: `/get-involved/${openingId}` },
            }}
          >
            {t("signIn")}
          </Link>
        </p>
      </DiwanSection>
    );
  }
  if (mine.data?.kind !== "member") {
    return (
      <DiwanSection id="apply" title={t("title")}>
        <p className="type-body">
          {t("membersOnly")}{" "}
          <Link className="link" href="/join">
            {t("join")}
          </Link>
        </p>
      </DiwanSection>
    );
  }
  if (existing && !["draft", "withdrawn"].includes(existing.status)) {
    return (
      <DiwanSection id="apply" title={t("title")}>
        <SentApplication
          closesAt={props.closesAt}
          existing={existing}
          justSent={justSent}
        />
      </DiwanSection>
    );
  }
  return (
    <ApplicationEditor
      {...props}
      existing={existing}
      onSent={() => setJustSent(true)}
    />
  );
};
