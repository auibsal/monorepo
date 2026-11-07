"use client";

import { useAuth } from "@repo/auth/provider";
import { SalCard } from "@repo/brand/components/sal/card";
import { Button } from "@repo/brand/components/ui/button";
import { Checkbox } from "@repo/brand/components/ui/checkbox";
import { Input } from "@repo/brand/components/ui/input";
import { Label } from "@repo/brand/components/ui/label";
import { Textarea } from "@repo/brand/components/ui/textarea";
import type { Locale } from "@repo/internationalization";
import {
  formatClock,
  formatDateTime,
  formatLongDate,
  formatNumber,
} from "@repo/internationalization/format";
import { hasPermissionAnywhere } from "@repo/rbac";
import { localized, programmes, unwrap } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useEffect, useId, useState } from "react";
import { Link, useRouter } from "@/lib/diwan/navigation";
import { useGrants } from "@/lib/diwan/queries";
import { DiwanSection } from "../../page";
import { OnTheSite } from "../../site-links";
import { EmptyLine, SectionSpinner } from "../../states";
import { useProgrammeOptions } from "../events/data";
import { RequestQueue } from "../forms/admin";
import {
  AddInPlace,
  AdminHeading,
  BilingualField,
  ConfirmAction,
  DateTimeField,
  ErrorLine,
  Field,
  NewLink,
  RecordPage,
  SaveButton,
  SelectInput,
} from "../kit";
import { useMemberNames } from "../member-picker";
import { memberName } from "../members/directory";
import { slugify } from "../slug";
import { SkillsPicker } from "./skills-picker";

const invalidateKey = ["admin", "programmes-module"];

// ── Episodes ────────────────────────────────────────────────────────────────

interface EpisodeForm {
  id: string | null;
  number: string;
  season: string;
  segment: string;
  slug: string;
  summary: { ar: string; en: string };
  title: { ar: string; en: string };
  youtube: string;
}

const blankEpisode: EpisodeForm = {
  id: null,
  number: "",
  season: "",
  segment: "",
  slug: "",
  summary: { ar: "", en: "" },
  title: { ar: "", en: "" },
  youtube: "",
};

/**
 * Next Stop's episodes, each edited on its own page
 * (/media/episodes/<slug>, or /new), published from the list.
 */
const Episodes = ({ programmeId }: { programmeId: string }) => {
  const t = useTranslations("diwan.admin.programmes.episodes");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const episodes = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("programmes")
          .from("episodes")
          .select("*")
          .eq("programme_id", programmeId)
          .order("season", { ascending: false, nullsFirst: false })
          .order("number", { ascending: false, nullsFirst: false })
      ) ?? [],
    queryKey: [...invalidateKey, "episodes", programmeId],
  });
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: invalidateKey });

  const publish = useMutation({
    mutationFn: async (episode: { id: string; published_at: string | null }) =>
      unwrap(
        await supabase
          .schema("programmes")
          .from("episodes")
          .update({
            published_at: episode.published_at
              ? null
              : new Date().toISOString(),
          })
          .eq("id", episode.id)
      ),
    onSuccess: invalidate,
  });

  return (
    <div className="grid gap-6">
      <ul className="grid gap-3">
        {episodes.data?.map((e) => (
          <li
            className="flex flex-wrap items-center justify-between gap-3 border-line border-b pb-3"
            key={e.id}
          >
            <div>
              <Link
                className="font-medium hover:underline"
                href={`/media/episodes/${e.slug}`}
              >
                {e.season && e.number ? `${e.season}.${e.number} · ` : ""}
                {localized(e, "title", locale)}
              </Link>
              <p className="type-caption">
                {e.segment ? `${e.segment} · ` : ""}
                {e.published_at ? t("published") : t("draft")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ConfirmAction
                confirmLabel={e.published_at ? t("unpublish") : t("publish")}
                description={
                  e.published_at ? localized(e, "title", locale) : t("careNote")
                }
                disabled={publish.isPending}
                onConfirm={() => publish.mutate(e)}
                variant={e.published_at ? "ghost" : "default"}
              >
                {e.published_at ? t("unpublish") : t("publish")}
              </ConfirmAction>
            </div>
          </li>
        ))}
      </ul>
      <Link className="link justify-self-start" href="/media/episodes/new">
        {t("new")}
      </Link>
      <ErrorLine error={publish.error} />
    </div>
  );
};

/** One Next Stop episode on its own page, by its slug; new for a blank one. */
export const EpisodePage = ({ slug }: { readonly slug: string }) => {
  const t = useTranslations("diwan.admin.programmes.episodes");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const options = useProgrammeOptions(null);
  const programmeId = options.options.find((p) => p.slug === "next-stop")?.id;
  const back = "/media";
  const episode = useQuery({
    enabled: slug !== "new",
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("programmes")
          .from("episodes")
          .select("*")
          .eq("slug", slug)
          .maybeSingle()
      ),
    queryKey: [...invalidateKey, "episode", slug],
  });
  if (options.isPending || (slug !== "new" && episode.isPending)) {
    return <SectionSpinner />;
  }
  const e = episode.data;
  if (!programmeId || (slug !== "new" && !e)) {
    return (
      <EmptyLine action={{ href: back, label: t("back") }}>
        {t("missing")}
      </EmptyLine>
    );
  }
  const initial: EpisodeForm = e
    ? {
        id: e.id,
        number: e.number ? String(e.number) : "",
        season: e.season ? String(e.season) : "",
        segment: e.segment ?? "",
        slug: e.slug,
        summary: { ar: e.summary_ar ?? "", en: e.summary_en ?? "" },
        title: { ar: e.title_ar, en: e.title_en },
        youtube: e.youtube_id,
      }
    : blankEpisode;
  return (
    <div className="grid max-w-3xl gap-8">
      <AdminHeading
        actions={
          <>
            <Link className="link" href={back}>
              {t("back")}
            </Link>
            {e?.published_at ? <OnTheSite href="/next-stop" /> : null}
          </>
        }
        title={e ? localized(e, "title", locale) : t("new")}
      />
      <EpisodeEditor initial={initial} programmeId={programmeId} />
    </div>
  );
};

const EpisodeEditor = ({
  initial,
  programmeId,
}: {
  readonly initial: EpisodeForm;
  readonly programmeId: string;
}) => {
  const t = useTranslations("diwan.admin.programmes.episodes");
  const tk = useTranslations("diwan.admin.kit");
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [form, setForm] = useState<EpisodeForm>(initial);
  const [problem, setProblem] = useState<string | null>(null);
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: invalidateKey });
  const save = useMutation({
    mutationFn: async () => {
      const id = programmes.youtubeId(form.youtube);
      if (!id) {
        setProblem(t("youtubeError"));
        throw new Error("invalid");
      }
      setProblem(null);
      const row = {
        number: form.number ? Number(form.number) : null,
        programme_id: programmeId,
        season: form.season ? Number(form.season) : null,
        segment: form.segment.trim() || null,
        slug: form.slug || slugify(form.title.en),
        summary_ar: form.summary.ar || null,
        summary_en: form.summary.en || null,
        title_ar: form.title.ar,
        title_en: form.title.en,
        youtube_id: id,
      };
      const table = supabase.schema("programmes").from("episodes");
      unwrap(
        form.id
          ? await table.update(row).eq("id", form.id)
          : await table.insert(row)
      );
    },
    onSuccess: async () => {
      await invalidate();
      router.push("/media");
    },
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate();
  };

  return (
    <form className="grid gap-4" onSubmit={submit}>
      <BilingualField
        label={t("titleField")}
        maxLength={200}
        onChange={(title) => setForm((f) => ({ ...f, title }))}
        required
        value={form.title}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={t("season")}>
          {(id) => (
            <Input
              dir="ltr"
              id={id}
              min={1}
              onChange={(e) =>
                setForm((f) => ({ ...f, season: e.target.value }))
              }
              type="number"
              value={form.season}
            />
          )}
        </Field>
        <Field label={t("number")}>
          {(id) => (
            <Input
              dir="ltr"
              id={id}
              min={1}
              onChange={(e) =>
                setForm((f) => ({ ...f, number: e.target.value }))
              }
              type="number"
              value={form.number}
            />
          )}
        </Field>
        <Field label={t("segment")}>
          {(id) => (
            <Input
              id={id}
              maxLength={80}
              onChange={(e) =>
                setForm((f) => ({ ...f, segment: e.target.value }))
              }
              value={form.segment}
            />
          )}
        </Field>
      </div>
      <Field hint={t("youtubeHint")} label={t("youtube")}>
        {(id) => (
          <Input
            dir="ltr"
            id={id}
            onChange={(e) =>
              setForm((f) => ({ ...f, youtube: e.target.value }))
            }
            required
            value={form.youtube}
          />
        )}
      </Field>
      <Field hint={tk("slugHint")} label={tk("slug")}>
        {(id) => (
          <Input
            dir="ltr"
            id={id}
            maxLength={80}
            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
            placeholder={slugify(form.title.en)}
            value={form.slug}
          />
        )}
      </Field>
      <BilingualField
        label={t("summary")}
        maxLength={600}
        multiline
        onChange={(summary) => setForm((f) => ({ ...f, summary }))}
        rows={3}
        value={form.summary}
      />
      {problem ? (
        <p className="text-sm text-text" role="alert">
          {problem}
        </p>
      ) : null}
      <div className="flex gap-3">
        <SaveButton pending={save.isPending} />
      </div>
      {save.error && save.error.message !== "invalid" ? (
        <ErrorLine error={save.error} />
      ) : null}
    </form>
  );
};

// ── Reels ───────────────────────────────────────────────────────────────────

const platforms = ["instagram", "tiktok", "youtube_shorts"] as const;

const Reels = ({ programmeId }: { programmeId: string }) => {
  const t = useTranslations("diwan.admin.programmes.reels");
  const te = useTranslations("diwan.admin.programmes.episodes");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const data = useQuery({
    queryFn: async () => {
      const [reels, episodes] = await Promise.all([
        supabase
          .schema("programmes")
          .from("reels")
          .select("*")
          .eq("programme_id", programmeId)
          .order("created_at", { ascending: false }),
        supabase
          .schema("programmes")
          .from("episodes")
          .select("id, title_en, title_ar")
          .eq("programme_id", programmeId),
      ]);
      return { episodes: unwrap(episodes) ?? [], reels: unwrap(reels) ?? [] };
    },
    queryKey: [...invalidateKey, "reels", programmeId],
  });
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: invalidateKey });
  const publish = useMutation({
    mutationFn: async (reel: { id: string; published_at: string | null }) =>
      unwrap(
        await supabase
          .schema("programmes")
          .from("reels")
          .update({
            published_at: reel.published_at ? null : new Date().toISOString(),
          })
          .eq("id", reel.id)
      ),
    onSuccess: invalidate,
  });

  return (
    <div className="grid gap-6">
      <ul className="grid gap-3">
        {data.data?.reels.map((r) => (
          <li
            className="flex flex-wrap items-center justify-between gap-3 border-line border-b pb-3"
            key={r.id}
          >
            <div className="min-w-0">
              <p className="font-medium">
                {t(`platforms.${r.platform as (typeof platforms)[number]}`)}
              </p>
              <p className="type-caption break-all" dir="ltr">
                {r.url}
              </p>
              {r.caption_en || r.caption_ar ? (
                <p className="type-caption">
                  {localized(r, "caption", locale)}
                </p>
              ) : null}
            </div>
            <ConfirmAction
              confirmLabel={r.published_at ? te("unpublish") : te("publish")}
              description={te("careNote")}
              disabled={publish.isPending}
              onConfirm={() => publish.mutate(r)}
              variant={r.published_at ? "ghost" : "default"}
            >
              {r.published_at ? te("unpublish") : te("publish")}
            </ConfirmAction>
          </li>
        ))}
      </ul>
      <NewLink href="/media/reels/new">{t("new")}</NewLink>
      <ErrorLine error={publish.error} />
    </div>
  );
};

/** A new reel for Next Stop, at /media/reels/new. */
const NewReel = ({ programmeId }: { readonly programmeId: string }) => {
  const t = useTranslations("diwan.admin.programmes.reels");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [form, setForm] = useState({
    caption: { ar: "", en: "" },
    episode_id: "",
    platform: "instagram" as (typeof platforms)[number],
    url: "",
  });
  const [problem, setProblem] = useState<string | null>(null);
  const episodes = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("programmes")
          .from("episodes")
          .select("id, title_en, title_ar")
          .eq("programme_id", programmeId)
      ) ?? [],
    queryKey: [...invalidateKey, "episodes", programmeId],
  });
  const add = useMutation({
    mutationFn: async () => {
      if (!programmes.isReelUrl(form.url)) {
        setProblem(t("urlError"));
        throw new Error("invalid");
      }
      setProblem(null);
      unwrap(
        await supabase
          .schema("programmes")
          .from("reels")
          .insert({
            caption_ar: form.caption.ar || null,
            caption_en: form.caption.en || null,
            episode_id: form.episode_id || null,
            platform: form.platform,
            programme_id: programmeId,
            url: form.url.trim(),
          })
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: invalidateKey });
      router.push("/media");
    },
  });
  return (
    <form
      className="grid max-w-3xl gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        add.mutate();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("platform")}>
          {(id) => (
            <SelectInput
              id={id}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  platform: e.target.value as (typeof platforms)[number],
                }))
              }
              value={form.platform}
            >
              {platforms.map((p) => (
                <option key={p} value={p}>
                  {t(`platforms.${p}`)}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
        <Field label={t("episode")}>
          {(id) => (
            <SelectInput
              id={id}
              onChange={(e) =>
                setForm((f) => ({ ...f, episode_id: e.target.value }))
              }
              value={form.episode_id}
            >
              <option value="">{t("none")}</option>
              {episodes.data?.map((e) => (
                <option key={e.id} value={e.id}>
                  {localized(e, "title", locale)}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
      </div>
      <Field label={t("url")}>
        {(id) => (
          <Input
            dir="ltr"
            id={id}
            onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
            required
            type="url"
            value={form.url}
          />
        )}
      </Field>
      <BilingualField
        label={t("caption")}
        maxLength={300}
        onChange={(caption) => setForm((f) => ({ ...f, caption }))}
        value={form.caption}
      />
      {problem ? (
        <p className="text-sm text-text" role="alert">
          {problem}
        </p>
      ) : null}
      <SaveButton pending={add.isPending} />
      {add.error && add.error.message !== "invalid" ? (
        <ErrorLine error={add.error} />
      ) : null}
    </form>
  );
};

export const NewReelPage = () => {
  const t = useTranslations("diwan.admin.programmes.reels");
  const options = useProgrammeOptions(null);
  if (options.isPending) {
    return <SectionSpinner />;
  }
  const nextStop = options.options.find((p) => p.slug === "next-stop");
  return (
    <RecordPage back="/media" backLabel={t("back")} title={t("new")}>
      {nextStop ? <NewReel programmeId={nextStop.id} /> : null}
    </RecordPage>
  );
};

// ── Shifts ────────────────────────────────────────────────────────

type SignupStatus = "signed_up" | "confirmed" | "swap_requested" | "cancelled";

/**
 * An event's volunteer shifts (owner, Nov 7, 2026: shifts live only on an
 * event and log no hours; there are no rotas).
 */
export const Shifts = ({ eventId }: { eventId: string }) => {
  const t = useTranslations("diwan.admin.programmes.rotas");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const data = useQuery({
    queryFn: async () => {
      const shifts =
        unwrap(
          await supabase
            .schema("programmes")
            .from("shifts")
            .select("*")
            .eq("event_id", eventId)
            .order("starts_at")
        ) ?? [];
      const signups = shifts.length
        ? (unwrap(
            await supabase
              .schema("programmes")
              .from("shift_signups")
              .select("shift_id, user_id, status")
              .in(
                "shift_id",
                shifts.map((s) => s.id)
              )
          ) ?? [])
        : [];
      return { shifts, signups };
    },
    queryKey: [...invalidateKey, "shifts", eventId],
  });
  const names = useMemberNames(data.data?.signups.map((s) => s.user_id) ?? []);
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: invalidateKey });

  const setStatus = useMutation({
    mutationFn: async (input: {
      shift_id: string;
      status: SignupStatus;
      user_id: string;
    }) =>
      unwrap(
        await supabase
          .schema("programmes")
          .from("shift_signups")
          .update({ status: input.status })
          .eq("shift_id", input.shift_id)
          .eq("user_id", input.user_id)
      ),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: async (shiftId: string) =>
      unwrap(
        await supabase
          .schema("programmes")
          .from("shifts")
          .delete()
          .eq("id", shiftId)
      ),
    onSuccess: invalidate,
  });

  return (
    <div className="grid gap-4">
      {data.data?.shifts.length === 0 ? (
        <p className="type-caption">{t("noShifts")}</p>
      ) : null}
      <ul className="grid gap-3">
        {data.data?.shifts.map((shift) => {
          const signups = (data.data?.signups ?? []).filter(
            (s) => s.shift_id === shift.id && s.status !== "cancelled"
          );
          return (
            <li className="grid gap-2 border-line border-b pb-3" key={shift.id}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-medium">
                  {localized(shift, "role", locale)}
                  {shift.station ? ` · ${t("station")}` : ""}
                  {shift.location_en || shift.location_ar
                    ? ` · ${localized(shift, "location", locale)}`
                    : ""}
                </p>
                <p className="type-caption">
                  {formatLongDate(shift.starts_at, locale)},{" "}
                  {formatClock(shift.starts_at, locale)}–
                  {formatClock(shift.ends_at, locale)} ·{" "}
                  {t("signups", {
                    capacity: formatNumber(shift.capacity),
                    count: formatNumber(signups.length),
                  })}
                </p>
              </div>
              <ul className="grid gap-1 ps-4">
                {signups.map((s) => {
                  const person = names.data?.find((n) => n.id === s.user_id);
                  return (
                    <li
                      className="flex flex-wrap items-center gap-3"
                      key={s.user_id}
                    >
                      <span>{person ? memberName(person, locale) : "—"}</span>
                      <span className="type-caption">
                        {t(`statuses.${s.status as SignupStatus}`)}
                      </span>
                      {s.status === "confirmed" ? null : (
                        <Button
                          disabled={setStatus.isPending}
                          onClick={() =>
                            setStatus.mutate({ ...s, status: "confirmed" })
                          }
                          size="sm"
                          variant="ghost"
                        >
                          {t("confirm")}
                        </Button>
                      )}
                      <Button
                        disabled={setStatus.isPending}
                        onClick={() =>
                          setStatus.mutate({ ...s, status: "cancelled" })
                        }
                        size="sm"
                        variant="ghost"
                      >
                        {t("release")}
                      </Button>
                    </li>
                  );
                })}
              </ul>
              <div>
                <ConfirmAction
                  confirmLabel={t("deleteShift")}
                  description={t("deleteShiftConfirm")}
                  disabled={remove.isPending}
                  onConfirm={() => remove.mutate(shift.id)}
                  variant="ghost"
                >
                  {t("deleteShift")}
                </ConfirmAction>
              </div>
            </li>
          );
        })}
      </ul>
      <AddInPlace label={t("addShift")}>
        {(close) => <NewShift eventId={eventId} onDone={close} />}
      </AddInPlace>
      <ErrorLine error={setStatus.error ?? remove.error} />
    </div>
  );
};

/** A new shift on the event, added in place under its shifts. */
const NewShift = ({
  eventId,
  onDone,
}: {
  readonly eventId: string;
  /** Called once saved: closes the form in place. */
  readonly onDone: () => void;
}) => {
  const t = useTranslations("diwan.admin.programmes.rotas");
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const stationId = useId();
  const [form, setForm] = useState({
    capacity: "1",
    ends_at: null as string | null,
    location: { ar: "", en: "" },
    role: { ar: "", en: "" },
    skills: [] as string[],
    starts_at: null as string | null,
    station: false,
  });
  const add = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase
          .schema("programmes")
          .from("shifts")
          .insert({
            capacity: Number(form.capacity) || 1,
            ends_at: form.ends_at ?? "",
            event_id: eventId,
            location_ar: form.location.ar || null,
            location_en: form.location.en || null,
            role_ar: form.role.ar,
            role_en: form.role.en,
            skills: form.skills,
            starts_at: form.starts_at ?? "",
            station: form.station,
          })
      ),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: invalidateKey });
      onDone();
    },
  });
  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        add.mutate();
      }}
    >
      <BilingualField
        label={t("role")}
        maxLength={120}
        onChange={(role) => setForm((f) => ({ ...f, role }))}
        required
        value={form.role}
      />
      <BilingualField
        label={t("location")}
        maxLength={120}
        onChange={(location) => setForm((f) => ({ ...f, location }))}
        value={form.location}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <DateTimeField
          label={t("starts")}
          onChange={(starts_at) => setForm((f) => ({ ...f, starts_at }))}
          required
          value={form.starts_at}
        />
        <DateTimeField
          label={t("ends")}
          onChange={(ends_at) => setForm((f) => ({ ...f, ends_at }))}
          required
          value={form.ends_at}
        />
        <Field label={t("capacity")}>
          {(id) => (
            <Input
              dir="ltr"
              id={id}
              min={1}
              onChange={(e) =>
                setForm((f) => ({ ...f, capacity: e.target.value }))
              }
              type="number"
              value={form.capacity}
            />
          )}
        </Field>
      </div>
      <SkillsPicker
        onChange={(skills) => setForm((f) => ({ ...f, skills }))}
        value={form.skills}
      />
      {/* A Tour station (decisions §12): its confirmed volunteers attach
          photographed pages to live cards while it runs. */}
      <div className="flex items-start gap-2">
        <Checkbox
          checked={form.station}
          id={`${stationId}-station`}
          onCheckedChange={(checked) =>
            setForm((f) => ({ ...f, station: checked === true }))
          }
        />
        <Label className="grid gap-1" htmlFor={`${stationId}-station`}>
          <span>{t("station")}</span>
          <span className="type-caption text-text-secondary">
            {t("stationHint")}
          </span>
        </Label>
      </div>
      <SaveButton
        disabled={!(form.starts_at && form.ends_at)}
        pending={add.isPending}
      />
      <ErrorLine error={add.error} />
    </form>
  );
};

// ── Removal requests ────────────────────────────────────────────────────────

type RemovalStatus = (typeof programmes.removalStatuses)[number];

const useOpenRemovals = () => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("programmes")
          .from("removal_requests")
          .select("*")
          .order("due_at")
          .limit(100)
      ) ?? [],
    queryKey: [...invalidateKey, "removals"],
  });
};

const Countdown = ({ dueAt }: { dueAt: string }) => {
  const t = useTranslations("diwan.admin.programmes.removals");
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const left = programmes.timeLeft(dueAt, now);
  const values = {
    hours: formatNumber(left.hours),
    minutes: formatNumber(left.minutes),
  };
  return (
    <p
      className={left.overdue ? "font-medium text-text" : "font-medium"}
      role="timer"
    >
      {left.overdue ? t("overdue", values) : t("left", values)}
    </p>
  );
};

const RemovalCard = ({
  request,
}: {
  request: NonNullable<ReturnType<typeof useOpenRemovals>["data"]>[number];
}) => {
  const t = useTranslations("diwan.admin.programmes.removals");
  const locale = useLocale() as Locale;
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  const [action, setAction] = useState(request.action_taken ?? "");
  const [status, setStatus] = useState<RemovalStatus>("removed");
  const update = useMutation({
    mutationFn: async (next: RemovalStatus) => {
      const closing = next !== "open" && next !== "in_progress";
      unwrap(
        await supabase
          .schema("programmes")
          .from("removal_requests")
          .update({
            action_taken: action.trim() || null,
            closed_at: closing ? new Date().toISOString() : null,
            handled_by: user?.id ?? null,
            status: next,
          })
          .eq("id", request.id)
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: invalidateKey }),
  });

  return (
    <SalCard>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-medium">
          {t("from", { name: request.requester_name })}
        </p>
        <Countdown dueAt={request.due_at} />
      </div>
      <p className="type-caption">
        <span dir="ltr">{request.requester_email}</span> ·{" "}
        {t("due", { time: formatDateTime(request.due_at, locale) })} ·{" "}
        {t(`statuses.${request.status as RemovalStatus}`)}
      </p>
      {request.content_url ? (
        <p className="break-all text-sm" dir="ltr">
          {t("content")}: {request.content_url}
        </p>
      ) : null}
      <p className="type-body whitespace-pre-line">{request.details}</p>
      <Field label={t("action")}>
        {(id) => (
          <Textarea
            id={id}
            maxLength={2000}
            onChange={(e) => setAction(e.target.value)}
            rows={2}
            value={action}
          />
        )}
      </Field>
      <div className="flex flex-wrap items-end gap-3">
        {request.status === "open" ? (
          <Button
            disabled={update.isPending}
            onClick={() => update.mutate("in_progress")}
            size="sm"
            variant="outline"
          >
            {t("start")}
          </Button>
        ) : null}
        <SelectInput
          aria-label={t("close")}
          className="w-44"
          onChange={(e) => setStatus(e.target.value as RemovalStatus)}
          value={status}
        >
          {(["removed", "declined", "closed"] as const).map((s) => (
            <option key={s} value={s}>
              {t(`statuses.${s}`)}
            </option>
          ))}
        </SelectInput>
        <ConfirmAction
          confirmLabel={t("close")}
          description={t("closeConfirm")}
          disabled={!action.trim() || update.isPending}
          onConfirm={() => update.mutate(status)}
          variant="default"
        >
          {t("close")}
        </ConfirmAction>
      </div>
      <ErrorLine error={update.error} />
    </SalCard>
  );
};

const Removals = () => {
  const t = useTranslations("diwan.admin.programmes.removals");
  const locale = useLocale() as Locale;
  const requests = useOpenRemovals();
  const open = (requests.data ?? []).filter(
    (r) => r.status === "open" || r.status === "in_progress"
  );
  const closed = (requests.data ?? [])
    .filter((r) => !open.includes(r))
    .slice(0, 20);
  return (
    <div className="grid gap-4">
      <p className="type-body text-text-secondary">{t("lede")}</p>
      {requests.isPending ? <SectionSpinner /> : null}
      {requests.data && open.length === 0 ? (
        <p className="type-body text-text-secondary">{t("empty")}</p>
      ) : null}
      {open.map((r) => (
        <RemovalCard key={r.id} request={r} />
      ))}
      {closed.length > 0 ? (
        <section className="grid gap-2">
          <h3 className="type-subheading">{t("recent")}</h3>
          <ul className="grid gap-1">
            {closed.map((r) => (
              <li className="type-caption" key={r.id}>
                {r.requester_name} ·{" "}
                {t(`statuses.${r.status as RemovalStatus}`)}
                {r.closed_at ? ` · ${formatDateTime(r.closed_at, locale)}` : ""}
                {r.action_taken ? ` · ${r.action_taken}` : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
};

/** Event pitches (F-10) waiting for the President, who owns events. */
export const ProgramPitches = () => {
  const t = useTranslations("diwan.admin.programmes");
  const grants = useGrants();
  // Only those who answer pitches see them (the President, owner, Nov 5, 2026).
  if (!hasPermissionAnywhere(grants.data, "programs.manage")) {
    return null;
  }
  return (
    <DiwanSection
      description={t("pitches.lede")}
      id="pitches"
      title={t("pitches.title")}
    >
      <RequestQueue base="/events/proposals" keys={["f11"]} />
    </DiwanSection>
  );
};

/**
 * Media (decisions §6): Next Stop, the Director of Media's video show, with
 * its episodes, its reels and the takedown requests its promise allows.
 */
export const MediaAdmin = () => {
  const t = useTranslations("diwan.admin.programmes");
  const ts = useTranslations("diwan.admin.sections");
  const options = useProgrammeOptions(null);
  if (options.isPending) {
    return <SectionSpinner />;
  }
  const nextStop = options.options.find((p) => p.slug === "next-stop");
  return (
    <div className="grid gap-10">
      <AdminHeading title={ts("media")} />
      {nextStop ? (
        <>
          <DiwanSection id="episodes" title={t("tabs.episodes")}>
            <Episodes programmeId={nextStop.id} />
          </DiwanSection>
          <DiwanSection id="reels" title={t("tabs.reels")}>
            <Reels programmeId={nextStop.id} />
          </DiwanSection>
        </>
      ) : null}
      <DiwanSection id="removals" title={t("removalsTitle")}>
        <Removals />
      </DiwanSection>
    </div>
  );
};
