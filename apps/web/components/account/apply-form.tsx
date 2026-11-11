"use client";

import { Field } from "@repo/brand/components/sal/field";
import { Button } from "@repo/brand/components/ui/button";
import { Input } from "@repo/brand/components/ui/input";
import { Textarea } from "@repo/brand/components/ui/textarea";
import { Link } from "@repo/internationalization/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { ChoiceInput } from "@/components/diwan/admin/choice-input";
import { ErrorLine } from "@/components/diwan/admin/kit";
import { DiwanSection } from "@/components/diwan/page";
import { SectionSpinner } from "@/components/diwan/states";
import { useAuth } from "@/lib/auth/provider";
import { programmes } from "@/lib/data";
import { useMyMembership } from "@/lib/diwan/queries";

const MAX_LINKS = 5;

/**
 * The application (decisions §17): the opening's questions, availability,
 * the language to be written to in, links to work when asked, an optional
 * request for accommodation and, for a director seat, the consent to
 * Student Life's GPA check, signed by typing one's legal name. A draft can
 * be saved and finished later; sending it brings a receipt by email.
 */
export const ApplyForm = ({
  askFiles,
  director,
  openingId,
  questions,
}: {
  readonly askFiles: boolean;
  readonly director: boolean;
  readonly openingId: string;
  readonly questions: readonly programmes.Question[];
}) => {
  const t = useTranslations("diwan.getInvolved.apply");
  const locale = useLocale();
  const { loading, supabase, user } = useAuth();
  const mine = useMyMembership();
  const queryClient = useQueryClient();
  const key = ["applications", user?.id ?? ""];
  const applications = useQuery({
    enabled: Boolean(user),
    queryFn: () => programmes.myApplications(supabase, user?.id ?? ""),
    queryKey: key,
  });
  const existing = applications.data?.find((a) => a.opening_id === openingId);
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
        gpa: existing.gpa_consent_name ?? "",
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
  const save = useMutation({
    mutationFn: (submit: boolean) =>
      programmes.saveApplication(
        supabase,
        {
          accommodation: form.accommodation,
          answers: form.answers,
          availability: form.availability,
          files: links,
          gpaConsentName: form.gpa,
          lang: form.lang,
          openingId,
        },
        submit
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });

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
        <p className="type-body" role="status">
          {t("sent")}{" "}
          <Link className="link" href="/account/applications">
            {t("yours")}
          </Link>
        </p>
      </DiwanSection>
    );
  }

  const complete =
    questions.every(
      (q) => !q.required || (form.answers[q.key] ?? "").trim() !== ""
    ) &&
    linksOk &&
    (!director || form.gpa.trim() !== "");

  return (
    <DiwanSection id="apply" title={t("title")}>
      <form
        className="grid gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          save.mutate(true);
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
            <Field hint={t("gpaHint")} label={t("gpaName")}>
              {(id) => (
                <Input
                  autoComplete="name"
                  id={id}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, gpa: e.target.value }))
                  }
                  value={form.gpa}
                />
              )}
            </Field>
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <Button disabled={!complete || save.isPending} type="submit">
            {t("send")}
          </Button>
          <Button
            disabled={save.isPending || !linksOk}
            onClick={() => save.mutate(false)}
            type="button"
            variant="outline"
          >
            {t("saveDraft")}
          </Button>
          {save.data === "draft" ? (
            <p className="type-caption" role="status">
              {t("draftSaved")}
            </p>
          ) : null}
        </div>
        <ErrorLine error={save.error} />
      </form>
    </DiwanSection>
  );
};
