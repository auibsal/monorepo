"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import type { Locale } from "@repo/internationalization";
import {
  formatLongDate,
  formatNumber,
} from "@repo/internationalization/format";
import { Link, useRouter } from "@repo/internationalization/navigation";
import { journal, localized, toPlainText } from "@repo/sal-data";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, type ReactNode, useState } from "react";
import { manuscriptHtml } from "@/lib/manuscript";
import { queryKeys, useOpenCalls } from "@/lib/nexus/queries";
import { AdminHeading, ErrorLine, Field, SelectInput } from "../admin/kit";
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

/** The types a member may send, in section order. */
/**
 * /qirtas/write (owner, Oct 31, 2026): one door. Every section takes work
 * all year, and everything sent is read blind before an editor takes it
 * up with the author. Letters and Gallery work may also answer an open
 * call for the printed Edition.
 */
export const WriteHome = () => {
  const tw = useTranslations("nexus.journal.write");
  const tj = useTranslations("nexus.admin.journal");
  const locale = useLocale() as Locale;
  const calls = useOpenCalls();
  const editionCalls = (calls.data ?? []).filter((c) => c.issue_id);

  return (
    <div className="grid gap-8">
      <AdminHeading title={tw("title")}>{tw("lede")}</AdminHeading>
      {/* Private work lives here alone, as drafts (owner, Oct 31, 2026):
          what the member sent and what is edited with them. Their author
          page shows only what is published. */}
      <YourWork />
      <DiwanSection id="sections" title={tw("sectionsTitle")}>
        <ul className="grid divide-y divide-line border-line border-y">
          {journal.desks.map((desk) => (
            <li className="grid gap-3 py-5 md:grid-cols-[12rem_1fr]" key={desk}>
              <h3 className="type-heading">{tj(`desks.${desk}`)}</h3>
              <div className="grid gap-2">
                <p className="type-body">{tw(`sections.${desk}`)}</p>
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
      </DiwanSection>
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
  const t = useTranslations("nexus.journal.write");
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

/** The form for one type, at /qirtas/write/<type>. */
export const WriteType = ({ type }: { type: journal.Category }) => {
  const t = useTranslations("nexus.journal.write");
  const tf = useTranslations("nexus.journal.form");
  const tj = useTranslations("nexus.admin.journal");
  const router = useRouter();
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  const desk = journal.deskOf(type);
  const needs = journal.typeNeeds(type);
  const kinds = kindsFor(type);
  const { call, loading, pathway, setCallId, setPartnerId } =
    useWriteCall(desk);
  const [language, setLanguage] = useState<(typeof LANGUAGES)[number]>("en");
  const [title, setTitle] = useState("");
  const [deck, setDeck] = useState("");
  const [body, setBody] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [source, setSource] = useState<Source>({
    author: "",
    rights: "",
    text: "",
  });
  const [note, setNote] = useState("");
  const [penName, setPenName] = useState("");
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [pledged, setPledged] = useState(false);
  const [firstPublication, setFirstPublication] = useState(false);
  const [consent, setConsent] = useState(false);
  const [partial, setPartial] = useState<string | null>(null);

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
  const tf = useTranslations("nexus.journal.form");
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
  const tf = useTranslations("nexus.journal.form");
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
  const t = useTranslations("nexus.journal.write");
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
  const t = useTranslations("nexus.journal.write");
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
  const t = useTranslations("nexus.journal.write");
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
  const t = useTranslations("nexus.journal.write");
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
const useWriteCall = (desk: journal.Desk) => {
  const calls = useOpenCalls();
  const open = (calls.data ?? []).filter((c) => c.desks.includes(desk));
  const [callId, setCallId] = useState("");
  const [partnerId, setPartnerId] = useState("");
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
  const t = useTranslations("nexus.journal.write");
  const tj = useTranslations("nexus.admin.journal");
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
