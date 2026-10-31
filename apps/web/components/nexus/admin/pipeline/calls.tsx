"use client";

import { useAuth } from "@repo/auth/provider";
import { Checkbox } from "@repo/design-system/components/ui/checkbox";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import type { Locale } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { journal, localized, unwrap } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useState } from "react";
import { Link, usePathname, useRouter } from "@/lib/nexus/navigation";
import { useQueryParam } from "@/lib/nexus/use-query-param";
import { OnTheSite } from "../../site-links";
import { EmptyLine, SectionSpinner } from "../../states";
import {
  AdminHeading,
  BilingualField,
  type Column,
  DataTable,
  DateTimeField,
  ErrorLine,
  Field,
  SaveButton,
} from "../kit";
import { pipelineKey } from "./data";

const blank = {
  closes_at: null as string | null,
  eligibility: { ar: "", en: "" },
  id: null as string | null,
  is_published: false,
  max_per_person: "2",
  opens_at: null as string | null,
  // Partners whose verified members may also answer the call.
  partners: [] as string[],
  theme: { ar: "", en: "" },
  title: { ar: "", en: "" },
};
type CallForm = typeof blank;

const callRow = (issueId: string, form: CallForm) => ({
  closes_at: form.closes_at ?? "",
  eligibility_ar: form.eligibility.ar || null,
  eligibility_en: form.eligibility.en || null,
  is_published: form.is_published,
  issue_id: issueId,
  max_per_person: Number(form.max_per_person) || 2,
  opens_at: form.opens_at ?? "",
  theme_ar: form.theme.ar || null,
  theme_en: form.theme.en || null,
  title_ar: form.title.ar,
  title_en: form.title.en,
});

/**
 * An Edition's calls (journal.manage for the issue), each opening on its
 * own page under the Edition's (owner, Oct 31, 2026: editing in the Diwan
 * opens its own address): the Edition's path, then /calls/ and the id
 * (or /calls/new).
 */
export const Calls = ({ issueId }: { issueId: string }) => {
  const t = useTranslations("nexus.admin.pipeline.calls");
  const tk = useTranslations("nexus.admin.kit");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const base = usePathname();
  const calls = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("journal")
          .from("calls")
          .select("*")
          .eq("issue_id", issueId)
          .order("opens_at", { ascending: false })
      ) ?? [],
    queryKey: [...pipelineKey, "calls", issueId],
  });

  type Row = NonNullable<typeof calls.data>[number];
  const columns: Column<Row>[] = [
    {
      cell: (c) => (
        <Link
          className="font-medium hover:underline"
          href={`${base}/calls/${c.id}`}
        >
          {localized(c, "title", locale)}
        </Link>
      ),
      header: t("titleField"),
      key: "title",
    },
    {
      cell: (c) =>
        `${formatLongDate(c.opens_at, locale, true)} – ${formatLongDate(c.closes_at, locale, true)}`,
      header: t("window"),
      key: "window",
    },
    {
      cell: (c) => (c.is_published ? t("published") : t("hidden")),
      header: tk("status"),
      key: "status",
    },
  ];

  return (
    <div className="grid gap-6">
      {calls.data ? (
        <DataTable
          columns={columns}
          empty={t("empty")}
          rowKey={(c) => c.id}
          rows={calls.data}
        />
      ) : (
        <SectionSpinner />
      )}
      <Link className="link justify-self-start" href={`${base}/calls/new`}>
        {t("new")}
      </Link>
    </div>
  );
};

/**
 * One call on its own page: the Edition's id comes from the page's
 * address (RecordRef), the call's from the last step ("new" for a blank
 * one). Saving returns to the Edition; a published call links to Qirtas,
 * where readers find it.
 */
export const CallPage = ({
  back,
  callId,
}: {
  readonly back: string;
  readonly callId: string;
}) => {
  const issueId = useQueryParam("id") ?? "";
  const t = useTranslations("nexus.admin.pipeline.calls");
  const locale = useLocale() as Locale;
  const id = useId();
  const { supabase } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const isNew = callId === "new";
  const [form, setForm] = useState(blank);
  const existing = useQuery({
    enabled: !isNew,
    queryFn: async () => {
      const c = unwrap(
        await supabase
          .schema("journal")
          .from("calls")
          .select("*")
          .eq("id", callId)
          .maybeSingle()
      );
      if (!c) {
        return null;
      }
      const partners = await journal.callPartnerIds(supabase, c.id);
      return {
        closes_at: c.closes_at,
        eligibility: {
          ar: c.eligibility_ar ?? "",
          en: c.eligibility_en ?? "",
        },
        id: c.id,
        is_published: c.is_published,
        max_per_person: String(c.max_per_person),
        opens_at: c.opens_at,
        partners,
        theme: { ar: c.theme_ar ?? "", en: c.theme_en ?? "" },
        title: { ar: c.title_ar, en: c.title_en },
      } satisfies CallForm;
    },
    queryKey: [...pipelineKey, "call", callId],
  });
  // The form starts from the call as saved.
  useEffect(() => {
    if (existing.data) {
      setForm(existing.data);
    }
  }, [existing.data]);
  const partnerOptions = useQuery({
    queryFn: () => journal.submissionPartners(supabase),
    queryKey: [...pipelineKey, "submission-partners"],
  });
  const save = useMutation({
    mutationFn: async () => {
      const table = supabase.schema("journal").from("calls");
      const row = callRow(issueId, form);
      let savedId = form.id;
      if (savedId) {
        unwrap(await table.update(row).eq("id", savedId));
      } else {
        savedId =
          unwrap(await table.insert(row).select("id").single())?.id ?? null;
      }
      if (savedId) {
        await journal.setCallPartners(supabase, savedId, form.partners);
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: pipelineKey });
      router.push(back);
    },
  });

  if (!isNew && existing.isPending) {
    return <SectionSpinner />;
  }
  if (!(isNew || existing.data)) {
    return (
      <EmptyLine action={{ href: back, label: t("back") }}>
        {t("missing")}
      </EmptyLine>
    );
  }
  const ready =
    form.title.en.trim() &&
    form.title.ar.trim() &&
    form.opens_at &&
    form.closes_at &&
    Date.parse(form.closes_at) > Date.parse(form.opens_at);

  return (
    <div className="grid max-w-3xl gap-8">
      <AdminHeading
        actions={
          <>
            <Link className="link" href={back}>
              {t("back")}
            </Link>
            {existing.data?.is_published ? <OnTheSite href="/qirtas" /> : null}
          </>
        }
        title={
          existing.data
            ? (locale === "ar" && existing.data.title.ar) ||
              existing.data.title.en
            : t("new")
        }
      />
      <form
        className="grid max-w-3xl gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          save.mutate();
        }}
      >
        <BilingualField
          label={t("titleField")}
          maxLength={200}
          onChange={(title) => setForm((f) => ({ ...f, title }))}
          required
          value={form.title}
        />
        <BilingualField
          label={t("theme")}
          maxLength={500}
          onChange={(theme) => setForm((f) => ({ ...f, theme }))}
          value={form.theme}
        />
        <BilingualField
          label={t("eligibility")}
          maxLength={2000}
          multiline
          onChange={(eligibility) => setForm((f) => ({ ...f, eligibility }))}
          rows={3}
          value={form.eligibility}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <DateTimeField
            label={t("opens")}
            onChange={(opens_at) => setForm((f) => ({ ...f, opens_at }))}
            value={form.opens_at}
          />
          <DateTimeField
            label={t("closes")}
            onChange={(closes_at) => setForm((f) => ({ ...f, closes_at }))}
            value={form.closes_at}
          />
        </div>
        <Field hint={t("maxHint")} label={t("max")}>
          {(fieldId) => (
            <Input
              className="w-24"
              dir="ltr"
              id={fieldId}
              max={10}
              min={1}
              onChange={(e) =>
                setForm((f) => ({ ...f, max_per_person: e.target.value }))
              }
              type="number"
              value={form.max_per_person}
            />
          )}
        </Field>
        {(partnerOptions.data ?? []).length > 0 ? (
          <fieldset className="grid gap-2">
            <legend className="mb-1 font-medium">{t("partners")}</legend>
            <p className="type-caption">{t("partnersHint")}</p>
            {(partnerOptions.data ?? []).map((partner) => (
              <div className="flex items-center gap-2" key={partner.id}>
                <Checkbox
                  checked={form.partners.includes(partner.id)}
                  id={`${id}-partner-${partner.id}`}
                  onCheckedChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      partners:
                        v === true
                          ? [...f.partners, partner.id]
                          : f.partners.filter((p) => p !== partner.id),
                    }))
                  }
                />
                <Label htmlFor={`${id}-partner-${partner.id}`}>
                  {localized(partner, "name", locale)}
                </Label>
              </div>
            ))}
          </fieldset>
        ) : null}
        <div className="flex items-start gap-3">
          <Checkbox
            checked={form.is_published}
            id={`${id}-published`}
            onCheckedChange={(v) =>
              setForm((f) => ({ ...f, is_published: v === true }))
            }
          />
          <Label className="leading-normal" htmlFor={`${id}-published`}>
            {t("publish")}
          </Label>
        </div>
        <div className="flex flex-wrap gap-2">
          <SaveButton disabled={!ready} pending={save.isPending} />
        </div>
        <ErrorLine error={save.error} />
      </form>
    </div>
  );
};
