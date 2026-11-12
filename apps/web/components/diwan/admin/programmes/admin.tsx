"use client";

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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useId,
  useState,
} from "react";
import { useAuth } from "@/lib/auth/provider";
import { localized, programmes, unwrap } from "@/lib/data";
import { Link, useRouter } from "@/lib/diwan/navigation";
import { useGrants } from "@/lib/diwan/queries";
import { hasPermissionAnywhere } from "@/lib/rbac";
import { uploadMedia } from "@/lib/storage";
import { DiwanSection } from "../../page";
import { OnTheSite } from "../../site-links";
import { EmptyLine, SectionSpinner } from "../../states";
import { useProgrammeOptions } from "../events/data";
import { RequestQueue } from "../forms/admin";
import { ImageField } from "../image-field";
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
import { MemberPicker, useMemberNames } from "../member-picker";
import { memberName } from "../members/directory";
import { ProblemReports } from "../problem-reports";
import { slugify } from "../slug";

const invalidateKey = ["admin", "programmes-module"];

// ── Episodes ────────────────────────────────────────────────────────────────

interface ChapterRow {
  time: string;
  title: { ar: string; en: string };
}

interface EpisodeForm {
  captionsAr: string | null;
  captionsEn: string | null;
  chapters: ChapterRow[];
  id: string | null;
  number: string;
  releasedOn: string;
  season: string;
  segment: string;
  slug: string;
  summary: { ar: string; en: string };
  thumbnail: string | null;
  title: { ar: string; en: string };
  youtube: string;
  youtubeAr: string;
}

const blankEpisode: EpisodeForm = {
  captionsAr: null,
  captionsEn: null,
  chapters: [],
  id: null,
  number: "",
  releasedOn: "",
  season: "",
  segment: "",
  slug: "",
  summary: { ar: "", en: "" },
  thumbnail: null,
  title: { ar: "", en: "" },
  youtube: "",
  youtubeAr: "",
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
            className="border-line flex flex-wrap items-center justify-between gap-3 border-b pb-3"
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
        captionsAr: e.captions_ar_path,
        captionsEn: e.captions_en_path,
        chapters: programmes.chaptersOf(e.chapters).map((c) => ({
          time: programmes.clockOf(c.at),
          title: { ar: c.title_ar, en: c.title_en },
        })),
        id: e.id,
        number: e.number ? String(e.number) : "",
        releasedOn: e.released_on ?? "",
        season: e.season ? String(e.season) : "",
        segment: e.segment ?? "",
        slug: e.slug,
        summary: { ar: e.summary_ar ?? "", en: e.summary_en ?? "" },
        thumbnail: e.thumbnail_path,
        title: { ar: e.title_ar, en: e.title_en },
        youtube: e.youtube_id,
        youtubeAr: e.youtube_id_ar ?? "",
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
      {e ? <OnCamera episodeId={e.id} /> : null}
      {e ? <EpisodeCredits episodeId={e.id} /> : null}
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
      const idAr = form.youtubeAr.trim()
        ? programmes.youtubeId(form.youtubeAr)
        : null;
      if (!id || (form.youtubeAr.trim() && !idAr)) {
        setProblem(t("youtubeError"));
        throw new Error("invalid");
      }
      const chapters = form.chapters
        .filter((c) => c.title.en.trim() || c.title.ar.trim())
        .map((c) => ({
          at: programmes.secondsOf(c.time),
          title_ar: c.title.ar.trim(),
          title_en: c.title.en.trim(),
        }));
      if (chapters.some((c) => c.at === null)) {
        setProblem(t("chapterTimeError"));
        throw new Error("invalid");
      }
      setProblem(null);
      const row = {
        captions_ar_path: form.captionsAr,
        captions_en_path: form.captionsEn,
        chapters: chapters.sort((a, b) => (a.at ?? 0) - (b.at ?? 0)),
        number: form.number ? Number(form.number) : null,
        programme_id: programmeId,
        released_on: form.releasedOn || null,
        season: form.season ? Number(form.season) : null,
        segment: form.segment.trim() || null,
        slug: form.slug || slugify(form.title.en),
        summary_ar: form.summary.ar || null,
        summary_en: form.summary.en || null,
        thumbnail_path: form.thumbnail,
        title_ar: form.title.ar,
        title_en: form.title.en,
        youtube_id: id,
        youtube_id_ar: idAr,
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
      <Field hint={t("youtubeArHint")} label={t("youtubeAr")}>
        {(id) => (
          <Input
            dir="ltr"
            id={id}
            onChange={(e) =>
              setForm((f) => ({ ...f, youtubeAr: e.target.value }))
            }
            value={form.youtubeAr}
          />
        )}
      </Field>
      <Field label={t("releasedOn")}>
        {(id) => (
          <Input
            dir="ltr"
            id={id}
            onChange={(e) =>
              setForm((f) => ({ ...f, releasedOn: e.target.value }))
            }
            type="date"
            value={form.releasedOn}
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
      <ImageField
        area="next-stop"
        label={t("thumbnail")}
        onChange={(thumbnail) => setForm((f) => ({ ...f, thumbnail }))}
        value={form.thumbnail}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {(["en", "ar"] as const).map((lang) => (
          <CaptionsField
            key={lang}
            language={lang}
            onChange={(path) =>
              setForm((f) =>
                lang === "en"
                  ? { ...f, captionsEn: path }
                  : { ...f, captionsAr: path }
              )
            }
            value={lang === "en" ? form.captionsEn : form.captionsAr}
          />
        ))}
      </div>
      <fieldset className="grid gap-3">
        <legend className="mb-2 text-sm font-medium">{t("chapters")}</legend>
        <p className="type-caption">{t("chaptersHint")}</p>
        {form.chapters.map((chapter, index) => (
          <div
            className="border-line grid gap-3 border-t pt-3 sm:grid-cols-[6rem_1fr]"
            // biome-ignore lint/suspicious/noArrayIndexKey: rows have no id until saved
            key={index}
          >
            <Field label={t("chapterTime")}>
              {(id) => (
                <Input
                  dir="ltr"
                  id={id}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      chapters: f.chapters.map((c, i) =>
                        i === index ? { ...c, time: e.target.value } : c
                      ),
                    }))
                  }
                  placeholder="0:00"
                  value={chapter.time}
                />
              )}
            </Field>
            <div className="grid gap-2">
              <BilingualField
                label={t("chapterTitle")}
                maxLength={80}
                onChange={(title) =>
                  setForm((f) => ({
                    ...f,
                    chapters: f.chapters.map((c, i) =>
                      i === index ? { ...c, title } : c
                    ),
                  }))
                }
                value={chapter.title}
              />
              <button
                className="link justify-self-start"
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    chapters: f.chapters.filter((_, i) => i !== index),
                  }))
                }
                type="button"
              >
                {t("chapterRemove")}
              </button>
            </div>
          </div>
        ))}
        <button
          className="link justify-self-start"
          onClick={() =>
            setForm((f) => ({
              ...f,
              chapters: [
                ...f.chapters,
                { time: "", title: { ar: "", en: "" } },
              ],
            }))
          }
          type="button"
        >
          {t("chapterAdd")}
        </button>
      </fieldset>
      <BilingualField
        label={t("summary")}
        maxLength={600}
        multiline
        onChange={(summary) => setForm((f) => ({ ...f, summary }))}
        rows={3}
        value={form.summary}
      />
      {problem ? (
        <p className="text-text text-sm" role="alert">
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

/** A WebVTT caption file for one language, in the public media bucket. */
const CaptionsField = ({
  language,
  onChange,
  value,
}: {
  readonly language: "en" | "ar";
  readonly onChange: (path: string | null) => void;
  readonly value: string | null;
}) => {
  const t = useTranslations("diwan.admin.programmes.episodes");
  const { supabase } = useAuth();
  const id = useId();
  const upload = useMutation({
    mutationFn: async (file: File) =>
      (await uploadMedia(supabase, "next-stop", file)).path,
    onSuccess: onChange,
  });
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{t(`captions.${language}`)}</Label>
      {value ? (
        <p className="type-caption flex flex-wrap gap-x-4">
          <span dir="ltr">{value.split("/").at(-1)}</span>
          <button className="link" onClick={() => onChange(null)} type="button">
            {t("captions.remove")}
          </button>
        </p>
      ) : null}
      <Input
        accept=".vtt,text/vtt"
        id={id}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            upload.mutate(
              file.type
                ? file
                : new File([file], file.name, { type: "text/vtt" })
            );
          }
        }}
        type="file"
      />
      <ErrorLine error={upload.error} />
    </div>
  );
};

/**
 * Everyone on camera, and their media release (media-release). Each gets a
 * single-use link to sign; the episode can't be published until all have
 * signed (decisions.md, Next Stop: releases).
 */
const OnCamera = ({ episodeId }: { readonly episodeId: string }) => {
  const t = useTranslations("diwan.admin.programmes.episodes.onCamera");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const key = [...invalidateKey, "on-camera", episodeId];
  const people = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("programmes")
          .from("episode_on_camera")
          .select(
            "id, user_id, guest_name_en, guest_name_ar, is_guest, form_link_id, release_id"
          )
          .eq("episode_id", episodeId)
          .order("created_at")
      ) ?? [],
    queryKey: key,
  });
  const names = useMemberNames(
    (people.data ?? []).flatMap((p) => (p.user_id ? [p.user_id] : []))
  );
  const refresh = () => queryClient.invalidateQueries({ queryKey: key });
  const send = useMutation({
    mutationFn: async (input: { id: string; email?: string }) =>
      unwrap(
        await supabase.schema("programmes").rpc("episode_release_link", {
          on_camera: input.id,
          sent_to: input.email,
        })
      ),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: async (id: string) =>
      unwrap(
        await supabase
          .schema("programmes")
          .from("episode_on_camera")
          .delete()
          .eq("id", id)
      ),
    onSuccess: refresh,
  });
  return (
    <DiwanSection id="on-camera" title={t("title")}>
      <p className="type-body text-text-secondary max-w-2xl">{t("body")}</p>
      <ul className="border-line grid border-b">
        {(people.data ?? []).map((p) => (
          <OnCameraRow
            key={p.id}
            name={
              memberNameOf(names.data, p.user_id, locale) ||
              (locale === "ar" && p.guest_name_ar) ||
              p.guest_name_en ||
              ""
            }
            onRemove={() => remove.mutate(p.id)}
            onSend={(email) => send.mutate({ email, id: p.id })}
            pending={send.isPending || remove.isPending}
            row={p}
          />
        ))}
      </ul>
      <ErrorLine error={send.error ?? remove.error} />
      <AddInPlace label={t("add")}>
        {(close) => (
          <AddOnCamera
            episodeId={episodeId}
            onDone={() => {
              close();
              refresh();
            }}
          />
        )}
      </AddInPlace>
    </DiwanSection>
  );
};

const memberNameOf = (
  rows:
    | { full_name_ar: string | null; full_name_en: string; id: string }[]
    | undefined,
  id: string | null,
  locale: Locale
) => {
  const row = id ? rows?.find((n) => n.id === id) : undefined;
  return row ? memberName(row, locale) : "";
};

const OnCameraRow = ({
  name,
  onRemove,
  onSend,
  pending,
  row,
}: {
  readonly name: string;
  readonly onRemove: () => void;
  readonly onSend: (email?: string) => void;
  readonly pending: boolean;
  readonly row: {
    form_link_id: string | null;
    is_guest: boolean;
    release_id: string | null;
    user_id: string | null;
  };
}) => {
  const t = useTranslations("diwan.admin.programmes.episodes.onCamera");
  let status = t("unsent");
  if (row.release_id) {
    status = t("signed");
  } else if (row.form_link_id) {
    status = t("sent");
  }
  let action: ReactNode = null;
  if (!row.release_id) {
    action = row.user_id ? (
      <button
        className="link"
        disabled={pending}
        onClick={() => onSend()}
        type="button"
      >
        {row.form_link_id ? t("resend") : t("send")}
      </button>
    ) : (
      <GuestLink
        onSend={onSend}
        pending={pending}
        sent={Boolean(row.form_link_id)}
      />
    );
  }
  return (
    <li className="border-line flex flex-wrap items-center justify-between gap-3 border-t py-3">
      <div>
        <p className="font-medium">{name}</p>
        <p className="type-caption">
          {row.is_guest ? `${t("guest")} · ` : ""}
          {status}
        </p>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {action}
        {row.release_id ? null : (
          <button
            className="link"
            disabled={pending}
            onClick={onRemove}
            type="button"
          >
            {t("remove")}
          </button>
        )}
      </div>
    </li>
  );
};

/** A guest's address, asked only to send the link (never kept on the row). */
const GuestLink = ({
  onSend,
  pending,
  sent,
}: {
  readonly onSend: (email: string) => void;
  readonly pending: boolean;
  readonly sent: boolean;
}) => {
  const t = useTranslations("diwan.admin.programmes.episodes.onCamera");
  const [email, setEmail] = useState("");
  const id = useId();
  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSend(email.trim());
      }}
    >
      <Label className="sr-only" htmlFor={id}>
        {t("guestEmail")}
      </Label>
      <Input
        dir="ltr"
        id={id}
        onChange={(event) => setEmail(event.target.value)}
        placeholder={t("guestEmail")}
        required
        type="email"
        value={email}
      />
      <Button disabled={pending} type="submit" variant="outline">
        {sent ? t("resend") : t("send")}
      </Button>
    </form>
  );
};

const AddOnCamera = ({
  episodeId,
  onDone,
}: {
  readonly episodeId: string;
  readonly onDone: () => void;
}) => {
  const t = useTranslations("diwan.admin.programmes.episodes.onCamera");
  const { supabase } = useAuth();
  const [person, setPerson] = useState<{ id: string } | null>(null);
  const [email, setEmail] = useState("");
  const [isGuest, setIsGuest] = useState(false);
  // A member is picked from the people; a guest from outside is invited
  // by email, and their name is the one they sign the release with (the
  // third prompt, §1: no name fields).
  const add = useMutation({
    mutationFn: async () =>
      person
        ? unwrap(
            await supabase
              .schema("programmes")
              .from("episode_on_camera")
              .insert({
                episode_id: episodeId,
                is_guest: isGuest,
                user_id: person.id,
              })
          )
        : unwrap(
            await supabase.schema("programmes").rpc("invite_on_camera", {
              email: email.trim(),
              episode: episodeId,
            })
          ),
    onSuccess: onDone,
  });
  return (
    <form
      className="grid max-w-xl gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        add.mutate();
      }}
    >
      <MemberPicker
        label={t("member")}
        onChange={(p) => setPerson(p)}
        value={person as never}
      />
      {person ? (
        <label className="flex items-center gap-2">
          <Checkbox
            checked={isGuest}
            onCheckedChange={(v) => setIsGuest(v === true)}
          />
          <span className="type-body">{t("asGuest")}</span>
        </label>
      ) : (
        <Field hint={t("inviteHint")} label={t("guestEmail")}>
          {(id) => (
            <Input
              autoComplete="off"
              dir="ltr"
              id={id}
              inputMode="email"
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              value={email}
            />
          )}
        </Field>
      )}
      <div className="flex flex-wrap gap-3">
        <Button
          disabled={add.isPending || !(person || email.includes("@"))}
          type="submit"
        >
          {t("add")}
        </Button>
      </div>
      <ErrorLine error={add.error} />
    </form>
  );
};

const CREDIT_KEYS = programmes.CREDITS.filter((c) => c !== "guests");

/**
 * The crew's credits: Next Stop crew roles scoped to this episode, each with
 * its credit (decisions.md, Get involved and roles; Video: credits). The
 * standing producer and host are credited when none is named here; guests
 * come from the on-camera list.
 */
const EpisodeCredits = ({ episodeId }: { readonly episodeId: string }) => {
  const t = useTranslations("diwan.admin.programmes.episodes.credits");
  const tc = useTranslations("web.journal.nextStop.credit");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const key = [...invalidateKey, "credits", episodeId];
  const credits = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase.schema("programmes").rpc("episode_credits", {
          episode: episodeId,
        })
      ) ?? [],
    queryKey: key,
  });
  const [person, setPerson] = useState<{ id: string } | null>(null);
  const [credit, setCredit] = useState<string>("directed_by");
  const assign = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase.schema("programmes").rpc("credit_episode", {
          credit,
          episode: episodeId,
          member: person?.id ?? "",
        })
      ),
    onSuccess: () => {
      setPerson(null);
      return queryClient.invalidateQueries({ queryKey: key });
    },
  });
  return (
    <DiwanSection id="credits" title={t("title")}>
      <p className="type-body text-text-secondary max-w-2xl">{t("body")}</p>
      <dl className="border-line grid border-b">
        {(credits.data ?? []).map((c, index) => (
          <div
            className="border-line grid gap-1 border-t py-2 sm:grid-cols-[14rem_1fr]"
            // biome-ignore lint/suspicious/noArrayIndexKey: one credit may name several people
            key={`${c.credit}-${index}`}
          >
            <dt className="type-label">{tc(c.credit as programmes.Credit)}</dt>
            <dd>{locale === "ar" ? c.name_ar || c.name_en : c.name_en}</dd>
          </div>
        ))}
      </dl>
      <AddInPlace label={t("add")}>
        {(close) => (
          <form
            className="grid max-w-xl gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              assign.mutate(undefined, { onSuccess: close });
            }}
          >
            <MemberPicker
              label={t("member")}
              onChange={(p) => setPerson(p)}
              value={person as never}
            />
            <Field label={t("credit")}>
              {(id) => (
                <SelectInput
                  id={id}
                  onChange={(e) => setCredit(e.target.value)}
                  value={credit}
                >
                  {CREDIT_KEYS.map((c) => (
                    <option key={c} value={c}>
                      {tc(c)}
                    </option>
                  ))}
                </SelectInput>
              )}
            </Field>
            <Button disabled={!person || assign.isPending} type="submit">
              {t("add")}
            </Button>
            <ErrorLine error={assign.error} />
          </form>
        )}
      </AddInPlace>
    </DiwanSection>
  );
};

const IDEA_STATUSES = [
  "idea",
  "asked",
  "agreed",
  "declined",
  "appeared",
] as const;

/**
 * Next Stop's guest ideas (decisions.md, Next Stop): people the show might
 * invite, kept here so no names are kept in Notion. Only the Director of
 * Media, the producer and the host see it (media.guest_ideas).
 */
const GuestIdeas = () => {
  const t = useTranslations("diwan.admin.programmes.guestIdeas");
  const { supabase } = useAuth();
  const grants = useGrants();
  const queryClient = useQueryClient();
  const allowed = hasPermissionAnywhere(grants.data, "media.guest_ideas");
  const key = [...invalidateKey, "guest-ideas"];
  const ideas = useQuery({
    enabled: allowed,
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("programmes")
          .from("next_stop_guest_ideas")
          .select("id, name, why, status")
          .order("created_at", { ascending: false })
      ) ?? [],
    queryKey: key,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: key });
  const setStatus = useMutation({
    mutationFn: async (input: { id: string; status: string }) =>
      unwrap(
        await supabase
          .schema("programmes")
          .from("next_stop_guest_ideas")
          .update({ status: input.status })
          .eq("id", input.id)
      ),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: async (id: string) =>
      unwrap(
        await supabase
          .schema("programmes")
          .from("next_stop_guest_ideas")
          .delete()
          .eq("id", id)
      ),
    onSuccess: refresh,
  });
  if (!allowed) {
    return null;
  }
  return (
    <DiwanSection id="guest-ideas" title={t("title")}>
      <p className="type-body text-text-secondary max-w-2xl">{t("body")}</p>
      <ul className="border-line grid border-b">
        {(ideas.data ?? []).map((idea) => (
          <li
            className="border-line flex flex-wrap items-start justify-between gap-3 border-t py-3"
            key={idea.id}
          >
            <div className="grid gap-1">
              <p className="font-medium">{idea.name}</p>
              {idea.why ? <p className="type-caption">{idea.why}</p> : null}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <Field label={t("status")}>
                {(id) => (
                  <SelectInput
                    id={id}
                    onChange={(e) =>
                      setStatus.mutate({ id: idea.id, status: e.target.value })
                    }
                    value={idea.status}
                  >
                    {IDEA_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {t(`statuses.${status}`)}
                      </option>
                    ))}
                  </SelectInput>
                )}
              </Field>
              <button
                className="link"
                disabled={remove.isPending}
                onClick={() => remove.mutate(idea.id)}
                type="button"
              >
                {t("remove")}
              </button>
            </div>
          </li>
        ))}
      </ul>
      <ErrorLine error={setStatus.error ?? remove.error} />
      <AddInPlace label={t("add")}>
        {(close) => (
          <AddGuestIdea
            onDone={() => {
              close();
              refresh();
            }}
          />
        )}
      </AddInPlace>
    </DiwanSection>
  );
};

const AddGuestIdea = ({ onDone }: { readonly onDone: () => void }) => {
  const t = useTranslations("diwan.admin.programmes.guestIdeas");
  const { supabase } = useAuth();
  const [name, setName] = useState("");
  const [why, setWhy] = useState("");
  const add = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase
          .schema("programmes")
          .from("next_stop_guest_ideas")
          .insert({ name: name.trim(), why: why.trim() || null })
      ),
    onSuccess: onDone,
  });
  return (
    <form
      className="grid max-w-xl gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        add.mutate();
      }}
    >
      <Field label={t("name")}>
        {(id) => (
          <Input
            id={id}
            maxLength={120}
            onChange={(e) => setName(e.target.value)}
            required
            value={name}
          />
        )}
      </Field>
      <Field label={t("why")}>
        {(id) => (
          <Textarea
            id={id}
            maxLength={1000}
            onChange={(e) => setWhy(e.target.value)}
            rows={3}
            value={why}
          />
        )}
      </Field>
      <Button disabled={add.isPending || name.trim().length < 2} type="submit">
        {t("add")}
      </Button>
      <ErrorLine error={add.error} />
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
            className="border-line flex flex-wrap items-center justify-between gap-3 border-b pb-3"
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
        <p className="text-text text-sm" role="alert">
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

type SignupStatus = "signed_up" | "confirmed" | "swap_requested" | "canceled";

/**
 * An event's volunteer shifts (decisions.md: shifts live only on an
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
            (s) => s.shift_id === shift.id && s.status !== "canceled"
          );
          return (
            <li className="border-line grid gap-2 border-b pb-3" key={shift.id}>
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
                          setStatus.mutate({ ...s, status: "canceled" })
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
      className={left.overdue ? "text-text font-medium" : "font-medium"}
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
        <p className="text-sm break-all" dir="ltr">
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

/** Event pitches (members-meeting-motion) waiting for the President, who owns events. */
export const ProgramPitches = () => {
  const t = useTranslations("diwan.admin.programmes");
  const grants = useGrants();
  // Only those who answer pitches see them (the President, decisions.md).
  if (!hasPermissionAnywhere(grants.data, "programs.manage")) {
    return null;
  }
  return (
    <DiwanSection
      description={t("pitches.lede")}
      id="pitches"
      title={t("pitches.title")}
    >
      <RequestQueue base="/events/proposals" keys={["event-pitch"]} />
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
          <GuestIdeas />
        </>
      ) : null}
      <DiwanSection id="removals" title={t("removalsTitle")}>
        <Removals />
      </DiwanSection>
      <ProblemReports />
    </div>
  );
};
