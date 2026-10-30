"use client";

import { useAuth } from "@repo/auth/provider";
import type { Json } from "@repo/database";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import type { Locale } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { localized, unwrap } from "@repo/sal-data";
import {
  buildWordSearch,
  type Crossword,
  crosswordCells,
  type GameLang,
  layoutCrossword,
  MAX_GRID,
  type PuzzleKind,
  parsePuzzle,
  puzzleKinds,
  type WordSearch,
} from "@repo/sal-data/games";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Link, useRouter } from "@/lib/nexus/navigation";
import { useQueryParam } from "@/lib/nexus/use-query-param";
import { ErrorState, SectionSpinner } from "../../states";
import { slugify } from "../events/editor";
import {
  AdminHeading,
  BilingualField,
  type Column,
  ConfirmAction,
  DataTable,
  ErrorLine,
  Field,
  SelectInput,
} from "../kit";

const key = ["admin", "journal", "puzzles"];
const buttonLink =
  "inline-flex h-8 items-center justify-self-start rounded-md bg-primary px-3 text-primary-foreground text-sm";

interface Item {
  answer: string;
  clue: string;
}

// What the editor typed is kept next to the grid (`source`), so a draft
// reopens with every answer, even ones the layout left out.
interface Draft {
  backward: boolean;
  id: string | null;
  items: Item[];
  kind: PuzzleKind;
  language: GameLang;
  note: { ar: string; en: string };
  published: boolean;
  seed: number;
  size: number;
  slug: string;
  title: { ar: string; en: string };
  words: string;
}

const blank: Draft = {
  backward: false,
  id: null,
  items: [
    { answer: "", clue: "" },
    { answer: "", clue: "" },
    { answer: "", clue: "" },
  ],
  kind: "crossword",
  language: "en",
  note: { ar: "", en: "" },
  published: false,
  seed: 1,
  size: 10,
  slug: "",
  title: { ar: "", en: "" },
  words: "",
};

/** The grid the current draft makes, and what did not fit. */
const arrange = (draft: Draft) => {
  // The layout changes only when the editor asks for another one.
  const seed = `${draft.kind}-${draft.seed}`;
  if (draft.kind === "crossword") {
    const items = draft.items.filter((i) => i.answer.trim() && i.clue.trim());
    const { crossword, unplaced } = layoutCrossword({
      items,
      lang: draft.language,
      seed,
    });
    return { data: crossword, left: unplaced };
  }
  const words = draft.words
    .split("\n")
    .map((w) => w.trim())
    .filter(Boolean);
  const { skipped, ...search } = buildWordSearch({
    backward: draft.backward,
    lang: draft.language,
    seed,
    size: draft.size,
    words,
  });
  return { data: search, left: skipped };
};

const fromRow = (row: {
  data: unknown;
  id: string;
  kind: string;
  language: string;
  note_ar: string | null;
  note_en: string | null;
  slug: string;
  status: string;
  title_ar: string;
  title_en: string;
}): Draft => {
  const data = (row.data ?? {}) as {
    backward?: boolean;
    entries?: Item[];
    seed?: number;
    size?: number;
    source?: { items?: Item[]; words?: string[] };
    words?: { label: string }[];
  };
  const kind = row.kind as PuzzleKind;
  return {
    ...blank,
    backward: data.backward ?? false,
    id: row.id,
    items:
      data.source?.items ??
      data.entries?.map((e) => ({ answer: e.answer, clue: e.clue })) ??
      blank.items,
    kind,
    language: row.language as GameLang,
    note: { ar: row.note_ar ?? "", en: row.note_en ?? "" },
    published: row.status === "published",
    seed: data.seed ?? 1,
    size: data.size ?? 10,
    slug: row.slug,
    title: { ar: row.title_ar, en: row.title_en },
    words: (data.source?.words ?? data.words?.map((w) => w.label) ?? []).join(
      "\n"
    ),
  };
};

// ── The list ────────────────────────────────────────────────────────────────

/** Administration → Waraq → Games: the editors' puzzles. */
export const Puzzles = () => {
  const t = useTranslations("nexus.admin.waraq.games");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const puzzles = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("journal")
          .from("puzzles")
          .select(
            "id, slug, kind, language, title_en, title_ar, status, published_at, made_with_ai"
          )
          .order("created_at", { ascending: false })
      ) ?? [],
    queryKey: key,
  });
  type Row = NonNullable<typeof puzzles.data>[number];
  const columns: Column<Row>[] = [
    {
      cell: (p) => (
        <Link className="link" href={`/qirtas/games/${p.id}`}>
          {localized(p, "title", locale) || t("untitled")}
        </Link>
      ),
      header: t("fields.title"),
      key: "title",
    },
    {
      cell: (p) => t(`kinds.${p.kind as PuzzleKind}`),
      header: t("fields.kind"),
      key: "kind",
    },
    {
      cell: (p) => t(`languages.${p.language as GameLang}`),
      header: t("fields.language"),
      key: "language",
    },
    {
      cell: (p) =>
        p.status === "published" && p.published_at
          ? t("publishedOn", { date: formatLongDate(p.published_at, locale) })
          : t("draft"),
      header: t("fields.status"),
      key: "status",
    },
  ];
  return (
    <div className="grid gap-4">
      <p className="type-caption">{t("lede")}</p>
      <Link className={buttonLink} href="/qirtas/games/new">
        {t("new")}
      </Link>
      {puzzles.data ? (
        <DataTable
          columns={columns}
          empty={t("none")}
          rowKey={(p) => p.id}
          rows={puzzles.data}
        />
      ) : (
        <SectionSpinner />
      )}
    </div>
  );
};

// ── The editor ──────────────────────────────────────────────────────────────

const Preview = ({
  data,
  lang,
}: {
  data: Crossword | WordSearch | null;
  lang: GameLang;
}) => {
  if (!data) {
    return null;
  }
  const rows =
    "entries" in data
      ? (crosswordCells(data) ?? []).map((line) =>
          line.map((c) => c?.letter ?? null)
        )
      : data.grid;
  const cols = rows[0]?.length ?? 0;
  return (
    <div
      aria-hidden
      className="grid w-full max-w-md gap-px border border-text bg-text"
      dir={lang === "ar" ? "rtl" : "ltr"}
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {rows.flatMap((line, r) =>
        line.map((letter, c) => (
          <span
            className={
              letter === null
                ? "aspect-square bg-text"
                : "grid aspect-square place-items-center bg-surface font-medium text-xs sm:text-sm"
            }
            // biome-ignore lint/suspicious/noArrayIndexKey: squares are positions
            key={`${r}-${c}`}
          >
            {letter}
          </span>
        ))
      )}
    </div>
  );
};

const PuzzleForm = ({ initial }: { initial: Draft }) => {
  const t = useTranslations("nexus.admin.waraq.games");
  const tc = useTranslations("common");
  const { supabase } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(initial);
  const [saved, setSaved] = useState(false);
  const { data, left } = arrange(draft);
  const valid = data ? parsePuzzle(draft.kind, data) !== null : false;
  const titled = Boolean(draft.title.en.trim() || draft.title.ar.trim());

  const set = (patch: Partial<Draft>) => {
    setSaved(false);
    setDraft((d) => ({ ...d, ...patch }));
  };

  const save = useMutation({
    mutationFn: async (publish: boolean) => {
      const slug =
        draft.slug ||
        slugify(draft.title.en) ||
        `puzzle-${Date.now().toString(36)}`;
      const row = {
        data: {
          ...(data ?? {}),
          backward: draft.backward,
          seed: draft.seed,
          source:
            draft.kind === "crossword"
              ? { items: draft.items }
              : { words: draft.words.split("\n").filter((w) => w.trim()) },
        } as unknown as NonNullable<Json>,
        kind: draft.kind,
        language: draft.language,
        note_ar: draft.note.ar.trim() || null,
        note_en: draft.note.en.trim() || null,
        published_at: publish ? new Date().toISOString() : null,
        slug,
        status: publish ? "published" : "draft",
        title_ar: draft.title.ar.trim(),
        title_en: draft.title.en.trim(),
      };
      const table = supabase.schema("journal").from("puzzles");
      if (draft.id) {
        unwrap(await table.update(row).eq("id", draft.id));
        return draft.id;
      }
      const created = unwrap(await table.insert(row).select("id").single());
      return created?.id ?? null;
    },
    onSuccess: async (id, publish) => {
      if (!id) {
        return;
      }
      setDraft((d) => ({ ...d, id, published: publish }));
      setSaved(true);
      await queryClient.invalidateQueries({ queryKey: key });
      if (!draft.id) {
        router.replace(`/qirtas/games/${id}`);
      }
    },
  });

  const remove = useMutation({
    mutationFn: async () => {
      if (draft.id) {
        unwrap(
          await supabase
            .schema("journal")
            .from("puzzles")
            .delete()
            .eq("id", draft.id)
        );
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: key });
      router.push("/qirtas");
    },
  });

  return (
    <form
      className="grid gap-8"
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate(draft.published);
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("fields.kind")}>
          {(id) => (
            <SelectInput
              disabled={draft.id !== null}
              id={id}
              onChange={(e) => set({ kind: e.target.value as PuzzleKind })}
              value={draft.kind}
            >
              {puzzleKinds.map((k) => (
                <option key={k} value={k}>
                  {t(`kinds.${k}`)}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
        <Field hint={t("languageHint")} label={t("fields.language")}>
          {(id) => (
            <SelectInput
              id={id}
              onChange={(e) => set({ language: e.target.value as GameLang })}
              value={draft.language}
            >
              <option value="en">{t("languages.en")}</option>
              <option value="ar">{t("languages.ar")}</option>
            </SelectInput>
          )}
        </Field>
      </div>
      <BilingualField
        label={t("fields.title")}
        maxLength={120}
        onChange={(title) => set({ title })}
        value={draft.title}
      />
      <BilingualField
        label={t("fields.note")}
        maxLength={500}
        multiline
        onChange={(note) => set({ note })}
        rows={2}
        value={draft.note}
      />
      <Field hint={t("slugHint")} label={t("fields.slug")}>
        {(id) => (
          <Input
            dir="ltr"
            id={id}
            maxLength={80}
            onChange={(e) => set({ slug: slugify(e.target.value) })}
            placeholder={slugify(draft.title.en)}
            value={draft.slug}
          />
        )}
      </Field>

      {draft.kind === "crossword" ? (
        <fieldset className="grid gap-3">
          <legend className="mb-2 font-medium text-sm">{t("clues")}</legend>
          <p className="type-caption">{t("cluesHint")}</p>
          {draft.items.map((item, i) => (
            <div
              className="grid gap-2 sm:grid-cols-[12rem_1fr_auto]"
              // biome-ignore lint/suspicious/noArrayIndexKey: rows are edited in place
              key={i}
            >
              <Input
                aria-label={t("answerN", { number: String(i + 1) })}
                dir={draft.language === "ar" ? "rtl" : "ltr"}
                maxLength={MAX_GRID}
                onChange={(e) =>
                  set({
                    items: draft.items.map((x, j) =>
                      j === i ? { ...x, answer: e.target.value } : x
                    ),
                  })
                }
                placeholder={t("answer")}
                value={item.answer}
              />
              <Input
                aria-label={t("clueN", { number: String(i + 1) })}
                dir={draft.language === "ar" ? "rtl" : "ltr"}
                maxLength={200}
                onChange={(e) =>
                  set({
                    items: draft.items.map((x, j) =>
                      j === i ? { ...x, clue: e.target.value } : x
                    ),
                  })
                }
                placeholder={t("clue")}
                value={item.clue}
              />
              <Button
                aria-label={t("removeN", { number: String(i + 1) })}
                onClick={() =>
                  set({ items: draft.items.filter((_, j) => j !== i) })
                }
                size="sm"
                type="button"
                variant="ghost"
              >
                {t("remove")}
              </Button>
            </div>
          ))}
          <Button
            className="justify-self-start"
            disabled={draft.items.length >= 40}
            onClick={() =>
              set({ items: [...draft.items, { answer: "", clue: "" }] })
            }
            size="sm"
            type="button"
            variant="outline"
          >
            {t("addClue")}
          </Button>
        </fieldset>
      ) : (
        <div className="grid gap-4">
          <Field hint={t("wordsHint")} label={t("words")}>
            {(id) => (
              <Textarea
                dir={draft.language === "ar" ? "rtl" : "ltr"}
                id={id}
                onChange={(e) => set({ words: e.target.value })}
                rows={8}
                value={draft.words}
              />
            )}
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("size")}>
              {(id) => (
                <SelectInput
                  id={id}
                  onChange={(e) => set({ size: Number(e.target.value) })}
                  value={draft.size}
                >
                  {Array.from({ length: MAX_GRID - 5 }, (_, i) => i + 6).map(
                    (n) => (
                      <option key={n} value={n}>
                        {t("sizeN", { size: String(n) })}
                      </option>
                    )
                  )}
                </SelectInput>
              )}
            </Field>
            <label className="flex items-center gap-2 self-end text-sm">
              <input
                checked={draft.backward}
                onChange={(e) => set({ backward: e.target.checked })}
                type="checkbox"
              />
              {t("backward")}
            </label>
          </div>
        </div>
      )}

      <section className="grid gap-3">
        <h2 className="font-medium text-sm">{t("preview")}</h2>
        <Preview data={data} lang={draft.language} />
        {left.length > 0 ? (
          <p className="text-sm text-text" role="alert">
            {t("left", { words: left.join("، ") })}
          </p>
        ) : null}
        {valid ? null : <p className="type-caption">{t("needsMore")}</p>}
        <Button
          className="justify-self-start"
          onClick={() => set({ seed: draft.seed + 1 })}
          size="sm"
          type="button"
          variant="outline"
        >
          {t("shuffle")}
        </Button>
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          disabled={save.isPending || !titled || (draft.published && !valid)}
          type="submit"
          variant="outline"
        >
          {draft.published ? t("saveChanges") : t("saveDraft")}
        </Button>
        {draft.published ? (
          <Button
            disabled={save.isPending}
            onClick={() => save.mutate(false)}
            type="button"
            variant="outline"
          >
            {t("unpublish")}
          </Button>
        ) : (
          <Button
            disabled={save.isPending || !valid || !titled}
            onClick={() => save.mutate(true)}
            type="button"
          >
            {t("publish")}
          </Button>
        )}
        {draft.id ? (
          <ConfirmAction
            confirmLabel={t("delete")}
            description={t("deleteConfirm")}
            disabled={remove.isPending}
            onConfirm={() => remove.mutate()}
          >
            {t("delete")}
          </ConfirmAction>
        ) : null}
        {saved ? (
          <span className="text-sm" role="status">
            {draft.published ? t("published") : tc("saved")}
          </span>
        ) : null}
      </div>
      <ErrorLine error={save.error ?? remove.error} />
    </form>
  );
};

/** /admin/journal/puzzle?id=…: a crossword or word search; no id, a new one. */
export const PuzzleEditor = () => {
  const t = useTranslations("nexus.admin.waraq.games");
  const tk = useTranslations("nexus.admin.kit");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const id = useQueryParam("id");
  const record = useQuery({
    enabled: id !== null,
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("journal")
          .from("puzzles")
          .select(
            "id, slug, kind, language, title_en, title_ar, note_en, note_ar, data, status"
          )
          .eq("id", id ?? "")
          .maybeSingle()
      ),
    queryKey: [...key, id],
  });
  const [initial, setInitial] = useState<Draft | null>(id ? null : blank);
  useEffect(() => {
    if (!id) {
      setInitial(blank);
    } else if (record.data) {
      setInitial(fromRow(record.data));
    }
  }, [id, record.data]);

  const back = (
    <Link className="text-sm underline underline-offset-4" href="/qirtas">
      {tk("back")}
    </Link>
  );

  if (id && record.isPending) {
    return <SectionSpinner />;
  }
  if (id && record.isError) {
    return <ErrorState onRetry={() => record.refetch()} />;
  }
  if (id && !record.data) {
    return <p className="type-body text-text-secondary">{t("notFound")}</p>;
  }
  if (!initial) {
    return <SectionSpinner />;
  }
  const title =
    (record.data && localized(record.data, "title", locale)) ||
    (id ? t("untitled") : t("new"));
  return (
    <div className="grid gap-8">
      <AdminHeading actions={back} title={title}>
        {t("editorLede")}
      </AdminHeading>
      <PuzzleForm initial={initial} key={initial.id ?? "new"} />
    </div>
  );
};
