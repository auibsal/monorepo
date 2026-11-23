"use client";

import { Button } from "@repo/brand/components/ui/button";
import { Checkbox } from "@repo/brand/components/ui/checkbox";
import { Input } from "@repo/brand/components/ui/input";
import { Label } from "@repo/brand/components/ui/label";
import type { Locale } from "@repo/internationalization";
import { formatClock, formatLongDate } from "@repo/internationalization/format";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, type ReactNode, useId, useState } from "react";
import { eventSlug, isAddress } from "@/lib/addresses";
import { useAuth } from "@/lib/auth/provider";
import { events, localized, sanitizeRichText, unwrap } from "@/lib/data";
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
import { Fact, Facts, NewRecordSteps } from "../record";

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
  classes: string[];
  discussion?: unknown;
  ends_at: string | null;
  entry: string;
  format: string | null;
  id: string;
  image_alt_ar?: string | null;
  image_alt_en?: string | null;
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

const FORMATS = ["screening", "performance"] as const;

const pair = (en: string | null, ar: string | null) => ({
  ar: ar ?? "",
  en: en ?? "",
});

/** The discussion questions, as stored: [{ en, ar }]. */
const questionsOf = (value: unknown) =>
  Array.isArray(value)
    ? value.map((q) =>
        pair(
          (q as { en?: string } | null)?.en ?? null,
          (q as { ar?: string } | null)?.ar ?? null
        )
      )
    : [];

/** The image and its description, both languages. */
const imageOf = (event: EventFactsRow | null) => ({
  image: event?.image_path ?? null,
  imageAlt: pair(event?.image_alt_en ?? null, event?.image_alt_ar ?? null),
});

const initial = (event: EventFactsRow | null) => ({
  ...imageOf(event),
  body: pair(event?.body_en ?? null, event?.body_ar ?? null),
  capacity: event?.capacity ? String(event.capacity) : "",
  classes: event?.classes ?? [...events.CLASSES],
  endsAt: event?.ends_at ?? null,
  entry: event?.entry ?? "rsvp",
  format: event?.format ?? "",
  discussion: questionsOf(event?.discussion),
  lead: event?.lead_id ?? null,
  partner: event?.partner_id ?? "",
  // Generated from the title and the day until the event is published,
  // then fixed (decisions.md, The site: addresses).
  fixed: Boolean(event && event.status !== "draft"),
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
  classes: f.classes.length > 0 ? f.classes : [...events.CLASSES],
  ends_at: f.endsAt,
  entry: f.entry,
  format: f.format || null,
  discussion: f.discussion
    .map((q) => ({ ar: q.ar.trim(), en: q.en.trim() }))
    .filter((q) => q.en || q.ar),
  image_alt_ar: f.image ? f.imageAlt.ar.trim() || null : null,
  image_alt_en: f.image ? f.imageAlt.en.trim() || null : null,
  image_path: f.image,
  lead_id: f.lead,
  partner_id: f.partner || null,
  slug: f.fixed ? f.slug : eventSlug(f.title.en, f.title.ar, f.startsAt),
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
          .schema("api")
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

/**
 * Access, two settings (decisions.md, Events: Access): who can come (the
 * classes ticked, all four being "Everyone", or Invited only) and how
 * (Open, or Booking required).
 */
const AccessSettings = ({
  classes,
  entry,
  onClasses,
  onEntry,
}: {
  readonly classes: string[];
  readonly entry: string;
  readonly onClasses: (classes: string[]) => void;
  readonly onEntry: (entry: string) => void;
}) => {
  const t = useTranslations("diwan.admin.event");
  const tw = useTranslations("web.events.goodToKnow.who");
  const id = useId();
  const invited = entry === "invite";
  const toggle = (c: events.EventClass, on: boolean) =>
    onClasses(
      on
        ? events.CLASSES.filter((x) => x === c || classes.includes(x))
        : classes.filter((x) => x !== c)
    );
  return (
    <>
      <fieldset className="grid gap-2">
        <legend className="type-label mb-2">{tw("label")}</legend>
        <ul className="grid gap-2 sm:grid-cols-2">
          {events.CLASSES.map((c) => (
            <li className="flex items-center gap-2" key={c}>
              <Checkbox
                checked={!invited && classes.includes(c)}
                disabled={invited || (classes.length === 1 && classes[0] === c)}
                id={`${id}-${c}`}
                onCheckedChange={(v) => toggle(c, v === true)}
              />
              <Label htmlFor={`${id}-${c}`}>{tw(`classes.${c}`)}</Label>
            </li>
          ))}
          <li className="flex items-center gap-2">
            <Checkbox
              checked={invited}
              id={`${id}-invite`}
              onCheckedChange={(v) => onEntry(v === true ? "invite" : "rsvp")}
            />
            <Label htmlFor={`${id}-invite`}>{tw("invite")}</Label>
          </li>
        </ul>
        <p className="type-caption">
          {invited ? t("entryHint.invite") : t("classesHint")}
        </p>
      </fieldset>
      {invited ? null : (
        <Field
          hint={t(`entryHint.${entry === "open" ? "open" : "rsvp"}`)}
          label={t("entry")}
        >
          {(fieldId) => (
            <ChoiceInput
              id={fieldId}
              onChange={(e) => onEntry(e.target.value)}
              value={entry}
            >
              <option value="open">{tw("how.open")}</option>
              <option value="rsvp">{tw("how.rsvp")}</option>
            </ChoiceInput>
          )}
        </Field>
      )}
    </>
  );
};

/** The parts of the facts each section of the event's page edits. */
export type FactsPart = "access" | "details" | "people";

const Fields = ({
  form,
  part,
  set,
}: {
  readonly form: Form;
  /** One section's fields; a new event shows them all. */
  readonly part?: FactsPart;
  readonly set: <K extends keyof Form>(key: K, value: Form[K]) => void;
}) => {
  const show = (p: FactsPart) => !part || part === p;
  return (
    <div className="grid max-w-4xl gap-5">
      {show("details") ? <DetailsFields form={form} set={set} /> : null}
      {show("access") ? <AccessFields form={form} set={set} /> : null}
      {show("people") ? <PeopleFields form={form} set={set} /> : null}
    </div>
  );
};

interface PartProps {
  readonly form: Form;
  readonly set: <K extends keyof Form>(key: K, value: Form[K]) => void;
}

const DetailsFields = ({ form, set }: PartProps) => {
  const t = useTranslations("diwan.admin.event");
  const tf = useTranslations("diwan.admin.event.facts");
  return (
    <>
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
      <Field hint={t("formatHint")} label={t("format")}>
        {(id) => (
          <ChoiceInput
            id={id}
            onChange={(e) => set("format", e.target.value)}
            value={form.format}
          >
            <option value="">{t("formats.none")}</option>
            {FORMATS.map((format) => (
              <option key={format} value={format}>
                {t(`formats.${format}`)}
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
      {form.image ? (
        <div className="grid gap-1">
          <BilingualField
            label={tf("imageAlt")}
            maxLength={300}
            onChange={(v) => set("imageAlt", v)}
            required
            value={form.imageAlt}
          />
          <p className="type-caption">{tf("imageAltHint")}</p>
        </div>
      ) : null}
      <DiscussionFields
        onChange={(v) => set("discussion", v)}
        value={form.discussion}
      />
      <div className="grid gap-1">
        <span className="type-label">{tf("slug")}</span>
        <p className="type-body" dir="ltr">
          {`/events/${form.fixed ? form.slug : eventSlug(form.title.en, form.title.ar, form.startsAt)}`}
        </p>
        <p className="type-caption">
          {form.fixed ? tf("slugFixed") : tf("slugHint")}
        </p>
      </div>
    </>
  );
};

/**
 * "For the conversation" (the printed program's back): the event's
 * discussion questions, both languages, added and removed in place.
 */
const DiscussionFields = ({
  onChange,
  value,
}: {
  readonly onChange: (value: Form["discussion"]) => void;
  readonly value: Form["discussion"];
}) => {
  const tf = useTranslations("diwan.admin.event.facts");
  return (
    <fieldset className="grid gap-3">
      <legend className="type-label mb-2">{tf("discussion")}</legend>
      <p className="type-caption">{tf("discussionHint")}</p>
      {value.map((q, i) => (
        <div
          className="border-line grid gap-2 border-t pt-3"
          // biome-ignore lint/suspicious/noArrayIndexKey: rows are edited in place, in order
          key={i}
        >
          <BilingualField
            label={tf("question", { n: String(i + 1) })}
            maxLength={300}
            onChange={(v) => onChange(value.map((x, j) => (j === i ? v : x)))}
            value={q}
          />
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => onChange(value.filter((_, j) => j !== i))}
              type="button"
              variant="link"
            >
              {tf("removeQuestion")}
            </Button>
          </div>
        </div>
      ))}
      {value.length < MAX_QUESTIONS ? (
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => onChange([...value, pair(null, null)])}
            type="button"
            variant="link"
          >
            {tf("addQuestion")}
          </Button>
        </div>
      ) : null}
    </fieldset>
  );
};

const MAX_QUESTIONS = 8;

const AccessFields = ({ form, set }: PartProps) => {
  const t = useTranslations("diwan.admin.event");
  return (
    <>
      <AccessSettings
        classes={form.classes}
        entry={form.entry}
        onClasses={(v) => set("classes", v)}
        onEntry={(v) => set("entry", v)}
      />
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
    </>
  );
};

const PeopleFields = ({ form, set }: PartProps) => {
  const tf = useTranslations("diwan.admin.event.facts");
  const partners = usePartners();
  return (
    <>
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
    </>
  );
};

const NEEDS_LEAD = "event_needs_lead_and_place";

const isNeedsLead = (error: unknown) =>
  error instanceof Error && error.message.includes(NEEDS_LEAD);

/** The event's debrief (a Notion page), linked for its staff only. */
export const DebriefField = ({ eventId }: { readonly eventId: string }) => {
  const tf = useTranslations("diwan.admin.event.facts");
  const te = useTranslations("diwan.admin.event");
  const { supabase } = useAuth();
  const client = useQueryClient();
  const debrief = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("api")
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
      const table = supabase.schema("api").from("debriefs");
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
      {/* The debrief draws on the answers (decisions.md, Events). */}
      <a className="link type-body" href="#how-was-it">
        {te("feedback.seeAnswers")}
      </a>
      <ErrorLine error={save.error} />
    </form>
  );
};

/** Publishing and canceling: the page's one accent action. */
export const StatusActions = ({
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
          .schema("api")
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
  part,
}: {
  readonly event: EventFactsRow | null;
  /** On the event's page, the section's fields only, as its form. */
  readonly part?: FactsPart;
}) => {
  const t = useTranslations("diwan.admin.event.facts");
  const { supabase } = useAuth();
  const client = useQueryClient();
  const router = useRouter();
  const [form, setForm] = useState(() => initial(event));
  const set = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm((f) => ({ ...f, [key]: value }));
  const row = toRow(form);
  const slugOk = isAddress(row.slug);
  // An uploaded image needs its text alternative in both languages.
  const altOk = !form.image || Boolean(row.image_alt_en && row.image_alt_ar);
  const refresh = () =>
    client.invalidateQueries({ queryKey: ["admin", "event", event?.id] });

  const save = useMutation({
    mutationFn: async () => {
      const table = supabase.schema("api").from("events");
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

  const factsForm = (
    <form className="grid gap-6" onSubmit={submit}>
      <Fields form={form} part={part} set={set} />
      {slugOk ? null : (
        <p className="text-sm" role="alert">
          {t("slugInvalid")}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <SaveButton
          disabled={!(slugOk && altOk && form.title.en && form.startsAt)}
          pending={save.isPending}
          quiet={Boolean(event)}
          success={save.isSuccess}
        />
      </div>
      <ErrorLine error={save.error} />
    </form>
  );
  if (part) {
    return factsForm;
  }
  return (
    <DiwanSection id="event" title={t("heading")}>
      {factsForm}
      {event ? (
        <div className="grid gap-6">
          <DebriefField eventId={event.id} />
          <StatusActions event={event} onDone={refresh} />
        </div>
      ) : null}
    </DiwanSection>
  );
};

/**
 * A new event in short steps (decisions.md, The site: "One record page"):
 * its format (a preset), the details, who can come, the people, then
 * Review. Create saves
 * it as a draft and opens its page.
 */
/** The Events Manual's formats, as presets (core.presets, kind "event"). */
const useEventPresets = () => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("api")
          .from("presets")
          .select("key, title_en, title_ar")
          .eq("kind", "event")
          .order("sort")
      ) ?? [],
    queryKey: ["admin", "presets", "event"],
  });
};

export const NewEventSteps = () => {
  const t = useTranslations("diwan.admin.event");
  const tf = useTranslations("diwan.admin.event.facts");
  const tr = useTranslations("diwan.admin.kit.record");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const client = useQueryClient();
  const router = useRouter();
  const [form, setForm] = useState(() => initial(null));
  const set = <K extends keyof Form>(key: K, value: Form[K]) =>
    setForm((f) => ({ ...f, [key]: value }));
  const row = toRow(form);
  const detailsReady = Boolean(
    form.title.en &&
      form.startsAt &&
      isAddress(row.slug) &&
      (!form.image || (row.image_alt_en && row.image_alt_ar))
  );
  const [preset, setPreset] = useState("");
  const presets = useEventPresets();
  const create = useMutation({
    mutationFn: async () => {
      const made = unwrap(
        await supabase
          .schema("api")
          .from("events")
          .insert({ ...row, status: "draft" })
          .select("id")
          .single()
      );
      // The format's preset fills the rest (decisions.md, The site: Presets).
      if (made && preset) {
        unwrap(
          await supabase
            .schema("api")
            .rpc("apply_event_preset", { event: made.id, preset })
        );
      }
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["admin", "events"] });
      router.push(`/events/${row.slug}`);
    },
  });
  const part = (fields: ReactNode) => (
    <div className="grid max-w-4xl gap-5">{fields}</div>
  );
  return (
    <div className="grid gap-4">
      <NewRecordSteps
        creating={create.isPending}
        onCreate={() => create.mutate()}
        steps={[
          {
            content: (
              <Field hint={tf("presetHint")} label={tf("preset")}>
                {(id) => (
                  <ChoiceInput
                    id={id}
                    onChange={(e) => setPreset(e.target.value)}
                    value={preset}
                  >
                    <option value="">{tf("noPreset")}</option>
                    {(presets.data ?? []).map((p) => (
                      <option key={p.key} value={p.key}>
                        {localized(p, "title", locale)}
                      </option>
                    ))}
                  </ChoiceInput>
                )}
              </Field>
            ),
            ready: true,
            title: tf("presetStep"),
          },
          {
            content: part(<DetailsFields form={form} set={set} />),
            ready: detailsReady,
            title: t("tabs.details"),
          },
          {
            content: part(<AccessFields form={form} set={set} />),
            ready: true,
            title: t("tabs.access"),
          },
          {
            content: part(<PeopleFields form={form} set={set} />),
            ready: true,
            title: t("tabs.people"),
          },
          {
            content: (
              <Facts>
                <Fact label={tf("title")}>{form.title.en}</Fact>
                <Fact label={t("starts")}>
                  {form.startsAt
                    ? `${formatLongDate(form.startsAt, locale)}, ${formatClock(form.startsAt, locale)}`
                    : ""}
                </Fact>
                <Fact label={t("venue")}>
                  {(locale === "ar" ? form.venue.ar : form.venue.en) ||
                    tf("noVenue")}
                </Fact>
                <Fact label={t("capacity")}>
                  {form.capacity || tf("noLimit")}
                </Fact>
                <Fact label={tf("slug")}>
                  <bdi dir="ltr">{`/events/${row.slug}`}</bdi>
                </Fact>
              </Facts>
            ),
            ready: detailsReady,
            title: tr("review"),
          },
        ]}
      />
      <ErrorLine error={create.error} />
    </div>
  );
};
