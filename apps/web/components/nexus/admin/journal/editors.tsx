"use client";

import { useAuth } from "@repo/auth/provider";
import { Input } from "@repo/design-system/components/ui/input";
import type { Locale } from "@repo/internationalization";
import { localized, unwrap } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, type ReactNode, useEffect, useState } from "react";
import { DateInput } from "@/components/fields/date-input";
import { Link, useRouter } from "@/lib/nexus/navigation";
import { useQueryParam } from "@/lib/nexus/use-query-param";
import { OnTheSite } from "../../site-links";
import { ErrorState, SectionSpinner } from "../../states";
import { ImageField } from "../image-field";
import {
  AdminHeading,
  BilingualField,
  ConfirmAction,
  DateTimeField,
  ErrorLine,
  Field,
  SaveButton,
} from "../kit";
import { Calls } from "../pipeline/calls";

type Status = "draft" | "scheduled" | "published";

const back = (label: string) => (
  <Link className="text-sm underline underline-offset-4" href="/qirtas">
    {label}
  </Link>
);

/** Save, schedule (with a publish time), publish and back-to-draft buttons. */
const PublishControls = ({
  confirm,
  onSave,
  pending,
  publishAt,
  saved,
  status,
}: {
  confirm: string;
  onSave: (status: Status) => void;
  pending: boolean;
  publishAt: string | null;
  saved: boolean;
  status: Status;
}): ReactNode => {
  const t = useTranslations("nexus.admin.content");
  const tk = useTranslations("nexus.admin.kit");
  return (
    <div className="flex flex-wrap gap-3">
      <SaveButton pending={pending} success={saved} />
      {status === "draft" ? (
        <>
          <ConfirmAction
            confirmLabel={t("publish")}
            description={confirm}
            disabled={pending}
            onConfirm={() => onSave("published")}
            variant="default"
          >
            {t("publish")}
          </ConfirmAction>
          {publishAt ? (
            <ConfirmAction
              confirmLabel={tk("statuses.scheduled")}
              description={t("scheduleConfirm")}
              disabled={pending}
              onConfirm={() => onSave("scheduled")}
            >
              {tk("statuses.scheduled")}
            </ConfirmAction>
          ) : null}
        </>
      ) : (
        <ConfirmAction
          confirmLabel={t("unpublish")}
          description={t("unpublishConfirm")}
          disabled={pending}
          onConfirm={() => onSave("draft")}
        >
          {t("unpublish")}
        </ConfirmAction>
      )}
    </div>
  );
};

// ── Issue ───────────────────────────────────────────────────────────────────

export const IssueEditor = () => {
  const t = useTranslations("nexus.admin.journal");
  const tw = useTranslations("nexus.admin.waraq");
  const tk = useTranslations("nexus.admin.kit");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const issueId = useQueryParam("id");
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    cover_path: null as string | null,
    note: { ar: "", en: "" },
    number: "",
    pdf_path: null as string | null,
    print_run: "",
    printed_on: "",
    printer: { ar: "", en: "" },
    publish_at: null as string | null,
    season: { ar: "", en: "" },
    slug: "",
    theme: { ar: "", en: "" },
    title: { ar: "", en: "" },
    volume: "1",
  });
  const existing = useQuery({
    enabled: Boolean(issueId),
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("journal")
          .from("issues")
          .select("*")
          .eq("id", issueId ?? "")
          .maybeSingle()
      ),
    queryKey: ["admin", "journal", "issue", issueId],
  });
  useEffect(() => {
    const i = existing.data;
    if (i) {
      setForm({
        cover_path: i.cover_path,
        note: { ar: i.editors_note_ar ?? "", en: i.editors_note_en ?? "" },
        number: String(i.number),
        pdf_path: i.pdf_path,
        print_run: i.print_run ? String(i.print_run) : "",
        printed_on: i.printed_on ?? "",
        printer: { ar: i.printer_ar ?? "", en: i.printer_en ?? "" },
        publish_at: i.publish_at,
        season: { ar: i.season_ar ?? "", en: i.season_en ?? "" },
        slug: i.slug,
        theme: { ar: i.theme_ar ?? "", en: i.theme_en ?? "" },
        title: { ar: i.title_ar, en: i.title_en },
        volume: String(i.volume),
      });
    }
  }, [existing.data]);
  const status = (existing.data?.status ?? "draft") as Status;

  const save = useMutation({
    mutationFn: async (next: Status) => {
      const row = {
        cover_path: form.cover_path,
        editors_note_ar: form.note.ar || null,
        editors_note_en: form.note.en || null,
        number: Number(form.number),
        pdf_path: form.pdf_path,
        print_run: form.print_run ? Number(form.print_run) : null,
        printed_on: form.printed_on || null,
        printer_ar: form.printer.ar || null,
        printer_en: form.printer.en || null,
        publish_at: form.publish_at,
        published_at:
          next === "published"
            ? (existing.data?.published_at ?? new Date().toISOString())
            : null,
        season_ar: form.season.ar || null,
        season_en: form.season.en || null,
        slug: form.slug || `edition-${form.number}`,
        status: next,
        theme_ar: form.theme.ar || null,
        theme_en: form.theme.en || null,
        title_ar: form.title.ar,
        title_en: form.title.en,
        volume: Number(form.volume),
      };
      const table = supabase.schema("journal").from("issues");
      if (issueId) {
        unwrap(await table.update(row).eq("id", issueId));
        return issueId;
      }
      const created = unwrap(await table.insert(row).select("id").single());
      if (!created) {
        throw new Error("not_created");
      }
      return created.id;
    },
    onSuccess: async (savedId) => {
      await queryClient.invalidateQueries({ queryKey: ["admin", "journal"] });
      if (!issueId) {
        router.replace(`/qirtas/editions/${savedId}`);
      }
    },
  });

  if (issueId && existing.isPending) {
    return <SectionSpinner />;
  }
  if (existing.isError) {
    return <ErrorState onRetry={() => existing.refetch()} />;
  }
  if (issueId && !existing.data) {
    return (
      <p className="type-body text-text-secondary">{t("issue.notFound")}</p>
    );
  }

  const submit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate(status);
  };

  return (
    <div className="grid gap-8">
      <AdminHeading
        actions={
          <>
            {back(tk("back"))}
            {existing.data?.slug && status === "published" ? (
              <OnTheSite href={`/qirtas/editions/${existing.data.slug}`} />
            ) : null}
          </>
        }
        title={
          existing.data
            ? localized(existing.data, "title", locale)
            : t("newIssue")
        }
      >
        {`${tk("status")}: ${tk(`statuses.${status}`)}`}
      </AdminHeading>
      <form className="grid max-w-4xl gap-6" onSubmit={submit}>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={t("issue.volume")}>
            {(id) => (
              <Input
                dir="ltr"
                id={id}
                min={1}
                onChange={(e) =>
                  setForm((f) => ({ ...f, volume: e.target.value }))
                }
                required
                type="number"
                value={form.volume}
              />
            )}
          </Field>
          <Field label={t("issue.number")}>
            {(id) => (
              <Input
                dir="ltr"
                id={id}
                min={1}
                onChange={(e) =>
                  setForm((f) => ({ ...f, number: e.target.value }))
                }
                required
                type="number"
                value={form.number}
              />
            )}
          </Field>
          <Field hint={tk("slugHint")} label={tk("slug")}>
            {(id) => (
              <Input
                dir="ltr"
                id={id}
                maxLength={80}
                onChange={(e) =>
                  setForm((f) => ({ ...f, slug: e.target.value }))
                }
                placeholder={`edition-${form.number || "1"}`}
                value={form.slug}
              />
            )}
          </Field>
        </div>
        <BilingualField
          label={t("issue.titleField")}
          maxLength={200}
          onChange={(title) => setForm((f) => ({ ...f, title }))}
          required
          value={form.title}
        />
        <BilingualField
          label={tw("season")}
          maxLength={60}
          onChange={(season) => setForm((f) => ({ ...f, season }))}
          value={form.season}
        />
        <BilingualField
          label={t("issue.theme")}
          maxLength={200}
          onChange={(theme) => setForm((f) => ({ ...f, theme }))}
          value={form.theme}
        />
        <BilingualField
          label={t("issue.editorsNote")}
          multiline
          onChange={(note) => setForm((f) => ({ ...f, note }))}
          rows={6}
          value={form.note}
        />
        <ImageField
          area="issues"
          label={t("issue.cover")}
          onChange={(cover_path) => setForm((f) => ({ ...f, cover_path }))}
          value={form.cover_path}
        />
        <ImageField
          area="issues"
          kind="pdf"
          label={t("issue.pdf")}
          onChange={(pdf_path) => setForm((f) => ({ ...f, pdf_path }))}
          value={form.pdf_path}
        />
        <fieldset className="grid gap-4">
          <legend className="type-label pb-2">{t("issue.printed")}</legend>
          <p className="type-caption">{t("issue.printedHint")}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("issue.printRun")}>
              {(id) => (
                <Input
                  dir="ltr"
                  id={id}
                  min={1}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, print_run: e.target.value }))
                  }
                  type="number"
                  value={form.print_run}
                />
              )}
            </Field>
            <Field label={t("issue.printedOn")}>
              {(id) => (
                <DateInput
                  id={id}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, printed_on: e.target.value }))
                  }
                  value={form.printed_on}
                />
              )}
            </Field>
          </div>
          <BilingualField
            label={t("issue.printer")}
            maxLength={200}
            onChange={(printer) => setForm((f) => ({ ...f, printer }))}
            value={form.printer}
          />
        </fieldset>
        <DateTimeField
          label={tw("launch")}
          onChange={(publish_at) => setForm((f) => ({ ...f, publish_at }))}
          value={form.publish_at}
        />
        <p className="type-caption">{tw("launchHint")}</p>
        <PublishControls
          confirm={t("issue.publishConfirm")}
          onSave={(s) => save.mutate(s)}
          pending={save.isPending}
          publishAt={form.publish_at}
          saved={save.isSuccess}
          status={status}
        />
        <ErrorLine error={save.error} />
      </form>
      {issueId ? (
        <section aria-labelledby="edition-calls" className="grid gap-4">
          <h2 className="type-heading" id="edition-calls">
            {tw("calls")}
          </h2>
          <Calls issueId={issueId} />
        </section>
      ) : null}
    </div>
  );
};
