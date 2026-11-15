"use client";

import {
  ReviewStep,
  Receipt as SharedReceipt,
} from "@repo/brand/components/sal/form-flow";
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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import {
  type FormEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { useReviewWords } from "@/components/account/flow";
import { useAuth } from "@/lib/auth/provider";
import { journal, localized, toPlainText, unwrap } from "@/lib/data";
import {
  queryKeys,
  useMemberStatus,
  useOpenCalls,
  useProfile,
} from "@/lib/diwan/queries";
import { manuscriptHtml } from "@/lib/manuscript";
import {
  AdminHeading,
  ConfirmAction,
  ErrorLine,
  Field,
  SelectInput,
} from "../admin/kit";
import { RichTextEditor } from "../editor/rich-text";
import { SectionSpinner } from "../states";
import {
  attachFile,
  FilePicker,
  kindsFor,
  type PendingFile,
  PendingList,
} from "./files";
import { AuthorshipPledge, Declarations } from "./form";
import { PartnerPathway, useSubmitPathway } from "./pages";

const LANGUAGES = ["en", "ar", "bilingual"] as const;
/** A draft saves itself this long after the last change. */
const AUTOSAVE_MS = 4000;

/** Send, and what it waits for when it can't yet. */
/**
 * Send, with the review step first (decisions.md, The site: "One form
 * flow"): the first press shows what goes, the second sends it.
 */
const SendRow = ({
  missing,
  review,
  sending,
}: {
  readonly missing: ReturnType<typeof missingReason> | null;
  readonly review: readonly [string, string][];
  readonly sending: boolean;
}) => {
  const t = useTranslations("diwan.journal.write");
  const words = useReviewWords();
  return (
    <ReviewStep
      missing={missing ? t(missing) : null}
      rows={review}
      sending={sending}
      words={{ ...words, send: t("send"), sending: t("sending") }}
    />
  );
};

/**
 * The receipt on the page (decisions.md, The site: "One form flow"): the
 * record number, when the writer hears back, and the work's own page; the
 * "received" email goes out at the same time.
 */
const Receipt = ({
  receipt,
}: {
  readonly receipt: { id: string; reference: string; reply: string };
}) => {
  const t = useTranslations("diwan.journal.write.receipt");
  return (
    <SharedReceipt
      actions={
        <>
          <Link
            className="link font-medium"
            href={`/account/work/submissions/${receipt.id}`}
          >
            {t("open")}
          </Link>
          <Link className="link" href={journal.SEND_YOUR_WORK}>
            {t("more")}
          </Link>
        </>
      }
      email={t("email")}
      number={t("number", { number: receipt.reference })}
      reply={receipt.reply}
      title={t("title")}
    />
  );
};

/** What the Send button waits for, said under it. */
const missingReason = (pledged: boolean, work: boolean) => {
  if (!pledged) {
    return "missingPledge" as const;
  }
  return work ? ("missingDetails" as const) : ("missingWork" as const);
};

/** Where a form lives and where it leads back to. */
interface Place {
  /** The Edition whose call it answers; none for Voices. */
  readonly edition?: string;
  /** The form's own address, a draft's under it. */
  readonly form: string;
  /** The page it came from: the Edition, or Voices. */
  readonly home: string;
}

const placeOf = (type: journal.Category, edition?: string): Place =>
  edition
    ? {
        edition,
        form: `/qirtas/editions/${edition}/submit/${type}`,
        home: `/qirtas/editions/${edition}`,
      }
    : { form: journal.draftPath(type), home: "/qirtas/voices" };

/**
 * The form for one type, under its Edition at
 * /qirtas/editions/:edition/submit/:type (decisions.md, Qirtas), or
 * Voices' own at /qirtas/voices/letter and /op-ed; a saved draft opens at
 * the form's address plus its id.
 */
export const WriteType = ({
  draftId,
  edition,
  type,
}: {
  readonly draftId?: string;
  readonly edition?: string;
  readonly type: journal.Category;
}) => {
  const saved = useSavedDraft(draftId);
  const place = placeOf(type, edition);
  // Once the draft is open, sending it (which deletes it) keeps the form
  // and its receipt on the page.
  const opened = useRef(false);
  if (saved.data?.category === type) {
    opened.current = true;
  }
  if (saved.isPending && draftId) {
    return <SectionSpinner />;
  }
  // A draft opens under its own type only.
  if (draftId && !opened.current && saved.data?.category !== type) {
    return <MissingDraft place={place} type={type} />;
  }
  return (
    <WriteForm
      draftId={draftId}
      initial={fromDraft((saved.data?.content ?? {}) as DraftContent)}
      place={place}
      type={type}
    />
  );
};

/** What the review step shows before the work goes. */
const reviewRows = ({
  call,
  files,
  locale,
  penName,
  t,
  title,
  typeName,
}: {
  readonly call: { title_ar: string; title_en: string } | undefined;
  readonly files: number;
  readonly locale: Locale;
  readonly penName: string;
  readonly t: ReturnType<typeof useTranslations<"diwan.journal.write">>;
  readonly title: string;
  readonly typeName: string;
}): [string, string][] => [
  [
    t("review.call"),
    call ? localized(call, "title", locale) : t("review.noCall"),
  ],
  [t("review.type"), typeName],
  [t("review.workTitle"), title || t("untitledDraft")],
  [t("review.byline"), penName.trim() || t("review.ownName")],
  [t("review.files"), formatNumber(files)],
];

/**
 * When the writer hears back (decisions.md, Qirtas: "Calls"): within six
 * weeks for general submissions, by the call's decision date for a themed
 * call, and from the Voices desk once it decides.
 */
const replyLine = (
  call:
    | { closes_at: string; decisions_at: string | null; kind: string }
    | undefined,
  locale: Locale,
  t: ReturnType<typeof useTranslations<"diwan.journal.write">>
) => {
  if (!call) {
    return t("receipt.replyVoices");
  }
  if (call.kind === "general") {
    return t("receipt.replyGeneral");
  }
  return call.decisions_at
    ? t("receipt.replyBy", { date: formatLongDate(call.decisions_at, locale) })
    : t("receipt.replyThemed");
};

const WriteForm = ({
  draftId,
  initial,
  place,
  type,
}: {
  readonly draftId?: string;
  readonly initial: ReturnType<typeof fromDraft>;
  readonly place: Place;
  readonly type: journal.Category;
}) => {
  const t = useTranslations("diwan.journal.write");
  const tf = useTranslations("diwan.journal.form");
  const tj = useTranslations("diwan.admin.journal");
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  const desk = journal.deskOf(type);
  const needs = journal.typeNeeds(type);
  const kinds = kindsFor(type);
  const { call, loading, pathway, sendable, setCallId, setPartnerId } =
    useWriteCall(desk, initial, place.edition);
  const [language, setLanguage] = useState(initial.language);
  const [title, setTitle] = useState(initial.title);
  const [deck, setDeck] = useState(initial.deck);
  const [body, setBody] = useState(initial.body);
  const [videoUrl, setVideoUrl] = useState(initial.videoUrl);
  const [source, setSource] = useState<Source>(initial.source);
  const [note, setNote] = useState(initial.note);
  const [penName, setPenName] = useState(initial.penName);
  const [aboutWriter, setAboutWriter] = useState(initial.aboutWriter);
  const [writerYear, setWriterYear] = useState(initial.writerYear);
  const [film, setFilm] = useState<Film>(initial.film);
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [pledged, setPledged] = useState(false);
  const [firstPublication, setFirstPublication] = useState(false);
  const [consent, setConsent] = useState(false);
  const [partial, setPartial] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<{
    id: string;
    reference: string;
    reply: string;
  } | null>(null);
  const locale = useLocale() as Locale;
  const draft = useDraft(type, draftId, place.form);
  const draftContent: DraftContent = {
    aboutWriter,
    body,
    callId: call?.id,
    deck,
    film,
    language,
    note,
    partnerId: pathway.throughPartner,
    path: place.form,
    penName,
    source,
    title,
    videoUrl,
    writerYear,
  };

  const input = submissionInput({
    aboutWriter,
    body,
    callId: call?.id,
    consent,
    deck,
    film,
    firstPublication,
    language,
    note,
    partnerId: pathway.throughPartner,
    penName,
    source,
    title,
    type,
    videoUrl,
    writerYear,
  });
  const missing = missingReason(
    pledged,
    hasWork({ body, files, kinds, video: needs.video })
  );
  const ready =
    sendable &&
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
      return created;
    },
    onSuccess: async (created) => {
      await draft.discard();
      await queryClient.invalidateQueries({
        queryKey: queryKeys.submissions(user?.id ?? ""),
      });
      if (created) {
        setReceipt({
          id: created.id,
          reference: created.reference ?? "",
          reply: replyLine(call, locale, t),
        });
        window.scrollTo({ top: 0 });
      }
    },
  });

  if (receipt) {
    return <Receipt receipt={receipt} />;
  }
  if (loading) {
    return <SectionSpinner />;
  }
  const submit = (event: FormEvent) => {
    event.preventDefault();
    send.mutate();
  };

  return (
    <div className="grid gap-8">
      <WriteHeading place={place} type={type} />
      {sendable ? (
        <form className="grid max-w-3xl gap-6" onSubmit={submit}>
          <CallFields
            callId={call?.id}
            onCall={setCallId}
            onPartner={setPartnerId}
            pathway={pathway}
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
          <FilmFields onChange={setFilm} shown={needs.video} value={film} />
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
          <WordsLine body={body} type={type} />
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
          <BylineFields
            aboutWriter={aboutWriter}
            onAboutWriter={setAboutWriter}
            onPenName={setPenName}
            onWriterYear={setWriterYear}
            penName={penName}
            type={type}
            writerYear={writerYear}
          />
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
          <LimitsLine max={call?.max_per_person} />
          <SendRow
            missing={ready ? null : missing}
            review={reviewRows({
              call,
              files: files.filter((f) => kinds.includes(f.kind)).length,
              locale,
              penName,
              t,
              title,
              typeName: tj(`categories.${type}`),
            })}
            sending={send.isPending}
          />
          <DraftRow
            content={draftContent}
            draft={draft}
            home={place.home}
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
 * Publish under a pen name (decisions.md): the byline shows it in
 * place of the author's name; only the Editor-in-Chief and the Managing Editor know whose it is.
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
  aboutWriter: string;
  body: string;
  callId: string | undefined;
  consent: boolean;
  deck: string;
  film: Film;
  firstPublication: boolean;
  language: (typeof LANGUAGES)[number];
  note: string;
  partnerId: string | undefined;
  penName: string;
  source: Source;
  title: string;
  type: journal.Category;
  videoUrl: string;
  writerYear: string;
}

const orNothing = (value: string) => value.trim() || undefined;

/** What the form sends, from what the member filled in. */
const submissionInput = (state: InputState) => {
  const desk = journal.deskOf(state.type);
  const needs = journal.typeNeeds(state.type);
  const { video } = needs;
  return {
    about_writer:
      state.type === "opinion_essay" ? orNothing(state.aboutWriter) : undefined,
    body_html: state.body || undefined,
    call_id: state.callId,
    captions_confirmed: video ? state.film.captions : undefined,
    category: state.type,
    consent_confirmed: desk === "gallery" ? state.consent : undefined,
    cover_note: orNothing(state.note),
    deck: needs.deck ? orNothing(state.deck) : undefined,
    first_publication_confirmed:
      desk === "news" ? undefined : state.firstPublication,
    human_authorship_confirmed: true as const,
    language: state.language,
    partner_id: state.partnerId,
    pen_name: desk === "voices" ? undefined : orNothing(state.penName),
    release_confirmed: video ? state.film.release : undefined,
    rights_note: orNothing(state.source.rights),
    running_minutes:
      video && Number(state.film.minutes) > 0
        ? Math.round(Number(state.film.minutes))
        : undefined,
    source_author: orNothing(state.source.author),
    source_text: orNothing(state.source.text),
    title: state.title.trim(),
    video_url: needs.video ? orNothing(state.videoUrl) : undefined,
    writer_year:
      state.type === "opinion_essay" && journal.isWriterYear(state.writerYear)
        ? state.writerYear
        : undefined,
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
 * The files, and the manuscript read into the editor (decisions.md): a Word file or a PDF fills the editor when it is empty, or offers
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
    <p className="text-text text-sm" role="alert">
      {t("filesFailed")}{" "}
      <Link className="link" href={`/account/work/submissions/${id}`}>
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
  readonly aboutWriter?: string;
  readonly body?: string;
  readonly callId?: string;
  readonly deck?: string;
  readonly film?: Film;
  readonly language?: (typeof LANGUAGES)[number];
  readonly note?: string;
  readonly partnerId?: string;
  /** The form's address, for the draft's link in Your account → Work. */
  readonly path?: string;
  readonly penName?: string;
  readonly source?: Source;
  readonly title?: string;
  readonly videoUrl?: string;
  readonly writerYear?: string;
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
const useDraft = (
  type: journal.Category,
  draftId: string | undefined,
  form: string
) => {
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
          localizedPath(locale, `${form}/${id}`)
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
  aboutWriter: saved.aboutWriter ?? "",
  body: saved.body ?? "",
  // Empty: the Edition's open call (Haven's, for now).
  callId: saved.callId ?? "",
  deck: saved.deck ?? "",
  film: saved.film ?? { captions: false, minutes: "", release: false },
  language: saved.language ?? "en",
  note: saved.note ?? "",
  partnerId: saved.partnerId ?? "",
  penName: saved.penName ?? "",
  source: saved.source ?? { author: "", rights: "", text: "" },
  title: saved.title ?? "",
  videoUrl: saved.videoUrl ?? "",
  writerYear: saved.writerYear ?? "",
});

/** Save draft beside Send, and Delete draft once it has one. */
const DraftRow = ({
  content,
  draft,
  home,
  saved,
}: {
  readonly content: DraftContent;
  readonly draft: Draft;
  readonly home: string;
  readonly saved: boolean;
}) => {
  const t = useTranslations("diwan.journal.write");
  const router = useRouter();
  const remove = useMutation({
    mutationFn: draft.discard,
    onSuccess: () => router.push(home),
  });
  // Saved as you go (decisions.md, The site: "One form flow"): a few
  // seconds after the last change, once there is a title or a word.
  const snapshot = JSON.stringify(content);
  const lastSaved = useRef(snapshot);
  const { mutate } = draft.save;
  useEffect(() => {
    if (
      snapshot === lastSaved.current ||
      !(content.title?.trim() || toPlainText(content.body ?? "").trim())
    ) {
      return;
    }
    const timer = window.setTimeout(() => {
      lastSaved.current = snapshot;
      mutate(content);
    }, AUTOSAVE_MS);
    return () => window.clearTimeout(timer);
  }, [content, mutate, snapshot]);
  let label = t("saveDraft");
  if (draft.save.isPending) {
    label = t("savingDraft");
  } else if (draft.save.isSuccess) {
    label = t("draftSaved");
  }
  return (
    <div className="border-line grid gap-2 border-t pt-4">
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
const MissingDraft = ({
  place,
  type,
}: {
  readonly place: Place;
  readonly type: journal.Category;
}) => {
  const t = useTranslations("diwan.journal.write");
  return (
    <div className="grid gap-4">
      <WriteHeading place={place} type={type} />
      <p className="type-body">{t("draftMissing")}</p>
      <Link className="link justify-self-start" href={place.home}>
        {t("back")}
      </Link>
    </div>
  );
};

/** Which call, and through which partner, when there is a call to answer. */
const CallFields = ({
  callId,
  onCall,
  onPartner,
  pathway,
}: {
  readonly callId: string | undefined;
  readonly onCall: (id: string) => void;
  readonly onPartner: (id: string) => void;
  readonly pathway: ReturnType<typeof useSubmitPathway>;
}) =>
  callId ? (
    <>
      <WhereField calls={pathway.callable} onChange={onCall} value={callId} />
      <PartnerPathway
        isMember={pathway.isMember}
        onChange={onPartner}
        pathways={pathway.callPathways}
        value={pathway.throughPartner}
      />
    </>
  ) : null;

/** The themed call before the general submissions (decisions.md, Qirtas). */
const themedFirst = (a: { kind: string }, b: { kind: string }) =>
  Number(a.kind !== "themed") - Number(b.kind !== "themed");

/**
 * Which call the work answers: the form asks, with the open themed call
 * first; under an Edition, that Edition's call is chosen to begin with.
 */
const useWriteCall = (
  desk: journal.Desk,
  initial: { readonly callId: string; readonly partnerId: string },
  edition: string | undefined
) => {
  const { supabase } = useAuth();
  const calls = useOpenCalls();
  const ofEdition = useQuery({
    enabled: Boolean(edition),
    queryFn: () => journal.callsWithEditions(supabase, edition),
    queryKey: ["journal", "edition-calls", edition],
  });
  const open = (calls.data ?? [])
    .filter((c) => c.desks.includes(desk))
    .sort(themedFirst);
  const [callId, setCallId] = useState(initial.callId);
  const [partnerId, setPartnerId] = useState(initial.partnerId);
  const pathway = useSubmitPathway(open, callId, partnerId);
  const mine = new Set((ofEdition.data ?? []).map((c) => c.id));
  const call =
    pathway.callable.find((c) => c.id === callId) ??
    pathway.callable.find((c) => mine.has(c.id)) ??
    pathway.callable[0];
  return {
    call,
    loading:
      !calls.data ||
      pathway.pending ||
      (Boolean(edition) && ofEdition.isPending),
    pathway,
    // Voices takes letters and op-eds to no call, by name (decisions.md,
    // Qirtas); everything else answers an open call.
    sendable: desk === "voices" || Boolean(call),
    setCallId,
    setPartnerId,
  };
};

const WriteHeading = ({
  place,
  type,
}: {
  readonly place: Place;
  readonly type: journal.Category;
}) => {
  const t = useTranslations("diwan.journal.write");
  const tj = useTranslations("diwan.admin.journal");
  const desk = journal.deskOf(type);
  return (
    <AdminHeading
      actions={
        <Link
          className="text-sm underline underline-offset-4"
          href={place.home}
        >
          {t("back")}
        </Link>
      }
      title={tj(`categories.${type}`)}
    >
      {t(`lead.${desk === "voices" || desk === "video" ? desk : "blind"}`, {
        section: tj(`desks.${desk}`),
      })}
    </AdminHeading>
  );
};

// ── Video and Voices ────────────────────────────────────────────────────────

/**
 * The byline: a pen name for Edition work; Voices runs under the writer's
 * own name, and an op-ed ends with its line about the writer.
 */
const BylineFields = ({
  aboutWriter,
  onAboutWriter,
  onPenName,
  onWriterYear,
  penName,
  type,
  writerYear,
}: {
  readonly aboutWriter: string;
  readonly onAboutWriter: (value: string) => void;
  readonly onPenName: (value: string) => void;
  readonly onWriterYear: (value: string) => void;
  readonly penName: string;
  readonly type: journal.Category;
  readonly writerYear: string;
}) => {
  const t = useTranslations("diwan.journal.write.voices");
  if (journal.deskOf(type) !== "voices") {
    return <PenNameField onChange={onPenName} value={penName} />;
  }
  return (
    <>
      {type === "opinion_essay" ? (
        <IdentityFields
          line={aboutWriter}
          onLine={onAboutWriter}
          onYear={onWriterYear}
          year={writerYear}
        />
      ) : null}
      <p className="type-caption">{t("ownName")}</p>
    </>
  );
};

/** How many a call takes from one person, and the hourly limit. */
const LimitsLine = ({ max }: { readonly max: number | undefined }) => {
  const t = useTranslations("diwan.journal.write");
  if (max === undefined) {
    return null;
  }
  return (
    <p className="type-caption">
      {t("limits", {
        hour: formatNumber(journal.MAX_SUBMISSIONS_PER_HOUR),
        max: formatNumber(max),
      })}
    </p>
  );
};

/** A film's length and its two declarations (decisions.md, Qirtas). */
interface Film {
  readonly captions: boolean;
  readonly minutes: string;
  readonly release: boolean;
}

const FilmFields = ({
  onChange,
  shown,
  value,
}: {
  readonly onChange: (value: Film) => void;
  readonly shown: boolean;
  readonly value: Film;
}) => {
  const t = useTranslations("diwan.journal.write.film");
  if (!shown) {
    return null;
  }
  return (
    <fieldset className="grid gap-4">
      <legend className="mb-2 font-medium">{t("title")}</legend>
      <Field
        hint={t("minutesHint", {
          max: formatNumber(journal.MAX_FILM_MINUTES),
        })}
        label={t("minutes")}
      >
        {(id) => (
          <Input
            className="max-w-32"
            id={id}
            inputMode="numeric"
            max={journal.MAX_FILM_MINUTES}
            min={1}
            onChange={(e) => onChange({ ...value, minutes: e.target.value })}
            required
            type="number"
            value={value.minutes}
          />
        )}
      </Field>
      <label className="flex items-start gap-3">
        <input
          checked={value.captions}
          className="mt-1"
          onChange={(e) => onChange({ ...value, captions: e.target.checked })}
          type="checkbox"
        />
        <span className="type-body">{t("captions")}</span>
      </label>
      <label className="flex items-start gap-3">
        <input
          checked={value.release}
          className="mt-1"
          onChange={(e) => onChange({ ...value, release: e.target.checked })}
          type="checkbox"
        />
        <span className="type-body">{t("release")}</span>
      </label>
    </fieldset>
  );
};

/** The words so far against the limit: 300 for a letter, 600–800 an op-ed. */
const WordsLine = ({
  body,
  type,
}: {
  readonly body: string;
  readonly type: journal.Category;
}) => {
  const t = useTranslations("diwan.journal.write.voices");
  const limits =
    journal.VOICES_WORDS[type as keyof typeof journal.VOICES_WORDS];
  if (!limits) {
    return null;
  }
  const n = journal.wordCount(body);
  return (
    <p aria-live="polite" className="type-caption">
      {type === "letter_to_editor"
        ? t("letterWords", {
            max: formatNumber(limits.max),
            n: formatNumber(n),
          })
        : t("opEdWords", {
            max: formatNumber(limits.max),
            min: formatNumber(limits.min),
            n: formatNumber(n),
          })}
    </p>
  );
};

/**
 * An op-ed's identity line (decisions.md, Qirtas), built from the writer's
 * class and the one line they give: a student gives their year and what
 * they study ("is a junior studying business at AUIB"); anyone else, the
 * line after their name. The line as it will run shows under the fields.
 */
const IdentityFields = ({
  line,
  onLine,
  onYear,
  year,
}: {
  readonly line: string;
  readonly onLine: (value: string) => void;
  readonly onYear: (value: string) => void;
  readonly year: string;
}) => {
  const t = useTranslations("diwan.journal.write.voices");
  const ti = useTranslations("diwan.journal.write.voices.identity");
  const locale = useLocale() as Locale;
  const status = useMemberStatus();
  const profile = useProfile();
  // A student is a Member; Associates (faculty, staff, alumni) and
  // Honorary Members write the line after their name (decisions.md, Members).
  const student = status.data?.tier === "member";
  const name = profile.data ? localized(profile.data, "full_name", locale) : "";
  const built = journal.identityLine(ti, {
    feminine: profile.data?.title_form === "feminine",
    line,
    name,
    student,
    year,
  });
  return (
    <fieldset className="grid gap-4">
      <legend className="type-label mb-2">{t("about")}</legend>
      {student ? (
        <Field label={ti("year")}>
          {(id) => (
            <SelectInput
              id={id}
              onChange={(e) => onYear(e.target.value)}
              value={year}
            >
              <option value="" />
              {journal.WRITER_YEARS.map((y) => (
                <option key={y} value={y}>
                  {ti(`years.${y}`)}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
      ) : null}
      <Field
        hint={student ? ti("subjectHint") : ti("lineHint")}
        label={student ? ti("subject") : ti("line")}
      >
        {(id) => (
          <Input
            id={id}
            maxLength={160}
            onChange={(e) => onLine(e.target.value)}
            required
            value={line}
          />
        )}
      </Field>
      {built ? (
        <p className="type-caption">{ti("preview", { line: built })}</p>
      ) : null}
    </fieldset>
  );
};
