"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/brand/components/ui/button";
import { Input } from "@repo/brand/components/ui/input";
import { Textarea } from "@repo/brand/components/ui/textarea";
import type { Json } from "@repo/database";
import { type Locale, localizedPath } from "@repo/internationalization";
import {
  formatLongDate,
  formatNumber,
} from "@repo/internationalization/format";
import { Link, useRouter } from "@repo/internationalization/navigation";
import { journal, localized, toPlainText, unwrap } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, type ReactNode, useState } from "react";
import { queryKeys, useOpenCalls } from "@/lib/diwan/queries";
import { manuscriptHtml } from "@/lib/manuscript";
import {
  AdminHeading,
  ConfirmAction,
  ErrorLine,
  Field,
  SelectInput,
} from "../admin/kit";
import { RichTextEditor } from "../editor/rich-text";
import { DiwanSection } from "../page";
import { SectionSpinner } from "../states";
import {
  attachFile,
  FilePicker,
  kindsFor,
  type PendingFile,
  PendingList,
} from "./files";
import { AuthorshipPledge, Declarations } from "./form";
import { PartnerPathway, useSubmitPathway, YourWork } from "./pages";

const LANGUAGES = ["en", "ar", "bilingual"] as const;

/** The sections that take work from members (Games come from the editors). */
const sendingDesks = journal.desks.filter(
  (desk) => journal.sendableCategories(desk).length > 0
);

/**
 * The door for visitors: Qirtas takes work from members and guests, so the
 * way in is to sign in (and back here) or to join. One solid button.
 */
const VisitorDoor = () => {
  const tw = useTranslations("diwan.journal.write");
  return (
    <div className="grid gap-3 border-line border-y py-5">
      <p className="type-body">{tw("door.who")}</p>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Link
          className="inline-flex h-12 items-center bg-accent px-6 font-medium text-[0.9375rem] text-on-accent hover:bg-accent/90"
          href={{ pathname: "/sign-in", query: { next: "/qirtas/write" } }}
        >
          {tw("door.signIn")}
        </Link>
        <Link className="link" href="/join">
          {tw("door.join")}
        </Link>
      </div>
    </div>
  );
};

/** How a piece goes from the writer to the paper, in three steps. */
const HowItWorks = () => {
  const tw = useTranslations("diwan.journal.write");
  return (
    <DiwanSection id="how" title={tw("how.title")}>
      <ol className="grid gap-4 md:grid-cols-3">
        {(["choose", "read", "edit"] as const).map((step, i) => (
          <li className="grid gap-1 border-line border-t pt-3" key={step}>
            <span className="type-caption">{formatNumber(i + 1)}</span>
            <span className="type-heading">{tw(`how.${step}.title`)}</span>
            <span className="type-body text-text-secondary">
              {tw(`how.${step}.body`)}
            </span>
          </li>
        ))}
      </ol>
    </DiwanSection>
  );
};

/**
 * /qirtas/write (owner, Oct 31, 2026; the gateway revised Nov 5, 2026):
 * one door, readable by anyone. Visitors learn what Qirtas takes and how it
 * is read, then sign in (and come back here) or join; members and guests
 * see their work first. Every section but Games takes work all year, read
 * blind before an editor takes it up with the author; Letters and Gallery
 * work may also answer an open call for the printed Edition.
 */
export const WriteHome = () => {
  const tw = useTranslations("diwan.journal.write");
  const tj = useTranslations("diwan.admin.journal");
  const locale = useLocale() as Locale;
  const { loading, user } = useAuth();
  const calls = useOpenCalls();
  const editionCalls = (calls.data ?? []).filter((c) => c.issue_id);
  let door: ReactNode = null;
  if (!loading) {
    door = user ? <YourWork /> : <VisitorDoor />;
  }
  return (
    <div className="grid gap-8">
      <AdminHeading title={tw("title")}>{tw("lede")}</AdminHeading>
      {/* Private work lives here alone, as drafts (owner, Oct 31, 2026):
          what the member sent and what is edited with them. Their author
          page shows only what is published. */}
      {door}
      <DiwanSection id="sections" title={tw("sectionsTitle")}>
        <ul className="grid divide-y divide-line border-line border-y">
          {sendingDesks.map((desk) => (
            <li
              className="grid gap-3 py-5 md:grid-cols-[12rem_1fr]"
              id={desk}
              key={desk}
            >
              <h3 className="type-heading">{tj(`desks.${desk}`)}</h3>
              <div className="grid gap-2">
                <p className="type-body">
                  {tw(`sections.${desk as Exclude<typeof desk, "games">}`)}
                </p>
                <ul className="flex flex-wrap gap-x-5 gap-y-2 pt-1">
                  {journal.sendableCategories(desk).map((category) => (
                    <li key={category}>
                      <Link
                        className="link font-medium text-sm"
                        href={`/qirtas/write/${category}`}
                      >
                        {tj(`categories.${category}`)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          ))}
        </ul>
        <p className="type-caption">
          {tw("gamesNote")}{" "}
          <Link className="link" href="/qirtas/games">
            {tw("gamesLink")}
          </Link>
        </p>
      </DiwanSection>
      <HowItWorks />
      <DiwanSection id="edition" title={tw("editionTitle")}>
        <p className="max-w-3xl text-text-secondary">{tw("editionLede")}</p>
        {calls.data ? null : <SectionSpinner />}
        {calls.data && editionCalls.length === 0 ? (
          <p className="type-body">{tw("noCall")}</p>
        ) : null}
        {editionCalls.map((call) => (
          <p className="type-body" key={call.id}>
            {tw("callCloses", {
              call: localized(call, "title", locale),
              date: formatLongDate(call.closes_at, locale, true),
              max: formatNumber(call.max_per_person),
            })}
          </p>
        ))}
      </DiwanSection>
    </div>
  );
};

/** Send, and what it waits for when it can't yet. */
const SendRow = ({
  missing,
  sending,
}: {
  readonly missing: ReturnType<typeof missingReason> | null;
  readonly sending: boolean;
}) => {
  const t = useTranslations("diwan.journal.write");
  return (
    <>
      {missing ? <p className="type-caption">{t(missing)}</p> : null}
      <Button
        className="justify-self-start"
        disabled={missing !== null || sending}
        type="submit"
      >
        {sending ? t("sending") : t("send")}
      </Button>
    </>
  );
};

/** What the Send button waits for, said under it. */
const missingReason = (pledged: boolean, work: boolean) => {
  if (!pledged) {
    return "missingPledge" as const;
  }
  return work ? ("missingDetails" as const) : ("missingWork" as const);
};

/**
 * The form for one type, at /qirtas/write/<type>; a saved draft opens at
 * /qirtas/write/<type>/<draft> (owner, Nov 4, 2026: drafts in their work).
 */
export const WriteType = ({
  draftId,
  type,
}: {
  readonly draftId?: string;
  readonly type: journal.Category;
}) => {
  const saved = useSavedDraft(draftId);
  if (saved.isPending && draftId) {
    return <SectionSpinner />;
  }
  // A draft opens under its own type only.
  if (draftId && saved.data?.category !== type) {
    return <MissingDraft type={type} />;
  }
  return (
    <WriteForm
      draftId={draftId}
      initial={fromDraft((saved.data?.content ?? {}) as DraftContent)}
      type={type}
    />
  );
};

const WriteForm = ({
  draftId,
  initial,
  type,
}: {
  readonly draftId?: string;
  readonly initial: ReturnType<typeof fromDraft>;
  readonly type: journal.Category;
}) => {
  const t = useTranslations("diwan.journal.write");
  const tf = useTranslations("diwan.journal.form");
  const tj = useTranslations("diwan.admin.journal");
  const router = useRouter();
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  const desk = journal.deskOf(type);
  const needs = journal.typeNeeds(type);
  const kinds = kindsFor(type);
  const { call, loading, pathway, setCallId, setPartnerId } = useWriteCall(
    desk,
    initial
  );
  const [language, setLanguage] = useState(initial.language);
  const [title, setTitle] = useState(initial.title);
  const [deck, setDeck] = useState(initial.deck);
  const [body, setBody] = useState(initial.body);
  const [videoUrl, setVideoUrl] = useState(initial.videoUrl);
  const [source, setSource] = useState<Source>(initial.source);
  const [note, setNote] = useState(initial.note);
  const [penName, setPenName] = useState(initial.penName);
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [pledged, setPledged] = useState(false);
  const [firstPublication, setFirstPublication] = useState(false);
  const [consent, setConsent] = useState(false);
  const [partial, setPartial] = useState<string | null>(null);
  const draft = useDraft(type, draftId);
  const draftContent: DraftContent = {
    body,
    callId: call?.id,
    deck,
    language,
    note,
    partnerId: pathway.throughPartner,
    penName,
    source,
    title,
    videoUrl,
  };

  const input = submissionInput({
    body,
    callId: call?.id,
    consent,
    deck,
    firstPublication,
    language,
    note,
    partnerId: pathway.throughPartner,
    penName,
    source,
    title,
    type,
    videoUrl,
  });
  const missing = missingReason(
    pledged,
    hasWork({ body, files, kinds, video: needs.video })
  );
  const ready =
    Boolean(call) &&
    pledged &&
    journal.submissionSchema.safeParse(input).success &&
    hasWork({ body, files, kinds, video: needs.video });

  const send = useMutation({
    mutationFn: async () => {
      const created = await journal.createSubmission(supabase, input);
      if (!created) {
        throw new Error("not_created");
      }
      const results = await Promise.allSettled(
        files
          .filter((f) => kinds.includes(f.kind))
          .map((f) => attachFile(supabase, created.id, f))
      );
      if (results.some((r) => r.status === "rejected")) {
        setPartial(created.id);
        return null;
      }
      return created.id;
    },
    onSuccess: async (id) => {
      await draft.discard();
      await queryClient.invalidateQueries({
        queryKey: queryKeys.submissions(user?.id ?? ""),
      });
      if (id) {
        router.push(`/membership/work/submissions/${id}`);
      }
    },
  });

  if (loading) {
    return <SectionSpinner />;
  }
  const submit = (event: FormEvent) => {
    event.preventDefault();
    send.mutate();
  };

  return (
    <div className="grid gap-8">
      <WriteHeading type={type} />
      {call ? (
        <form className="grid max-w-3xl gap-6" onSubmit={submit}>
          <WhereField
            calls={pathway.callable}
            onChange={setCallId}
            value={call.id}
          />
          <PartnerPathway
            isMember={pathway.isMember}
            onChange={setPartnerId}
            pathways={pathway.callPathways}
            value={pathway.throughPartner}
          />
          <Field label={tf("language")}>
            {(id) => (
              <SelectInput
                className="max-w-xs"
                id={id}
                onChange={(e) =>
                  setLanguage(e.target.value as (typeof LANGUAGES)[number])
                }
                value={language}
              >
                {LANGUAGES.map((l) => (
                  <option key={l} value={l}>
                    {tj(`languages.${l}`)}
                  </option>
                ))}
              </SelectInput>
            )}
          </Field>
          <Field label={tf("title")}>
            {(id) => (
              <Input
                id={id}
                maxLength={300}
                onChange={(e) => setTitle(e.target.value)}
                required
                value={title}
              />
            )}
          </Field>
          <DeckAndVideo
            deck={needs.deck ? deck : null}
            onDeck={setDeck}
            onVideo={setVideoUrl}
            video={needs.video ? videoUrl : null}
          />
          {needs.video ? null : (
            <FilesField
              body={body}
              files={files}
              kinds={kinds}
              onBody={setBody}
              onChange={setFiles}
            />
          )}
          <RichTextEditor
            label={needs.video ? t("summary") : tf("body")}
            lang={language === "ar" ? "ar" : "en"}
            onChange={setBody}
            value={body}
          />
          <p className="type-caption">{t(`standards.${desk}`)}</p>
          {type === "translation" ? (
            <TranslationFields onChange={setSource} value={source} />
          ) : null}
          <Field hint={t("noteHint")} label={t("note")}>
            {(id) => (
              <Textarea
                id={id}
                maxLength={2000}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                value={note}
              />
            )}
          </Field>
          <PenNameField onChange={setPenName} value={penName} />
          {desk === "news" ? null : (
            <Declarations
              category={type}
              consent={consent}
              firstPublication={firstPublication}
              onConsent={setConsent}
              onFirstPublication={setFirstPublication}
            />
          )}
          <AuthorshipPledge checked={pledged} onChange={setPledged} />
          <p className="type-caption">
            {t("limits", {
              hour: formatNumber(journal.MAX_SUBMISSIONS_PER_HOUR),
              max: formatNumber(call.max_per_person),
            })}
          </p>
          <SendRow missing={ready ? null : missing} sending={send.isPending} />
          <DraftRow
            content={draftContent}
            draft={draft}
            saved={draft.savedId !== undefined}
          />
          <ErrorLine error={send.error} />
          <PartialSend id={partial} />
        </form>
      ) : (
        <p className="type-body">{t("closed")}</p>
      )}
    </div>
  );
};

interface Source {
  author: string;
  rights: string;
  text: string;
}

/** A translation: the source text, its author and the right to translate. */
const TranslationFields = ({
  onChange,
  value,
}: {
  readonly onChange: (value: Source) => void;
  readonly value: Source;
}) => {
  const tf = useTranslations("diwan.journal.form");
  return (
    <fieldset className="grid gap-4">
      <legend className="mb-2 font-medium">{tf("translation")}</legend>
      <Field label={tf("sourceText")}>
        {(id) => (
          <Textarea
            id={id}
            maxLength={200_000}
            onChange={(e) => onChange({ ...value, text: e.target.value })}
            required
            rows={6}
            value={value.text}
          />
        )}
      </Field>
      <Field label={tf("sourceAuthor")}>
        {(id) => (
          <Input
            id={id}
            maxLength={300}
            onChange={(e) => onChange({ ...value, author: e.target.value })}
            value={value.author}
          />
        )}
      </Field>
      <Field hint={tf("rightsHint")} label={tf("rightsNote")}>
        {(id) => (
          <Textarea
            id={id}
            maxLength={2000}
            onChange={(e) => onChange({ ...value, rights: e.target.value })}
            required
            rows={3}
            value={value.rights}
          />
        )}
      </Field>
    </fieldset>
  );
};

/**
 * Publish under a pen name (owner, Oct 31, 2026): the byline shows it in
 * place of the author's name; only the Submissions Manager knows whose it is.
 */
const PenNameField = ({
  onChange,
  value,
}: {
  readonly onChange: (value: string) => void;
  readonly value: string;
}) => {
  const tf = useTranslations("diwan.journal.form");
  return (
    <Field hint={tf("penNameHint")} label={tf("penName")}>
      {(id) => (
        <Input
          className="max-w-sm"
          id={id}
          maxLength={80}
          onChange={(e) => onChange(e.target.value)}
          value={value}
        />
      )}
    </Field>
  );
};

/** The printed Edition or Qirtas online, when both take this type. */
const WhereField = ({
  calls,
  onChange,
  value,
}: {
  readonly calls: readonly { id: string; title_ar: string; title_en: string }[];
  readonly onChange: (callId: string) => void;
  readonly value: string;
}) => {
  const t = useTranslations("diwan.journal.write");
  const locale = useLocale() as Locale;
  if (calls.length < 2) {
    return null;
  }
  return (
    <Field hint={t("whereHint")} label={t("where")}>
      {(id) => (
        <SelectInput
          id={id}
          onChange={(e) => onChange(e.target.value)}
          value={value}
        >
          {calls.map((c) => (
            <option key={c.id} value={c.id}>
              {localized(c, "title", locale)}
            </option>
          ))}
        </SelectInput>
      )}
    </Field>
  );
};

interface InputState {
  body: string;
  callId: string | undefined;
  consent: boolean;
  deck: string;
  firstPublication: boolean;
  language: (typeof LANGUAGES)[number];
  note: string;
  partnerId: string | undefined;
  penName: string;
  source: Source;
  title: string;
  type: journal.Category;
  videoUrl: string;
}

const orNothing = (value: string) => value.trim() || undefined;

/** What the form sends, from what the member filled in. */
const submissionInput = (state: InputState) => {
  const desk = journal.deskOf(state.type);
  const needs = journal.typeNeeds(state.type);
  return {
    body_html: state.body || undefined,
    call_id: state.callId,
    category: state.type,
    consent_confirmed: desk === "gallery" ? state.consent : undefined,
    cover_note: orNothing(state.note),
    deck: needs.deck ? orNothing(state.deck) : undefined,
    first_publication_confirmed:
      desk === "news" ? undefined : state.firstPublication,
    human_authorship_confirmed: true as const,
    language: state.language,
    partner_id: state.partnerId,
    pen_name: orNothing(state.penName),
    rights_note: orNothing(state.source.rights),
    source_author: orNothing(state.source.author),
    source_text: orNothing(state.source.text),
    title: state.title.trim(),
    video_url: needs.video ? orNothing(state.videoUrl) : undefined,
  };
};

/** A piece needs a body, a file of the right kind, or (for video) a link. */
const hasWork = ({
  body,
  files,
  kinds,
  video,
}: {
  body: string;
  files: PendingFile[];
  kinds: ReturnType<typeof kindsFor>;
  video: boolean;
}) =>
  video ||
  Boolean(toPlainText(body).trim()) ||
  files.some((f) => kinds.includes(f.kind));

/** The deck (News and Voices) and the video link (Video), where asked. */
const DeckAndVideo = ({
  deck,
  onDeck,
  onVideo,
  video,
}: {
  readonly deck: string | null;
  readonly onDeck: (value: string) => void;
  readonly onVideo: (value: string) => void;
  readonly video: string | null;
}) => {
  const t = useTranslations("diwan.journal.write");
  return (
    <>
      {deck === null ? null : (
        <Field hint={t("deckHint")} label={t("deck")}>
          {(id) => (
            <Textarea
              id={id}
              maxLength={400}
              onChange={(e) => onDeck(e.target.value)}
              rows={2}
              value={deck}
            />
          )}
        </Field>
      )}
      {video === null ? null : (
        <Field hint={t("videoHint")} label={t("video")}>
          {(id) => (
            <Input
              dir="ltr"
              id={id}
              inputMode="url"
              maxLength={500}
              onChange={(e) => onVideo(e.target.value)}
              required
              type="url"
              value={video}
            />
          )}
        </Field>
      )}
    </>
  );
};

/**
 * The files, and the manuscript read into the editor (owner, Oct 31,
 * 2026): a Word file or a PDF fills the editor when it is empty, or offers
 * to; the file itself goes with the work as the original.
 */
const FilesField = ({
  body,
  files,
  kinds,
  onBody,
  onChange,
}: {
  readonly body: string;
  readonly files: PendingFile[];
  readonly kinds: ReturnType<typeof kindsFor>;
  readonly onBody: (html: string) => void;
  readonly onChange: (
    update: (current: PendingFile[]) => PendingFile[]
  ) => void;
}) => {
  const t = useTranslations("diwan.journal.write");
  const [read, setRead] = useState<{
    html: string | null;
    name: string;
    used: boolean;
  } | null>(null);
  const [reading, setReading] = useState(false);
  const readManuscript = async (file: File) => {
    setReading(true);
    try {
      const html = await manuscriptHtml(file);
      const empty = !toPlainText(body).trim();
      if (html && empty) {
        onBody(html);
      }
      setRead({ html, name: file.name, used: Boolean(html && empty) });
    } catch {
      setRead({ html: null, name: file.name, used: false });
    } finally {
      setReading(false);
    }
  };
  let line: ReactNode = null;
  if (reading) {
    line = t("manuscript.reading");
  } else if (read?.used) {
    line = t("manuscript.read", { name: read.name });
  } else if (read?.html) {
    const { html } = read;
    line = (
      <>
        {t("manuscript.offer", { name: read.name })}{" "}
        <Button
          className="h-auto px-0"
          onClick={() => {
            onBody(html);
            setRead({ ...read, used: true });
          }}
          type="button"
          variant="link"
        >
          {t("manuscript.use")}
        </Button>
      </>
    );
  } else if (read) {
    line = t("manuscript.unreadable", { name: read.name });
  }
  return (
    <fieldset className="grid gap-3">
      <legend className="mb-2 font-medium">{t("files")}</legend>
      <FilePicker
        kinds={kinds}
        onAdd={(added) => {
          onChange((current) => [...current, ...added]);
          const manuscript = added.find((f) => f.kind === "manuscript");
          if (manuscript) {
            readManuscript(manuscript.file);
          }
        }}
      />
      {line ? (
        <p className="type-caption" role="status">
          {line}
        </p>
      ) : null}
      <PendingList
        files={files}
        onRemove={(index) =>
          onChange((current) => current.filter((_, i) => i !== index))
        }
      />
    </fieldset>
  );
};

/** Sent, but a file did not upload: the member can add it from the work. */
const PartialSend = ({ id }: { readonly id: string | null }) => {
  const t = useTranslations("diwan.journal.write");
  if (!id) {
    return null;
  }
  return (
    <p className="text-sm text-text" role="alert">
      {t("filesFailed")}{" "}
      <Link className="link" href={`/membership/work/submissions/${id}`}>
        {t("openSubmission")}
      </Link>
    </p>
  );
};

/**
 * Where the work goes: every open call that takes this section (the
 * standing call, and an Edition call while one is open for Letters or
 * Gallery), the Edition's first.
 */
// ── Drafts ──────────────────────────────────────────────────────────────────

/** What a draft keeps: the form as the member left it (files go on sending). */
interface DraftContent {
  readonly body?: string;
  readonly callId?: string;
  readonly deck?: string;
  readonly language?: (typeof LANGUAGES)[number];
  readonly note?: string;
  readonly partnerId?: string;
  readonly penName?: string;
  readonly source?: Source;
  readonly title?: string;
  readonly videoUrl?: string;
}

/** A saved draft, read under the member's own rights (RLS: theirs only). */
const useSavedDraft = (draftId: string | undefined) => {
  const { supabase } = useAuth();
  return useQuery({
    enabled: Boolean(draftId),
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("journal")
          .from("submission_drafts")
          .select("id, category, content")
          .eq("id", draftId ?? "")
          .maybeSingle()
      ),
    queryKey: [...queryKeys.drafts, draftId],
  });
};

/**
 * Saving a draft (journal.submission_drafts, the member's alone). The
 * first save gives it its own address without leaving the form, so files
 * already chosen stay; sending the work drops the draft.
 */
const useDraft = (type: journal.Category, draftId: string | undefined) => {
  const { supabase } = useAuth();
  const locale = useLocale() as Locale;
  const queryClient = useQueryClient();
  const [savedId, setSavedId] = useState(draftId);
  const save = useMutation({
    mutationFn: async (content: DraftContent) => {
      const row = {
        category: type,
        content: content as NonNullable<Json>,
        title: (content.title ?? "").trim().slice(0, 300),
      };
      if (savedId) {
        unwrap(
          await supabase
            .schema("journal")
            .from("submission_drafts")
            .update(row)
            .eq("id", savedId)
        );
        return savedId;
      }
      const created = unwrap(
        await supabase
          .schema("journal")
          .from("submission_drafts")
          .insert(row)
          .select("id")
          .single()
      );
      return created?.id;
    },
    onSuccess: async (id) => {
      if (id && !savedId) {
        setSavedId(id);
        window.history.replaceState(
          null,
          "",
          localizedPath(locale, `/qirtas/write/${type}/${id}`)
        );
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.drafts });
    },
  });
  const discard = async () => {
    if (!savedId) {
      return;
    }
    unwrap(
      await supabase
        .schema("journal")
        .from("submission_drafts")
        .delete()
        .eq("id", savedId)
    );
    await queryClient.invalidateQueries({ queryKey: queryKeys.drafts });
  };
  return { discard, save, savedId };
};

type Draft = ReturnType<typeof useDraft>;

/** A saved draft's fields, with the form's own defaults for what it lacks. */
const fromDraft = (saved: DraftContent) => ({
  body: saved.body ?? "",
  // Empty: the default call (Qirtas, all year).
  callId: saved.callId ?? "",
  deck: saved.deck ?? "",
  language: saved.language ?? "en",
  note: saved.note ?? "",
  partnerId: saved.partnerId ?? "",
  penName: saved.penName ?? "",
  source: saved.source ?? { author: "", rights: "", text: "" },
  title: saved.title ?? "",
  videoUrl: saved.videoUrl ?? "",
});

/** Save draft beside Send, and Delete draft once it has one. */
const DraftRow = ({
  content,
  draft,
  saved,
}: {
  readonly content: DraftContent;
  readonly draft: Draft;
  readonly saved: boolean;
}) => {
  const t = useTranslations("diwan.journal.write");
  const router = useRouter();
  const remove = useMutation({
    mutationFn: draft.discard,
    onSuccess: () => router.push("/qirtas/write"),
  });
  let label = t("saveDraft");
  if (draft.save.isPending) {
    label = t("savingDraft");
  } else if (draft.save.isSuccess) {
    label = t("draftSaved");
  }
  return (
    <div className="grid gap-2 border-line border-t pt-4">
      <p className="type-caption">{t("draftHint")}</p>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          disabled={draft.save.isPending}
          onClick={() => draft.save.mutate(content)}
          type="button"
          variant="outline"
        >
          {label}
        </Button>
        {saved ? (
          <ConfirmAction
            confirmLabel={t("deleteDraft")}
            description={t("deleteDraftConfirm")}
            disabled={remove.isPending}
            onConfirm={() => remove.mutate()}
            variant="ghost"
          >
            {t("deleteDraft")}
          </ConfirmAction>
        ) : null}
      </div>
      <ErrorLine error={draft.save.error ?? remove.error} />
    </div>
  );
};

/** A draft address that isn't the member's (or was sent or deleted). */
const MissingDraft = ({ type }: { readonly type: journal.Category }) => {
  const t = useTranslations("diwan.journal.write");
  return (
    <div className="grid gap-4">
      <WriteHeading type={type} />
      <p className="type-body">{t("draftMissing")}</p>
      <Link className="link justify-self-start" href="/qirtas/write">
        {t("back")}
      </Link>
    </div>
  );
};

const useWriteCall = (
  desk: journal.Desk,
  initial: { readonly callId: string; readonly partnerId: string }
) => {
  const calls = useOpenCalls();
  const open = (calls.data ?? []).filter((c) => c.desks.includes(desk));
  const [callId, setCallId] = useState(initial.callId);
  const [partnerId, setPartnerId] = useState(initial.partnerId);
  const pathway = useSubmitPathway(open, callId, partnerId);
  const call =
    pathway.callable.find((c) => c.id === callId) ??
    // Qirtas, all year, first: an Edition call is the member's choice.
    pathway.callable.find((c) => !c.issue_id) ??
    pathway.callable[0];
  return {
    call,
    loading: !calls.data || pathway.pending,
    pathway,
    setCallId,
    setPartnerId,
  };
};

const WriteHeading = ({ type }: { readonly type: journal.Category }) => {
  const t = useTranslations("diwan.journal.write");
  const tj = useTranslations("diwan.admin.journal");
  return (
    <AdminHeading
      actions={
        <Link
          className="text-sm underline underline-offset-4"
          href="/qirtas/write"
        >
          {t("back")}
        </Link>
      }
      title={tj(`categories.${type}`)}
    >
      {t("blind", { section: tj(`desks.${journal.deskOf(type)}`) })}
    </AdminHeading>
  );
};
