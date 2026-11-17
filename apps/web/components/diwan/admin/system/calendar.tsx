"use client";

import { Button } from "@repo/brand/components/ui/button";
import { Input } from "@repo/brand/components/ui/input";
import type { Locale } from "@repo/internationalization";
import {
  formatLongDate,
  formatNumber,
} from "@repo/internationalization/format";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useAuth } from "@/lib/auth/provider";
import { localized, unwrap } from "@/lib/data";
import { Link } from "@/lib/diwan/navigation";
import { useGrants } from "@/lib/diwan/queries";
import { useQueryState } from "@/lib/diwan/use-query-param";
import { hasPermissionAnywhere } from "@/lib/rbac";
import { getMediaUrl } from "@/lib/storage";
import { DiwanSection, RowList } from "../../page";
import { EmptyLine } from "../../states";
import {
  AddInPlace,
  BilingualField,
  ErrorLine,
  Field,
  SaveButton,
} from "../kit";

const key = ["admin", "calendar"] as const;
const MONTH = /^\d{4}-\d{2}$/u;
const DAY = 86_400_000;

interface Entry {
  readonly alt_ar: string | null;
  readonly alt_en: string | null;
  readonly caption_ar: string | null;
  readonly caption_en: string | null;
  readonly channel: string;
  readonly confirm_date: boolean;
  readonly event: { readonly slug: string } | null;
  readonly id: string;
  readonly kind: string;
  readonly media: { readonly path: string } | null;
  readonly owner_role: string | null;
  readonly post_url: string | null;
  readonly publish_on: string;
  readonly status: string;
  readonly title_ar: string;
  readonly title_en: string;
}

/** The calendar's entries in a month (yyyy-mm), oldest first. */
const useEntries = (month: string) => {
  const { supabase } = useAuth();
  const from = `${month}-01`;
  const to = new Date(
    Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 1)
  )
    .toISOString()
    .slice(0, 10);
  return useQuery({
    queryFn: async () =>
      (unwrap(
        await supabase
          .schema("api")
          .from("calendar_entries")
          .select(
            "id, publish_on, channel, status, kind, title_en, title_ar, caption_en, caption_ar, alt_en, alt_ar, owner_role, confirm_date, post_url, event:events(slug), media:media_items(path)"
          )
          .gte("publish_on", from)
          .lt("publish_on", to)
          .order("publish_on")
      ) ?? []) as unknown as Entry[],
    queryKey: [...key, month],
  });
};

/** Copies a caption, falling back to selecting it. */
const CopyButton = ({
  label,
  text,
}: {
  readonly label: string;
  readonly text: string;
}) => {
  const t = useTranslations("diwan.admin.calendar");
  const [copied, setCopied] = useState(false);
  const shown = copied ? t("copied") : label;
  return (
    <button
      className="link type-caption"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
        } catch {
          setCopied(false);
        }
      }}
      type="button"
    >
      {shown}
    </button>
  );
};

/** Marking an entry posted, with the post's link. */
const MarkPosted = ({
  close,
  entry,
}: {
  readonly close: () => void;
  readonly entry: Entry;
}) => {
  const t = useTranslations("diwan.admin.calendar");
  const { supabase, user } = useAuth();
  const client = useQueryClient();
  const [url, setUrl] = useState(entry.post_url ?? "");
  const save = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase
          .schema("api")
          .from("calendar_entries")
          .update({
            post_url: url || null,
            posted_at: new Date().toISOString(),
            posted_by: user?.id ?? null,
            status: "posted",
          })
          .eq("id", entry.id)
      ),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: key });
      close();
    },
  });
  return (
    <form
      className="grid max-w-xl gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <Field label={t("postUrl")}>
        {(id) => (
          <Input
            dir="ltr"
            id={id}
            onChange={(e) => setUrl(e.target.value)}
            pattern="https://.*"
            type="url"
            value={url}
          />
        )}
      </Field>
      <SaveButton pending={save.isPending} success={save.isSuccess} />
      <ErrorLine error={save.error} />
    </form>
  );
};

/** The words of a post: captions and alt text, in both languages. */
const Words = ({
  close,
  entry,
}: {
  readonly close: () => void;
  readonly entry: Entry;
}) => {
  const t = useTranslations("diwan.admin.calendar");
  const { supabase } = useAuth();
  const client = useQueryClient();
  const [caption, setCaption] = useState({
    ar: entry.caption_ar ?? "",
    en: entry.caption_en ?? "",
  });
  const [alt, setAlt] = useState({
    ar: entry.alt_ar ?? "",
    en: entry.alt_en ?? "",
  });
  const save = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase
          .schema("api")
          .from("calendar_entries")
          .update({
            alt_ar: alt.ar || null,
            alt_en: alt.en || null,
            caption_ar: caption.ar || null,
            caption_en: caption.en || null,
            status: entry.status === "planned" ? "ready" : entry.status,
          })
          .eq("id", entry.id)
      ),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: key });
      close();
    },
  });
  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <BilingualField
        label={t("caption")}
        maxLength={2200}
        multiline
        onChange={setCaption}
        rows={5}
        value={caption}
      />
      <BilingualField
        label={t("alt")}
        maxLength={500}
        onChange={setAlt}
        value={alt}
      />
      <SaveButton pending={save.isPending} success={save.isSuccess} />
      <ErrorLine error={save.error} />
    </form>
  );
};

/** The captions in both languages, each with its copy button. */
const Captions = ({ entry }: { readonly entry: Entry }) => {
  const t = useTranslations("diwan.admin.calendar");
  return (
    <>
      {entry.caption_en || entry.caption_ar ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {entry.caption_en ? (
            <div className="grid gap-1">
              <p
                className="type-caption whitespace-pre-line"
                dir="ltr"
                lang="en"
              >
                {entry.caption_en}
              </p>
              <CopyButton label={t("copyEn")} text={entry.caption_en} />
            </div>
          ) : null}
          {entry.caption_ar ? (
            <div className="grid gap-1">
              <p
                className="type-caption whitespace-pre-line"
                dir="rtl"
                lang="ar"
              >
                {entry.caption_ar}
              </p>
              <CopyButton label={t("copyAr")} text={entry.caption_ar} />
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
};

const EntryRow = ({
  entry,
  keeps,
}: {
  readonly entry: Entry;
  readonly keeps: boolean;
}) => {
  const t = useTranslations("diwan.admin.calendar");
  const tr = useTranslations("web.governance.seats");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const client = useQueryClient();
  const choose = useMutation({
    mutationFn: async (status: "planned" | "skipped") =>
      unwrap(
        await supabase
          .schema("api")
          .from("calendar_entries")
          .update({ status })
          .eq("id", entry.id)
      ),
    onSuccess: () => client.invalidateQueries({ queryKey: key }),
  });
  return (
    <li className="grid gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="type-body font-medium">
          {localized({ ...entry }, "title", locale)}
        </span>
        <span className="type-caption">
          {`${formatLongDate(entry.publish_on, locale)} · ${t(`channels.${entry.channel as "instagram"}`)} · ${t(`statuses.${entry.status as "planned"}`)}`}
        </span>
      </div>
      <p className="type-caption">
        {t(`kinds.${entry.kind as "post"}`)}
        {entry.owner_role ? ` · ${tr(entry.owner_role as never)}` : null}
        {entry.confirm_date && entry.status !== "posted"
          ? ` · ${t("confirmDate")}`
          : null}
      </p>
      {entry.media ? (
        // biome-ignore lint/performance/noImgElement: a promo image from the library
        <img
          alt={(locale === "ar" ? entry.alt_ar : entry.alt_en) ?? ""}
          className="h-24 w-auto justify-self-start"
          height={96}
          src={getMediaUrl(supabase, entry.media.path)}
          width={96}
        />
      ) : null}
      <Captions entry={entry} />
      {entry.event ? (
        <Link
          className="link type-caption justify-self-start"
          href={`/events/${entry.event.slug}`}
        >
          {t("openEvent")}
        </Link>
      ) : null}
      {entry.post_url ? (
        <a
          className="link type-caption justify-self-start"
          dir="ltr"
          href={entry.post_url}
        >
          {entry.post_url}
        </a>
      ) : null}
      {keeps ? (
        <div className="flex flex-wrap items-start gap-x-5 gap-y-2">
          {entry.status === "choose" ? (
            <>
              <Button
                disabled={choose.isPending}
                onClick={() => choose.mutate("planned")}
                size="sm"
                variant="outline"
              >
                {t("keep")}
              </Button>
              <button
                className="link"
                onClick={() => choose.mutate("skipped")}
                type="button"
              >
                {t("skip")}
              </button>
            </>
          ) : null}
          {entry.status === "posted" || entry.status === "skipped" ? null : (
            <>
              <AddInPlace label={t("words")}>
                {(close) => <Words close={close} entry={entry} />}
              </AddInPlace>
              <AddInPlace label={t("markPosted")}>
                {(close) => <MarkPosted close={close} entry={entry} />}
              </AddInPlace>
            </>
          )}
        </div>
      ) : null}
      <ErrorLine error={choose.error} />
    </li>
  );
};

/**
 * Media → Channels: the content calendar (decisions.md, Posting), a month
 * at a time (?month=yyyy-mm). Each entry has its date, channel and status,
 * its image from the library, captions in both languages with copy
 * buttons, and alt text; Media marks it posted with its link. Telegram's
 * posts stay automatic and aren't here. "Plan the year" fills the days the
 * Society marks.
 */
export const ContentCalendar = () => {
  const t = useTranslations("diwan.admin.calendar");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const grants = useGrants();
  const client = useQueryClient();
  const keeps = hasPermissionAnywhere(grants.data, "content.manage");
  const thisMonth = new Date().toISOString().slice(0, 7);
  const [kept, keep] = useQueryState("month");
  const [month, setMonth] = useState(MONTH.test(kept) ? kept : thisMonth);
  const entries = useEntries(month);
  const move = (by: number) => {
    const d = new Date(`${month}-01T00:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() + by);
    const next = d.toISOString().slice(0, 7);
    setMonth(next);
    keep(next === thisMonth ? "" : next);
  };
  const year = Number(month.slice(0, 4));
  const plan = useMutation({
    mutationFn: async () =>
      unwrap(await supabase.schema("api").rpc("plan_year", { year })),
    onSuccess: () => client.invalidateQueries({ queryKey: key }),
  });
  const label = new Intl.DateTimeFormat(
    locale === "ar" ? "ar-IQ-u-nu-latn" : "en-US",
    {
      month: "long",
      timeZone: "UTC",
      year: "numeric",
    }
  ).format(new Date(`${month}-01T00:00:00Z`));
  return (
    <DiwanSection description={t("lede")} id="calendar" title={t("title")}>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <button className="link" onClick={() => move(-1)} type="button">
          {t("previous")}
        </button>
        <span className="type-body font-medium">{label}</span>
        <button className="link" onClick={() => move(1)} type="button">
          {t("next")}
        </button>
        {keeps ? (
          <Button
            disabled={plan.isPending}
            onClick={() => plan.mutate()}
            size="sm"
            variant="outline"
          >
            {t("plan", { year: String(year) })}
          </Button>
        ) : null}
      </div>
      {plan.data === undefined ? null : (
        <p className="type-caption" role="status">
          {t("planned", {
            count: Number(plan.data),
            countText: formatNumber(Number(plan.data)),
          })}
        </p>
      )}
      <ErrorLine error={plan.error} />
      {entries.data?.length === 0 ? <EmptyLine>{t("empty")}</EmptyLine> : null}
      <RowList>
        {(entries.data ?? []).map((entry) => (
          <EntryRow entry={entry} keeps={keeps} key={entry.id} />
        ))}
      </RowList>
    </DiwanSection>
  );
};

/** The Desk's count: posts due in the next seven days and not yet posted. */
export const useDueThisWeek = (enabled: boolean) => {
  const { supabase } = useAuth();
  return useQuery({
    enabled,
    queryFn: async () => {
      const today = new Date();
      const from = today.toISOString().slice(0, 10);
      const to = new Date(today.getTime() + 7 * DAY).toISOString().slice(0, 10);
      const { count } = await supabase
        .schema("api")
        .from("calendar_entries")
        .select("id", { count: "exact", head: true })
        .gte("publish_on", from)
        .lte("publish_on", to)
        .in("status", ["planned", "ready", "choose"]);
      return count ?? 0;
    },
    queryKey: [...key, "due-this-week"],
  });
};
