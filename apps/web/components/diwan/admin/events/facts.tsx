"use client";

import { Button } from "@repo/brand/components/ui/button";
import { Input } from "@repo/brand/components/ui/input";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { useAuth } from "@/lib/auth/provider";
import { sanitizeRichText, unwrap } from "@/lib/data";
import { useRouter } from "@/lib/diwan/navigation";
import { RichTextEditor } from "../../editor/rich-text";
import { DiwanSection } from "../../page";
import { ChoiceInput } from "../choice-input";
import { ImageField } from "../image-field";
import {
  BilingualField,
  ConfirmAction,
  DateTimeField,
  ErrorLine,
  Field,
  SaveButton,
} from "../kit";
import { MemberPicker, type Person, useMemberNames } from "../member-picker";

/**
 * Everything that makes an event (decisions.md, Events: made and edited
 * only in the Diwan): title, summary and description in both languages,
 * the dates, the venue, the access and the capacity, the lead (picked
 * from the register), the host, the image and the debrief link. Off
 * campus and Student Life's approval, the links and Good to know are the
 * page's own parts. Notion keeps a read-only copy.
 */

export interface EventFactsRow {
  body_ar: string | null;
  body_en: string | null;
  capacity: number | null;
  ends_at: string | null;
  entry: string;
  id: string;
  image_path: string | null;
  lead_id: string | null;
  partner_id: string | null;
  slug: string;
  starts_at: string;
  status: string;
  summary_ar: string | null;
  summary_en: string | null;
  title_ar: string;
  title_en: string;
  venue_ar: string | null;
  venue_en: string | null;
}

const ENTRIES = ["open", "rsvp", "members", "invite"] as const;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/u;
const NOT_LATIN = /[^a-z0-9]+/gu;
const EDGE_HYPHENS = /^-+|-+$/gu;

/** A web address from the title and the date: writing-workshop-2027-04-13. */
const slugFrom = (title: string, startsAt: string | null) => {
  const base = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(NOT_LATIN, "-")
    .replace(EDGE_HYPHENS, "")
    .slice(0, 60);
  const day = startsAt ? startsAt.slice(0, 10) : "";
  return [base || "event", day].filter(Boolean).join("-");
};

const pair = (en: string | null, ar: string | null) => ({
  ar: ar ?? "",
  en: en ?? "",
});

const initial = (event: EventFactsRow | null) => ({
  body: pair(event?.body_en ?? null, event?.body_ar ?? null),
  capacity: event?.capacity ? String(event.capacity) : "",
  endsAt: event?.ends_at ?? null,
  entry: event?.entry ?? "rsvp",
  image: event?.image_path ?? null,
  lead: event?.lead_id ?? null,
  partner: event?.partner_id ?? "",
  slug: event?.slug ?? "",
  startsAt: event?.starts_at ?? null,
  summary: pair(event?.summary_en ?? null, event?.summary_ar ?? null),
  title: pair(event?.title_en ?? null, event?.title_ar ?? null),
  venue: pair(event?.venue_en ?? null, event?.venue_ar ?? null),
});
type Form = ReturnType<typeof initial>;

const html = (value: string) => {
  const clean = sanitizeRichText(value).trim();
  return clean && clean !== "<p></p>" ? clean : null;
};

/** The row the form writes; the Arabic title falls back to the English. */
const toRow = (f: Form) => ({
  body_ar: html(f.body.ar),
  body_en: html(f.body.en),
  capacity: f.capacity ? Number(f.capacity) : null,
  ends_at: f.endsAt,
  entry: f.entry,
  image_path: f.image,
  lead_id: f.lead,
  partner_id: f.partner || null,
  slug: f.slug || slugFrom(f.title.en, f.startsAt),
  starts_at: f.startsAt ?? "",
  summary_ar: f.summary.ar || null,
  summary_en: f.summary.en || null,
  title_ar: f.title.ar || f.title.en,
  title_en: f.title.en,
  venue_ar: f.venue.ar || null,
  venue_en: f.venue.en || null,
});

/** The organizations in the register, for "Hosted by". */
const usePartners = () => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("governance")
          .from("partners")
          .select("id, name_en, name_ar")
          .eq("status", "active")
          .order("name_en")
      ) ?? [],
    queryKey: ["admin", "partners", "active"],
  });
};

const LeadField = ({
  onChange,
  value,
}: {
  readonly onChange: (id: string | null) => void;
  readonly value: string | null;
}) => {
  const t = useTranslations("diwan.admin.event.facts");
  const names = useMemberNames([value]);
  const person: Person | null =
    (value && names.data?.find((p) => p.id === value)) || null;
  return (
    <div className="grid gap-1">
      <MemberPicker
        label={t("lead")}
        onChange={(p) => onChange(p?.id ?? null)}
        value={person}
      />
      <p className="type-caption">{t("leadHint")}</p>
    </div>
  );
};

const Fields = ({
  form,
  published,
  set,
}: {
  readonly form: Form;
  readonly published: boolean;
  readonly set: <K extends keyof Form>(key: K, value: Form[K]) => void;
}) => {
  const t = useTranslations("diwan.admin.event");
  const tf = useTranslations("diwan.admin.event.facts");
  const partners = usePartners();
  return (
    <div className="grid max-w-4xl gap-5">
      <BilingualField
        label={tf("title")}
        maxLength={200}
        onChange={(v) => set("title", v)}
        required
        value={form.title}
      />
      <BilingualField
        label={tf("summary")}
        maxLength={500}
        multiline
        onChange={(v) => set("summary", v)}
        rows={3}
        value={form.summary}
      />
      <RichTextEditor
        label={tf("descriptionEn")}
        lang="en"
        onChange={(en) => set("body", { ...form.body, en })}
        value={form.body.en}
      />
      <RichTextEditor
        label={tf("descriptionAr")}
        lang="ar"
        onChange={(ar) => set("body", { ...form.body, ar })}
        value={form.body.ar}
      />
      <p className="type-caption">{tf("descriptionHint")}</p>
      <div className="grid gap-5 sm:grid-cols-2">
        <DateTimeField
          label={t("starts")}
          onChange={(v) => set("startsAt", v)}
          required
          value={form.startsAt}
        />
        <DateTimeField
          label={t("ends")}
          onChange={(v) => set("endsAt", v)}
          value={form.endsAt}
        />
      </div>
      <BilingualField
        label={t("venue")}
        maxLength={200}
        onChange={(v) => set("venue", v)}
        value={form.venue}
      />
      <Field hint={t(`entryHint.${form.entry as "open"}`)} label={t("entry")}>
        {(id) => (
          <ChoiceInput
            id={id}
            onChange={(e) => set("entry", e.target.value)}
            value={form.entry}
          >
            {ENTRIES.map((entry) => (
              <option key={entry} value={entry}>
                {t(`entries.${entry}`)}
              </option>
            ))}
          </ChoiceInput>
        )}
      </Field>
      <Field label={t("capacity")}>
        {(id) => (
          <Input
            className="max-w-40"
            id={id}
            inputMode="numeric"
            min={1}
            onChange={(e) => set("capacity", e.target.value)}
            type="number"
            value={form.capacity}
          />
        )}
      </Field>
      <LeadField onChange={(v) => set("lead", v)} value={form.lead} />
      <Field hint={tf("hostHint")} label={tf("host")}>
        {(id) => (
          <ChoiceInput
            id={id}
            onChange={(e) => set("partner", e.target.value)}
            value={form.partner}
          >
            <option value="">{tf("theSociety")}</option>
            {(partners.data ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name_en}
              </option>
            ))}
          </ChoiceInput>
        )}
      </Field>
      <ImageField
        area="events"
        label={tf("image")}
        onChange={(v) => set("image", v)}
        value={form.image}
      />
      <Field
        hint={published ? tf("slugFixed") : tf("slugHint")}
        label={tf("slug")}
      >
        {(id) => (
          <Input
            dir="ltr"
            disabled={published}
            id={id}
            onChange={(e) => set("slug", e.target.value.toLowerCase())}
            placeholder={slugFrom(form.title.en, form.startsAt)}
            value={form.slug}
          />
        )}
      </Field>
    </div>
  );
};

const NEEDS_LEAD = "event_needs_lead_and_place";

const isNeedsLead = (error: unknown) =>
  error instanceof Error && error.message.includes(NEEDS_LEAD);

/** The event's debrief (a Notion page), linked for its staff only. */
const DebriefField = ({ eventId }: { readonly eventId: string }) => {
  const tf = useTranslations("diwan.admin.event.facts");
  const { supabase } = useAuth();
  const client = useQueryClient();
  const debrief = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("events")
          .from("debriefs")
          .select("url")
          .eq("event_id", eventId)
          .maybeSingle()
      ),
    queryKey: ["admin", "event-debrief", eventId],
  });
  const [url, setUrl] = useState<string | null>(null);
  const value = url ?? debrief.data?.url ?? "";
  const save = useMutation({
    mutationFn: async () => {
      const table = supabase.schema("events").from("debriefs");
      unwrap(
        value
          ? await table.upsert({
              event_id: eventId,
              updated_at: new Date().toISOString(),
              url: value,
            })
          : await table.delete().eq("event_id", eventId)
      );
    },
    onSuccess: () =>
      client.invalidateQueries({
        queryKey: ["admin", "event-debrief", eventId],
      }),
  });
  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <Field
        className="min-w-64 flex-1"
        hint={tf("debriefHint")}
        label={tf("debrief")}
      >
        {(id) => (
          <Input
            dir="ltr"
            id={id}
            onChange={(e) => setUrl(e.target.value)}
            pattern="https://.*"
            type="url"
            value={value}
          />
        )}
      </Field>
      <SaveButton pending={save.isPending} quiet success={save.isSuccess} />
      <ErrorLine error={save.error} />
    </form>
  );
};

/** Publishing and canceling: the page's one accent action. */
const StatusActions = ({
  event,
  onDone,
}: {
  readonly event: EventFactsRow;
  readonly onDone: () => void;
}) => {
  const tf = useTranslations("diwan.admin.event.facts");
  const { supabase } = useAuth();
  const change = useMutation({
    mutationFn: async (status: "canceled" | "draft" | "published") => {
      unwrap(
        await supabase
          .schema("events")
          .from("events")
          .update({
            status,
            ...(status === "published"
              ? { published_at: new Date().toISOString() }
              : {}),
          })
          .eq("id", event.id)
      );
    },
    onSuccess: onDone,
  });
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-3">
        {event.status === "draft" ? (
          <Button
            disabled={change.isPending}
            onClick={() => change.mutate("published")}
            type="button"
          >
            {tf("publish")}
          </Button>
        ) : null}
        {event.status === "published" ? (
          <ConfirmAction
            confirmLabel={tf("cancel")}
            description={tf("cancelConfirm")}
            onConfirm={() => change.mutate("canceled")}
            variant="ghost"
          >
            {tf("cancel")}
          </ConfirmAction>
        ) : null}
        {event.status === "canceled" ? (
          <Button
            disabled={change.isPending}
            onClick={() => change.mutate("draft")}
            size="sm"
            type="button"
            variant="ghost"
          >
            {tf("backToDraft")}
          </Button>
        ) : null}
      </div>
      {isNeedsLead(change.error) ? (
        <p className="text-sm" role="alert">
          {tf("needsLead")}
        </p>
      ) : (
        <ErrorLine error={change.error} />
      )}
    </div>
  );
};

/**
 * The event's facts on its page in the Diwan, or a new event (`event`
 * null), saved as a draft and opened at its own address.
 */
export const EventFacts = ({
  event,
}: {
  readonly event: EventFactsRow | null;
}) => {
  const t = useTranslations("diwan.admin.event.facts");
  const { supabase } = useAuth();
  const client = useQueryClient();
  const router = useRouter();
  const [form, setForm] = useState(() => initial(event));
  const set = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm((f) => ({ ...f, [key]: value }));
  const row = toRow(form);
  const slugOk = SLUG.test(row.slug);
  const refresh = () =>
    client.invalidateQueries({ queryKey: ["admin", "event", event?.id] });

  const save = useMutation({
    mutationFn: async () => {
      const table = supabase.schema("events").from("events");
      if (event) {
        unwrap(await table.update(row).eq("id", event.id));
        return row.slug;
      }
      unwrap(await table.insert({ ...row, status: "draft" }));
      return row.slug;
    },
    onSuccess: async (slug) => {
      await client.invalidateQueries({ queryKey: ["admin", "events"] });
      if (event) {
        await refresh();
      } else {
        router.push(`/events/${slug}`);
      }
    },
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    save.mutate();
  };

  return (
    <DiwanSection id="event" title={t("heading")}>
      <form className="grid gap-6" onSubmit={submit}>
        <Fields
          form={form}
          published={event?.status === "published"}
          set={set}
        />
        {slugOk ? null : (
          <p className="text-sm" role="alert">
            {t("slugInvalid")}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <SaveButton
            disabled={!(slugOk && form.title.en && form.startsAt)}
            pending={save.isPending}
            quiet={Boolean(event)}
            success={save.isSuccess}
          />
        </div>
        <ErrorLine error={save.error} />
      </form>
      {event ? (
        <div className="grid gap-6">
          <DebriefField eventId={event.id} />
          <StatusActions event={event} onDone={refresh} />
        </div>
      ) : null}
    </DiwanSection>
  );
};
