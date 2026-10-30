"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { Link, useRouter } from "@repo/internationalization/navigation";
import { journal, toPlainText } from "@repo/sal-data";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { type FormEvent, useState } from "react";
import { queryKeys } from "@/lib/nexus/queries";
import { AdminHeading, ErrorLine, Field, SelectInput } from "../admin/kit";
import { RichTextEditor } from "../editor/rich-text";
import {
  attachFile,
  FilePicker,
  kindsFor,
  type PendingFile,
  PendingList,
} from "./files";
import { AuthorshipPledge, Declarations } from "./form";

/** The desks that are always open: no call, edited by name. */
export const NAMED_DESKS = journal.newsroomDesks;
export type NamedDesk = (typeof NAMED_DESKS)[number];

export const isNamedDesk = (value: string | null): value is NamedDesk =>
  (NAMED_DESKS as readonly string[]).includes(value ?? "");

const LANGUAGES = ["en", "ar", "bilingual"] as const;

/**
 * Work for the newsroom (News, Voices, Video, Games): a story or pitch for
 * the News Editor, a video link for Video, a review, column or letter for
 * Voices, a puzzle for Games. Bylines are real names (no pen names here).
 */
export const SendToDesk = ({
  desk,
  initial,
}: {
  desk: NamedDesk;
  /** The type the member chose on Write for Qirtas. */
  initial?: journal.Category;
}) => {
  const t = useTranslations("nexus.waraq.send");
  const tj = useTranslations("nexus.admin.journal");
  const router = useRouter();
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  const types = journal.sendableCategories(desk);
  const [category, setCategory] = useState<journal.Category>(
    initial && types.includes(initial) ? initial : (types[0] ?? "report")
  );
  const [language, setLanguage] = useState<(typeof LANGUAGES)[number]>("en");
  const [title, setTitle] = useState("");
  const [deck, setDeck] = useState("");
  const [body, setBody] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [pledged, setPledged] = useState(false);
  const [firstPublication, setFirstPublication] = useState(false);
  const kinds = kindsFor(category);
  const needs = journal.typeNeeds(category);

  const input = {
    body_html: body || undefined,
    category,
    cover_note: note.trim() || undefined,
    deck: deck.trim() || undefined,
    first_publication_confirmed: desk === "news" ? undefined : firstPublication,
    human_authorship_confirmed: true as const,
    language,
    title: title.trim(),
    video_url: videoUrl.trim() || undefined,
  };
  const valid =
    journal.submissionSchema.safeParse(input).success &&
    pledged &&
    (needs.video ||
      Boolean(toPlainText(body).trim()) ||
      files.some((f) => kinds.includes(f.kind)));

  const send = useMutation({
    mutationFn: async () => {
      const created = await journal.createSubmission(supabase, input);
      if (!created) {
        throw new Error("not_created");
      }
      await Promise.all(
        files
          .filter((f) => kinds.includes(f.kind))
          .map((f) => attachFile(supabase, created.id, f))
      );
      return created.id;
    },
    onSuccess: async (id) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.submissions(user?.id ?? ""),
      });
      router.push(`/membership/work/submissions/${id}`);
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    send.mutate();
  };
  return (
    <div className="grid gap-8">
      <AdminHeading
        actions={
          <Link
            className="text-sm underline underline-offset-4"
            href="/qirtas/write"
          >
            {t("back")}
          </Link>
        }
        title={t(`title.${desk}`)}
      >
        {t(`lede.${desk}`)}
      </AdminHeading>
      <form className="grid max-w-3xl gap-6" onSubmit={submit}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("type")}>
            {(id) => (
              <SelectInput
                id={id}
                onChange={(e) =>
                  setCategory(e.target.value as journal.Category)
                }
                value={category}
              >
                {types.map((c) => (
                  <option key={c} value={c}>
                    {tj(`categories.${c}`)}
                  </option>
                ))}
              </SelectInput>
            )}
          </Field>
          <Field label={t("language")}>
            {(id) => (
              <SelectInput
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
        </div>
        <Field label={t("headline")}>
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
        {desk === "news" ? (
          <Field hint={t("deckHint")} label={t("deck")}>
            {(id) => (
              <Textarea
                id={id}
                maxLength={400}
                onChange={(e) => setDeck(e.target.value)}
                rows={2}
                value={deck}
              />
            )}
          </Field>
        ) : null}
        {needs.video ? (
          <Field hint={t("videoHint")} label={t("video")}>
            {(id) => (
              <Input
                dir="ltr"
                id={id}
                inputMode="url"
                maxLength={500}
                onChange={(e) => setVideoUrl(e.target.value)}
                required
                type="url"
                value={videoUrl}
              />
            )}
          </Field>
        ) : null}
        <RichTextEditor
          label={needs.video ? t("summary") : t("body")}
          lang={language === "ar" ? "ar" : "en"}
          onChange={setBody}
          value={body}
        />
        <p className="type-caption">{t(`standards.${desk}`)}</p>
        {needs.video ? null : (
          <fieldset className="grid gap-3">
            <legend className="mb-2 font-medium">{t("files")}</legend>
            <FilePicker
              kinds={kinds}
              onAdd={(added) => setFiles((current) => [...current, ...added])}
            />
            <PendingList
              files={files}
              onRemove={(index) =>
                setFiles((current) => current.filter((_, i) => i !== index))
              }
            />
          </fieldset>
        )}
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
        {desk === "news" ? null : (
          <Declarations
            category={category}
            consent={false}
            firstPublication={firstPublication}
            onConsent={() => undefined}
            onFirstPublication={setFirstPublication}
          />
        )}
        <AuthorshipPledge checked={pledged} onChange={setPledged} />
        <Button
          className="justify-self-start"
          disabled={!valid || send.isPending}
          type="submit"
        >
          {send.isPending ? t("sending") : t("send")}
        </Button>
        <ErrorLine error={send.error} />
      </form>
    </div>
  );
};
