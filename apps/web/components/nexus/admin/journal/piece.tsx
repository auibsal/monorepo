"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/design-system/components/ui/button";
import { Checkbox } from "@repo/design-system/components/ui/checkbox";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import type { Locale } from "@repo/internationalization";
import { hasPermission } from "@repo/rbac";
import { journal, localized, sanitizeRichText, unwrap } from "@repo/sal-data";
import { getMediaUrl, uploadMedia } from "@repo/storage";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useEffect, useId, useState } from "react";
import { Link, useRouter } from "@/lib/nexus/navigation";
import { useGrants } from "@/lib/nexus/queries";
import { useQueryParam } from "@/lib/nexus/use-query-param";
import { RichTextEditor } from "../../editor/rich-text";
import { ErrorState, SectionSpinner } from "../../states";
import { slugify } from "../events/editor";
import {
  AdminHeading,
  BilingualField,
  ErrorLine,
  Field,
  SaveButton,
  SelectInput,
} from "../kit";
import { useIssues } from "./admin";
import {
  Corrections,
  type PieceRecord,
  Thread,
  usePieceRecord,
  Workflow,
} from "./workflow";

const LANGUAGES = ["en", "ar", "bilingual"] as const;
const CREDIT_ROLES = [
  "reporter",
  "photographer",
  "illustrator",
  "translator",
  "author",
] as const;
type Language = (typeof LANGUAGES)[number];

const useContributors = () => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("journal")
          .from("contributors")
          .select("id, name_en, name_ar, is_pen_name")
          .order("name_en")
      ) ?? [],
    queryKey: ["admin", "journal", "contributors"],
  });
};

const back = (label: string) => (
  <Link className="text-sm underline underline-offset-4" href="/admin/journal">
    {label}
  </Link>
);

/** The desks the caller edits, for a new staff piece. */
const useMyDesks = () => {
  const grants = useGrants();
  return journal.desks.filter(
    (desk) =>
      hasPermission(grants.data, `journal.edit.${desk}`) ||
      hasPermission(grants.data, "journal.approve") ||
      hasPermission(grants.data, "journal.publish")
  );
};

// ── A new staff piece ───────────────────────────────────────────────────────

const NewPiece = () => {
  const t = useTranslations("nexus.admin.waraq");
  const tj = useTranslations("nexus.admin.journal");
  const tk = useTranslations("nexus.admin.kit");
  const locale = useLocale() as Locale;
  const router = useRouter();
  const { supabase } = useAuth();
  const desks = useMyDesks();
  const issues = useIssues();
  const contributors = useContributors();
  const [desk, setDesk] = useState<journal.Desk>(desks[0] ?? "news");
  const [category, setCategory] = useState<journal.Category>("article");
  const [language, setLanguage] = useState<Language>("en");
  const [title, setTitle] = useState({ ar: "", en: "" });
  const [contributorId, setContributorId] = useState("");
  const [issueId, setIssueId] = useState("");

  useEffect(() => {
    if (journal.deskOf(category) !== desk) {
      setCategory(journal.deskCategories(desk)[0] ?? "article");
    }
  }, [desk, category]);

  const create = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase.schema("journal").rpc("create_staff_piece", {
          category,
          contributor_id: contributorId,
          issue_id: issueId || undefined,
          language,
          title_ar: title.ar,
          title_en: title.en,
        })
      ),
    onSuccess: (id) => {
      if (id) {
        router.replace({ pathname: "/admin/journal/piece", query: { id } });
      }
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    create.mutate();
  };
  return (
    <div className="grid gap-8">
      <AdminHeading actions={back(tk("back"))} title={t("newPiece")}>
        {t("newPieceLede")}
      </AdminHeading>
      <form className="grid max-w-3xl gap-6" onSubmit={submit}>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={t("desk")}>
            {(id) => (
              <SelectInput
                id={id}
                onChange={(e) => setDesk(e.target.value as journal.Desk)}
                value={desk}
              >
                {desks.map((d) => (
                  <option key={d} value={d}>
                    {tj(`desks.${d}`)}
                  </option>
                ))}
              </SelectInput>
            )}
          </Field>
          <Field label={t("type")}>
            {(id) => (
              <SelectInput
                id={id}
                onChange={(e) =>
                  setCategory(e.target.value as journal.Category)
                }
                value={category}
              >
                {journal.deskCategories(desk).map((c) => (
                  <option key={c} value={c}>
                    {tj(`categories.${c}`)}
                  </option>
                ))}
              </SelectInput>
            )}
          </Field>
          <Field label={tj("piece.language")}>
            {(id) => (
              <SelectInput
                id={id}
                onChange={(e) => setLanguage(e.target.value as Language)}
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
        <BilingualField
          label={tj("piece.titleField")}
          maxLength={300}
          onChange={setTitle}
          value={title}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field hint={t("contributorHint")} label={tj("piece.contributor")}>
            {(id) => (
              <SelectInput
                id={id}
                onChange={(e) => setContributorId(e.target.value)}
                required
                value={contributorId}
              >
                <option value="">{t("choose")}</option>
                {contributors.data?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {localized(c, "name", locale)}
                  </option>
                ))}
              </SelectInput>
            )}
          </Field>
          <Field label={t("edition")}>
            {(id) => (
              <SelectInput
                id={id}
                onChange={(e) => setIssueId(e.target.value)}
                value={issueId}
              >
                <option value="">{t("noEdition")}</option>
                {issues.data?.map((i) => (
                  <option key={i.id} value={i.id}>
                    {localized(i, "title", locale)}
                  </option>
                ))}
              </SelectInput>
            )}
          </Field>
        </div>
        <Button
          className="justify-self-start"
          disabled={
            create.isPending ||
            !contributorId ||
            !(title.en.trim() || title.ar.trim())
          }
          type="submit"
        >
          {t("create")}
        </Button>
        <ErrorLine error={create.error} />
      </form>
    </div>
  );
};

// ── The piece ───────────────────────────────────────────────────────────────

const formFrom = (record: PieceRecord) => {
  const p = record.piece;
  return {
    body: { ar: record.body?.body_ar ?? "", en: record.body?.body_en ?? "" },
    category: (p?.category ?? "article") as journal.Category,
    contributor_id: p?.contributor_id ?? "",
    credit: { ar: p?.credit_ar ?? "", en: p?.credit_en ?? "" },
    deck: { ar: p?.deck_ar ?? "", en: p?.deck_en ?? "" },
    issue_id: p?.issue_id ?? "",
    language: (p?.language ?? "en") as Language,
    members_only: p?.members_only ?? false,
    slug: p?.slug ?? "",
    title: { ar: p?.title_ar ?? "", en: p?.title_en ?? "" },
    video_url: p?.video_url ?? "",
  };
};

const PieceForm = ({ record }: { record: PieceRecord }) => {
  const t = useTranslations("nexus.admin.waraq");
  const tj = useTranslations("nexus.admin.journal");
  const tk = useTranslations("nexus.admin.kit");
  const tc = useTranslations("nexus.admin.content");
  const locale = useLocale() as Locale;
  const id = useId();
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const issues = useIssues();
  const contributors = useContributors();
  const [form, setForm] = useState(() => formFrom(record));
  const { piece } = record;
  const desk = journal.deskOf(form.category);
  const needs = journal.typeNeeds(form.category);

  useEffect(() => {
    setForm(formFrom(record));
  }, [record]);

  const save = useMutation({
    mutationFn: async () => {
      const pieceId = piece?.id ?? "";
      unwrap(
        await supabase
          .schema("journal")
          .from("pieces")
          .update({
            category: form.category,
            contributor_id: form.contributor_id,
            credit_ar: form.credit.ar.trim() || null,
            credit_en: form.credit.en.trim() || null,
            deck_ar: form.deck.ar.trim() || null,
            deck_en: form.deck.en.trim() || null,
            issue_id: form.issue_id || null,
            language: form.language,
            members_only: form.members_only,
            slug:
              form.slug.trim() ||
              slugify(form.title.en || form.title.ar) ||
              piece?.slug ||
              "",
            title_ar: form.title.ar.trim() || null,
            title_en: form.title.en.trim() || null,
            video_url: form.video_url.trim() || null,
          })
          .eq("id", pieceId)
      );
      unwrap(
        await supabase
          .schema("journal")
          .from("piece_bodies")
          .update({
            body_ar: sanitizeRichText(form.body.ar) || null,
            body_en: sanitizeRichText(form.body.en) || null,
          })
          .eq("piece_id", pieceId)
      );
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["admin", "journal"] }),
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    save.mutate();
  };
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));
  const status = piece?.status as journal.PieceStatus | undefined;
  const approved =
    status === "author_approved" ||
    status === "approved" ||
    status === "scheduled";

  return (
    <form className="grid max-w-4xl gap-6" onSubmit={submit}>
      <h2 className="type-subheading">{t("text")}</h2>
      {approved ? (
        <p className="type-caption" role="note">
          {t("changeClearsApprovals")}
        </p>
      ) : null}
      {status === "published" ? (
        <p className="type-caption" role="note">
          {t("publishedChanges")}
        </p>
      ) : null}
      <BilingualField
        label={tj("piece.titleField")}
        maxLength={300}
        onChange={(title) => set("title", title)}
        value={form.title}
      />
      <p className="type-caption">{t("bothTitles")}</p>
      {needs.deck || desk === "news" ? (
        <BilingualField
          label={t("deck")}
          maxLength={400}
          multiline
          onChange={(deck) => set("deck", deck)}
          rows={2}
          value={form.deck}
        />
      ) : null}
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={t("type")}>
          {(fieldId) => (
            <SelectInput
              id={fieldId}
              onChange={(e) =>
                set("category", e.target.value as journal.Category)
              }
              value={form.category}
            >
              {journal.deskCategories(desk).map((c) => (
                <option key={c} value={c}>
                  {tj(`categories.${c}`)}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
        <Field label={tj("piece.language")}>
          {(fieldId) => (
            <SelectInput
              id={fieldId}
              onChange={(e) => set("language", e.target.value as Language)}
              value={form.language}
            >
              {LANGUAGES.map((l) => (
                <option key={l} value={l}>
                  {tj(`languages.${l}`)}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
        <Field label={t("edition")}>
          {(fieldId) => (
            <SelectInput
              id={fieldId}
              onChange={(e) => set("issue_id", e.target.value)}
              value={form.issue_id}
            >
              <option value="">{t("noEdition")}</option>
              {issues.data?.map((i) => (
                <option key={i.id} value={i.id}>
                  {localized(i, "title", locale)}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
        <Field label={tj("piece.contributor")}>
          {(fieldId) => (
            <SelectInput
              id={fieldId}
              onChange={(e) => set("contributor_id", e.target.value)}
              required
              value={form.contributor_id}
            >
              {contributors.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {localized(c, "name", locale)}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
        <Field hint={tk("slugHint")} label={tk("slug")}>
          {(fieldId) => (
            <Input
              dir="ltr"
              id={fieldId}
              maxLength={80}
              onChange={(e) => set("slug", e.target.value)}
              value={form.slug}
            />
          )}
        </Field>
      </div>
      <BilingualField
        label={tj("piece.credit")}
        maxLength={300}
        onChange={(credit) => set("credit", credit)}
        value={form.credit}
      />
      {needs.video ? (
        <Field hint={t("videoHint")} label={t("video")}>
          {(fieldId) => (
            <Input
              dir="ltr"
              id={fieldId}
              inputMode="url"
              maxLength={500}
              onChange={(e) => set("video_url", e.target.value)}
              type="url"
              value={form.video_url}
            />
          )}
        </Field>
      ) : null}
      {form.language === "ar" ? null : (
        <RichTextEditor
          label={desk === "gallery" ? t("statementEn") : tc("bodyEn")}
          lang="en"
          onChange={(en) => set("body", { ...form.body, en })}
          value={form.body.en}
        />
      )}
      {form.language === "en" ? null : (
        <RichTextEditor
          label={desk === "gallery" ? t("statementAr") : tc("bodyAr")}
          lang="ar"
          onChange={(ar) => set("body", { ...form.body, ar })}
          value={form.body.ar}
        />
      )}
      <p className="type-caption">{t("lineBreaks")}</p>
      <div className="flex items-start gap-3">
        <Checkbox
          checked={form.members_only}
          id={`${id}-members`}
          onCheckedChange={(v) => set("members_only", v === true)}
        />
        <Label className="leading-normal" htmlFor={`${id}-members`}>
          {tj("piece.membersOnly")}
        </Label>
      </div>
      <SaveButton pending={save.isPending} success={save.isSuccess} />
      <ErrorLine error={save.error} />
    </form>
  );
};

/** Images: gallery pieces, photo essays, comics (in panel order), photos. */
const Media = ({ record }: { record: PieceRecord }) => {
  const t = useTranslations("nexus.admin.waraq.media");
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const id = useId();
  const pieceId = record.piece?.id ?? "";
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["admin", "journal"] });
  const [captions, setCaptions] = useState<
    Record<string, { alt: { ar: string; en: string } }>
  >({});

  const upload = useMutation({
    mutationFn: async (files: File[]) => {
      const first = record.media.length;
      await Promise.all(
        files.map(async (file, index) => {
          const size = await createImageBitmap(file)
            .then((b) => ({ height: b.height, width: b.width }))
            .catch(() => ({ height: null, width: null }));
          const stored = await uploadMedia(supabase, `waraq/${pieceId}`, file);
          unwrap(
            await supabase
              .schema("journal")
              .from("piece_media")
              .insert({
                height: size.height,
                piece_id: pieceId,
                sort: first + index,
                storage_path: stored.path,
                width: size.width,
              })
          );
        })
      );
    },
    onSettled: refresh,
  });
  const update = useMutation({
    mutationFn: async (row: {
      alt_ar: string;
      alt_en: string;
      id: string;
      sort?: number;
    }) =>
      unwrap(
        await supabase
          .schema("journal")
          .from("piece_media")
          .update({
            alt_ar: row.alt_ar,
            alt_en: row.alt_en,
            ...(row.sort === undefined ? {} : { sort: row.sort }),
          })
          .eq("id", row.id)
      ),
    onSettled: refresh,
  });
  const remove = useMutation({
    mutationFn: async (mediaId: string) =>
      unwrap(
        await supabase
          .schema("journal")
          .from("piece_media")
          .delete()
          .eq("id", mediaId)
      ),
    onSettled: refresh,
  });

  return (
    <section className="grid gap-4">
      <h2 className="type-subheading">{t("title")}</h2>
      <p className="type-caption">{t("lede")}</p>
      <ol className="grid gap-4">
        {record.media.map((m, index) => {
          const alt = captions[m.id]?.alt ?? { ar: m.alt_ar, en: m.alt_en };
          return (
            <li
              className="grid gap-3 rounded-card bg-surface-tint p-3 sm:grid-cols-[10rem_1fr]"
              key={m.id}
            >
              {/* biome-ignore lint/performance/noImgElement: the Nexus serves images unoptimized (next.config.ts) */}
              <img
                alt={m.alt_en || m.alt_ar}
                className="max-h-40 rounded-card object-contain"
                height={m.height ?? undefined}
                src={getMediaUrl(supabase, m.storage_path)}
                width={m.width ?? undefined}
              />
              <div className="grid gap-2">
                <BilingualField
                  label={t("alt")}
                  maxLength={500}
                  onChange={(value) =>
                    setCaptions((c) => ({ ...c, [m.id]: { alt: value } }))
                  }
                  value={alt}
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={update.isPending}
                    onClick={() =>
                      update.mutate({
                        alt_ar: alt.ar,
                        alt_en: alt.en,
                        id: m.id,
                      })
                    }
                    size="sm"
                    variant="outline"
                  >
                    {t("saveAlt")}
                  </Button>
                  {index > 0 ? (
                    <Button
                      onClick={() =>
                        update.mutate({
                          alt_ar: m.alt_ar,
                          alt_en: m.alt_en,
                          id: m.id,
                          sort: (record.media[index - 1]?.sort ?? 0) - 1,
                        })
                      }
                      size="sm"
                      variant="ghost"
                    >
                      {t("earlier")}
                    </Button>
                  ) : null}
                  <Button
                    disabled={remove.isPending}
                    onClick={() => remove.mutate(m.id)}
                    size="sm"
                    variant="ghost"
                  >
                    {t("remove")}
                  </Button>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      <div className="grid gap-2">
        <Label htmlFor={id}>{t("add")}</Label>
        <Input
          accept="image/jpeg,image/png,image/webp"
          disabled={upload.isPending}
          id={id}
          multiple
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            if (files.length > 0) {
              upload.mutate(files);
            }
            e.target.value = "";
          }}
          type="file"
        />
        <p className="type-caption">{t("hint")}</p>
      </div>
      <ErrorLine error={upload.error ?? update.error ?? remove.error} />
    </section>
  );
};

/** Reporters, photographers, illustrators and translators on the piece. */
const Credits = ({ record }: { record: PieceRecord }) => {
  const t = useTranslations("nexus.admin.waraq.credits");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const contributors = useContributors();
  const [contributorId, setContributorId] = useState("");
  const [role, setRole] = useState<(typeof CREDIT_ROLES)[number]>("reporter");
  const pieceId = record.piece?.id ?? "";
  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["admin", "journal"] });
  const add = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase.schema("journal").from("piece_credits").insert({
          contributor_id: contributorId,
          piece_id: pieceId,
          role,
          sort: record.credits.length,
        })
      ),
    onSuccess: () => {
      setContributorId("");
      return refresh();
    },
  });
  const remove = useMutation({
    mutationFn: async (c: { contributor_id: string; role: string }) =>
      unwrap(
        await supabase
          .schema("journal")
          .from("piece_credits")
          .delete()
          .eq("piece_id", pieceId)
          .eq("contributor_id", c.contributor_id)
          .eq("role", c.role)
      ),
    onSettled: refresh,
  });
  return (
    <section className="grid gap-4">
      <h2 className="type-subheading">{t("title")}</h2>
      <ul className="grid gap-2">
        {record.credits.map((c) => (
          <li
            className="flex flex-wrap items-center gap-3"
            key={`${c.contributor_id}-${c.role}`}
          >
            <span>
              {c.contributor ? localized(c.contributor, "name", locale) : ""}
            </span>
            <span className="type-caption">
              {t(`roles.${c.role as (typeof CREDIT_ROLES)[number]}`)}
            </span>
            <Button
              disabled={remove.isPending}
              onClick={() => remove.mutate(c)}
              size="sm"
              variant="ghost"
            >
              {t("remove")}
            </Button>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-end gap-3">
        <Field label={t("person")}>
          {(id) => (
            <SelectInput
              className="w-64"
              id={id}
              onChange={(e) => setContributorId(e.target.value)}
              value={contributorId}
            >
              <option value="">{t("choose")}</option>
              {contributors.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {localized(c, "name", locale)}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
        <Field label={t("role")}>
          {(id) => (
            <SelectInput
              className="w-48"
              id={id}
              onChange={(e) =>
                setRole(e.target.value as (typeof CREDIT_ROLES)[number])
              }
              value={role}
            >
              {CREDIT_ROLES.map((r) => (
                <option key={r} value={r}>
                  {t(`roles.${r}`)}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
        <Button
          disabled={add.isPending || !contributorId}
          onClick={() => add.mutate()}
          size="sm"
        >
          {t("add")}
        </Button>
      </div>
      <ErrorLine error={add.error ?? remove.error} />
    </section>
  );
};

export const WaraqPieceEditor = () => {
  const t = useTranslations("nexus.admin.waraq");
  const tj = useTranslations("nexus.admin.journal");
  const tk = useTranslations("nexus.admin.kit");
  const locale = useLocale() as Locale;
  const pieceId = useQueryParam("id");
  const record = usePieceRecord(pieceId);

  if (!pieceId) {
    return <NewPiece />;
  }
  if (record.isPending) {
    return <SectionSpinner />;
  }
  if (record.isError) {
    return <ErrorState onRetry={() => record.refetch()} />;
  }
  const piece = record.data?.piece;
  if (!(record.data && piece)) {
    return (
      <p className="type-body text-text-secondary">{tj("piece.notFound")}</p>
    );
  }
  const category = piece.category as journal.Category;
  const needs = journal.typeNeeds(category);
  return (
    <div className="grid gap-10">
      <AdminHeading
        actions={back(tk("back"))}
        title={localized(piece, "title", locale) || t("untitled")}
      >
        {`${tj(`desks.${piece.desk as journal.Desk}`)} · ${tj(`categories.${category}`)}`}
      </AdminHeading>
      <Workflow record={record.data} />
      <PieceForm record={record.data} />
      {needs.media || piece.desk === "news" ? (
        <Media record={record.data} />
      ) : null}
      <Credits record={record.data} />
      {piece.status === "published" ? (
        <Corrections record={record.data} />
      ) : null}
      <Thread pieceId={piece.id} />
    </div>
  );
};
