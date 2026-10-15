"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/design-system/components/ui/tabs";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import type { Locale } from "@repo/internationalization";
import {
  formatLongDate,
  formatNumber,
} from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { hasPermission, hasPermissionAnywhere } from "@repo/rbac";
import { journal, localized, sanitizeRichText, unwrap } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useGrants } from "@/lib/queries";
import { SectionSpinner } from "../../states";
import { slugify } from "../events/editor";
import {
  AdminHeading,
  BilingualField,
  type Column,
  DataTable,
  ErrorLine,
  Field,
  SaveButton,
  SelectInput,
} from "../kit";
import { openSubmissionFile } from "../pipeline/data";
import { Puzzles } from "./puzzles";
import { FrontRank } from "./workflow";

const key = ["admin", "journal"];
const buttonLink =
  "inline-flex h-8 items-center justify-self-start rounded-md bg-primary px-3 text-primary-foreground text-sm";

export const useIssues = () => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("journal")
          .from("issues")
          .select(
            "id, volume, number, slug, title_en, title_ar, status, published_at, publish_at"
          )
          .order("volume", { ascending: false })
          .order("number", { ascending: false })
      ) ?? [],
    queryKey: [...key, "issues"],
  });
};

// ── Editions ────────────────────────────────────────────────────────────────

const Editions = () => {
  const t = useTranslations("nexus.admin.waraq");
  const tk = useTranslations("nexus.admin.kit");
  const locale = useLocale() as Locale;
  const issues = useIssues();
  type Row = NonNullable<typeof issues.data>[number];
  const columns: Column<Row>[] = [
    {
      cell: (i) => (
        <Link
          className="font-medium underline underline-offset-4"
          href={{ pathname: "/admin/journal/issue", query: { id: i.id } }}
        >
          {localized(i, "title", locale)}
        </Link>
      ),
      header: t("edition"),
      key: "edition",
    },
    {
      cell: (i) =>
        i.publish_at
          ? formatLongDate(i.publish_at, locale, true)
          : t("launchNotSet"),
      header: t("launch"),
      key: "launch",
    },
    {
      cell: (i) => tk(`statuses.${i.status as "draft"}`),
      header: tk("status"),
      key: "status",
    },
  ];
  return (
    <div className="grid gap-4">
      <p className="type-caption">{t("editionsLede")}</p>
      <Link className={buttonLink} href="/admin/journal/issue">
        {t("newEdition")}
      </Link>
      {issues.data ? (
        <DataTable columns={columns} rowKey={(i) => i.id} rows={issues.data} />
      ) : (
        <SectionSpinner />
      )}
    </div>
  );
};

// ── The newsroom: pieces by stage ───────────────────────────────────────────

const useDesks = () => {
  const grants = useGrants();
  const all =
    hasPermissionAnywhere(grants.data, "journal.approve") ||
    hasPermissionAnywhere(grants.data, "journal.publish") ||
    hasPermissionAnywhere(grants.data, "journal.copy");
  return journal.desks.filter(
    (desk) => all || hasPermissionAnywhere(grants.data, `journal.edit.${desk}`)
  );
};

const Newsroom = () => {
  const t = useTranslations("nexus.admin.waraq");
  const tj = useTranslations("nexus.admin.journal");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const desks = useDesks();
  const [desk, setDesk] = useState<journal.Desk | "">("");
  const [status, setStatus] = useState<journal.PieceStatus | "">("");
  const pieces = useQuery({
    queryFn: async () => {
      let query = supabase
        .schema("journal")
        .from("pieces")
        .select(
          "id, desk, category, title_en, title_ar, status, publish_at, published_at, updated_at, front_rank, contributor:contributors!pieces_contributor_id_fkey(name_en, name_ar)"
        )
        .order("updated_at", { ascending: false })
        .limit(200);
      if (desk) {
        query = query.eq("desk", desk);
      }
      if (status) {
        query = query.eq("status", status);
      }
      return unwrap(await query) ?? [];
    },
    queryKey: [...key, "pieces", desk, status],
  });
  type Row = NonNullable<typeof pieces.data>[number];
  const columns: Column<Row>[] = [
    {
      cell: (p) => (
        <Link
          className="font-medium underline underline-offset-4"
          href={{ pathname: "/admin/journal/piece", query: { id: p.id } }}
        >
          {localized(p, "title", locale) || t("untitled")}
        </Link>
      ),
      header: t("piece"),
      key: "title",
    },
    {
      cell: (p) =>
        `${tj(`desks.${p.desk as journal.Desk}`)} · ${tj(`categories.${p.category}`)}`,
      header: t("type"),
      key: "type",
    },
    {
      cell: (p) =>
        p.contributor ? localized(p.contributor, "name", locale) : "",
      header: tj("piece.contributor"),
      key: "contributor",
    },
    {
      cell: (p) => {
        const s = p.status as journal.PieceStatus;
        let when = "";
        if (s === "published" && p.published_at) {
          when = `, ${formatLongDate(p.published_at, locale, true)}`;
        } else if (s === "scheduled" && p.publish_at) {
          when = `, ${formatLongDate(p.publish_at, locale, true)}`;
        }
        const lead = p.front_rank === 1 ? ` · ${t("workflow.lead")}` : "";
        return `${t(`statuses.${s}`)}${when}${lead}`;
      },
      header: t("stage"),
      key: "status",
    },
  ];
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end gap-4">
        <Field label={t("desk")}>
          {(id) => (
            <SelectInput
              className="w-48"
              id={id}
              onChange={(e) => setDesk(e.target.value as journal.Desk | "")}
              value={desk}
            >
              <option value="">{t("allDesks")}</option>
              {desks.map((d) => (
                <option key={d} value={d}>
                  {tj(`desks.${d}`)}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
        <Field label={t("stage")}>
          {(id) => (
            <SelectInput
              className="w-48"
              id={id}
              onChange={(e) =>
                setStatus(e.target.value as journal.PieceStatus | "")
              }
              value={status}
            >
              <option value="">{t("allStages")}</option>
              {journal.pieceStatuses.map((s) => (
                <option key={s} value={s}>
                  {t(`statuses.${s}`)}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
        <Link className={buttonLink} href="/admin/journal/piece">
          {t("newPiece")}
        </Link>
      </div>
      {pieces.data ? (
        <DataTable
          columns={columns}
          empty={t("noPieces")}
          rowKey={(p) => p.id}
          rows={pieces.data}
        />
      ) : (
        <SectionSpinner />
      )}
    </div>
  );
};

// ── The desks: named work (News, Video, Voices) ─────────────────────────────

type QueueRow = Awaited<ReturnType<typeof journal.deskQueue>>[number];

/** The work as sent, for the desk editor to read before deciding. */
const QueueWork = ({ item }: { item: QueueRow }) => {
  const t = useTranslations("nexus.admin.waraq.queue");
  const { supabase } = useAuth();
  const files = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("journal")
          .from("submission_files")
          .select("id, kind")
          .eq("submission_id", item.submission_id)
          .order("created_at")
      ) ?? [],
    queryKey: [...key, "queue-files", item.submission_id],
  });
  const work = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("journal")
          .from("submissions")
          .select("body_html, cover_note, video_url")
          .eq("id", item.submission_id)
          .maybeSingle()
      ),
    queryKey: [...key, "queue", item.submission_id],
  });
  if (!work.data) {
    return <SectionSpinner />;
  }
  return (
    <div className="grid gap-3">
      {work.data.video_url ? (
        <a
          className="break-all underline underline-offset-4"
          dir="ltr"
          href={work.data.video_url}
          rel="noopener noreferrer"
          target="_blank"
        >
          {work.data.video_url}
        </a>
      ) : null}
      {work.data.body_html ? (
        <div
          className="prose max-w-none"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized with the one rich-text policy
          dangerouslySetInnerHTML={{
            __html: sanitizeRichText(work.data.body_html),
          }}
          lang={item.language === "ar" ? "ar" : "en"}
        />
      ) : null}
      {work.data.cover_note ? (
        <p className="type-caption whitespace-pre-wrap">
          {work.data.cover_note}
        </p>
      ) : null}
      {(files.data ?? []).length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {files.data?.map((f, index) => (
            <li key={f.id}>
              <Button
                onClick={() => openSubmissionFile(supabase, f.id)}
                size="sm"
                variant="outline"
              >
                {t("openFile", { number: formatNumber(index + 1) })}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};

/** Intake, review and the decision, by name. */
const QueueActions = ({ item }: { item: QueueRow }) => {
  const t = useTranslations("nexus.admin.waraq.queue");
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");
  const act = useMutation({
    mutationFn: async (run: () => PromiseLike<{ error: unknown }>) => {
      const { error } = await run();
      if (error) {
        throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });
  const j = supabase.schema("journal");
  const id = item.submission_id;
  const move = (to: journal.SubmissionStatus) =>
    act.mutate(() => j.rpc("transition_submission", { id, to_status: to }));
  const decide = (decision: "accept" | "accept_with_edits" | "decline") =>
    act.mutate(() =>
      j.rpc("decide_named", {
        decision,
        notes: note.trim() || undefined,
        submission_id: id,
      })
    );
  const askFix = () =>
    act.mutate(() =>
      j.rpc("return_for_formatting", { note: note.trim(), submission_id: id })
    );
  const reviewing = item.status === "in_review" || item.status === "selection";
  const busy = act.isPending;

  return (
    <div className="grid gap-2">
      <Field label={t("note")}>
        {(fieldId) => (
          <Textarea
            id={fieldId}
            maxLength={2000}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            value={note}
          />
        )}
      </Field>
      <div className="flex flex-wrap gap-2">
        {item.status === "received" ? (
          <Button
            disabled={busy}
            onClick={() => move("intake_check")}
            size="sm"
            variant="outline"
          >
            {t("startIntake")}
          </Button>
        ) : null}
        {item.status === "intake_check" ? (
          <Button
            disabled={busy}
            onClick={() => move("in_review")}
            size="sm"
            variant="outline"
          >
            {t("toReview")}
          </Button>
        ) : null}
        {item.status === "intake_check" && !item.intake_returned_at ? (
          <Button
            disabled={busy || !note.trim()}
            onClick={askFix}
            size="sm"
            variant="ghost"
          >
            {t("askFix")}
          </Button>
        ) : null}
        {reviewing ? (
          <>
            <Button disabled={busy} onClick={() => decide("accept")} size="sm">
              {t("accept")}
            </Button>
            <Button
              disabled={busy}
              onClick={() => decide("accept_with_edits")}
              size="sm"
              variant="outline"
            >
              {t("acceptWithEdits")}
            </Button>
            <Button
              disabled={busy}
              onClick={() => decide("decline")}
              size="sm"
              variant="ghost"
            >
              {t("decline")}
            </Button>
          </>
        ) : null}
      </div>
      <ErrorLine error={act.error} />
    </div>
  );
};

const OPEN_STATUSES: readonly string[] = [
  "received",
  "intake_check",
  "in_review",
  "selection",
];

const QueueItem = ({ item }: { item: QueueRow }) => {
  const t = useTranslations("nexus.admin.waraq.queue");
  const tj = useTranslations("nexus.admin.journal");
  const tn = useTranslations("nexus.journal");
  const locale = useLocale() as Locale;
  const [open, setOpen] = useState(false);
  const stage =
    item.status === "intake_check" && item.intake_returned_at
      ? tn("returned")
      : tn(`status.${item.status}`);
  const author = localized(
    {
      name_ar: item.author_name_ar ?? item.author_name_en ?? "",
      name_en: item.author_name_en ?? "",
    },
    "name",
    locale
  );
  const files =
    item.file_count > 0
      ? ` · ${t("files", { count: formatNumber(item.file_count) })}`
      : "";

  return (
    <li className="grid gap-3 rounded-card bg-surface-tint p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-medium">{item.title}</h3>
        <span className="type-caption">
          {`${tj(`categories.${item.category}`)} · ${stage} · ${formatLongDate(item.created_at, locale)}`}
        </span>
      </div>
      <p className="type-caption">{`${author}${files}`}</p>
      {item.deck ? <p className="type-lede">{item.deck}</p> : null}
      <Button
        className="justify-self-start"
        onClick={() => setOpen((o) => !o)}
        size="sm"
        variant="ghost"
      >
        {open ? t("hide") : t("read")}
      </Button>
      {open ? <QueueWork item={item} /> : null}
      {item.piece_id ? (
        <Link
          className="justify-self-start underline underline-offset-4"
          href={{
            pathname: "/admin/journal/piece",
            query: { id: item.piece_id },
          }}
        >
          {t("openPiece")}
        </Link>
      ) : null}
      {OPEN_STATUSES.includes(item.status) ? (
        <QueueActions item={item} />
      ) : null}
    </li>
  );
};

const Desks = () => {
  const t = useTranslations("nexus.admin.waraq.queue");
  const tj = useTranslations("nexus.admin.journal");
  const { supabase } = useAuth();
  const [desk, setDesk] = useState<journal.Desk | "">("");
  const [done, setDone] = useState(false);
  const queue = useQuery({
    queryFn: () => journal.deskQueue(supabase),
    queryKey: [...key, "queue"],
  });
  const rows = (queue.data ?? []).filter(
    (q) =>
      (!desk || q.desk === desk) &&
      (done
        ? ["accepted", "declined", "withdrawn"].includes(q.status)
        : !["accepted", "declined", "withdrawn"].includes(q.status))
  );
  return (
    <div className="grid gap-4">
      <p className="type-caption">{t("lede")}</p>
      <div className="flex flex-wrap items-end gap-4">
        <Field label={t("desk")}>
          {(id) => (
            <SelectInput
              className="w-48"
              id={id}
              onChange={(e) => setDesk(e.target.value as journal.Desk | "")}
              value={desk}
            >
              <option value="">{t("allDesks")}</option>
              {(["news", "video", "voices"] as const).map((d) => (
                <option key={d} value={d}>
                  {tj(`desks.${d}`)}
                </option>
              ))}
            </SelectInput>
          )}
        </Field>
        <Button onClick={() => setDone((d) => !d)} size="sm" variant="ghost">
          {done ? t("showOpen") : t("showDone")}
        </Button>
      </div>
      {queue.data ? null : <SectionSpinner />}
      {queue.data && rows.length === 0 ? (
        <p className="type-body text-text-secondary">{t("empty")}</p>
      ) : null}
      <ul className="grid gap-4">
        {rows.map((item) => (
          <QueueItem item={item} key={item.submission_id} />
        ))}
      </ul>
    </div>
  );
};

// ── The front page ──────────────────────────────────────────────────────────

const FrontPage = () => {
  const t = useTranslations("nexus.admin.waraq");
  const tj = useTranslations("nexus.admin.journal");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const pieces = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("journal")
          .from("pieces")
          .select(
            "id, desk, category, title_en, title_ar, front_rank, published_at"
          )
          .eq("status", "published")
          .order("front_rank", { ascending: true, nullsFirst: false })
          .order("published_at", { ascending: false })
          .limit(60)
      ) ?? [],
    queryKey: [...key, "front"],
  });
  const set = useMutation({
    mutationFn: async (row: { id: string; rank: number | null }) =>
      unwrap(
        await supabase
          .schema("journal")
          // null takes the piece off the front page.
          .rpc("set_front", {
            front_rank: row.rank as number,
            piece_id: row.id,
          })
      ),
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });
  type Row = NonNullable<typeof pieces.data>[number];
  const columns: Column<Row>[] = [
    {
      cell: (p) => (
        <Link
          className="font-medium underline underline-offset-4"
          href={{ pathname: "/admin/journal/piece", query: { id: p.id } }}
        >
          {localized(p, "title", locale) || t("untitled")}
        </Link>
      ),
      header: t("piece"),
      key: "title",
    },
    {
      cell: (p) => tj(`categories.${p.category}`),
      header: t("type"),
      key: "type",
    },
    {
      cell: (p) => (
        <FrontRank
          disabled={set.isPending}
          onChange={(rank) => set.mutate({ id: p.id, rank })}
          value={p.front_rank}
        />
      ),
      header: t("workflow.front"),
      key: "rank",
    },
  ];
  return (
    <div className="grid gap-4">
      <p className="type-caption">{t("frontLede")}</p>
      {pieces.data ? (
        <DataTable
          columns={columns}
          empty={t("noPublished")}
          rowKey={(p) => p.id}
          rows={pieces.data}
        />
      ) : (
        <SectionSpinner />
      )}
      <ErrorLine error={set.error} />
    </div>
  );
};

// ── Contributors ────────────────────────────────────────────────────────────

const Contributors = () => {
  const t = useTranslations("nexus.admin.journal.contributor");
  const tw = useTranslations("nexus.admin.waraq");
  const tk = useTranslations("nexus.admin.kit");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const blank = {
    bio: { ar: "", en: "" },
    id: null as string | null,
    name: { ar: "", en: "" },
    slug: "",
  };
  const [form, setForm] = useState(blank);
  const contributors = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("journal")
          .from("contributors")
          .select("id, slug, name_en, name_ar, bio_en, bio_ar, is_pen_name")
          .order("name_en")
      ) ?? [],
    queryKey: [...key, "contributors"],
  });
  const save = useMutation({
    mutationFn: async () => {
      const row = {
        bio_ar: form.bio.ar || null,
        bio_en: form.bio.en || null,
        name_ar: form.name.ar || null,
        name_en: form.name.en,
        slug: form.slug || slugify(form.name.en),
      };
      const table = supabase.schema("journal").from("contributors");
      unwrap(
        form.id
          ? await table.update(row).eq("id", form.id)
          : await table.insert(row)
      );
    },
    onSuccess: async () => {
      setForm(blank);
      await queryClient.invalidateQueries({ queryKey: key });
    },
  });
  return (
    <div className="grid gap-6">
      <ul className="grid gap-2">
        {contributors.data?.map((c) => (
          <li className="flex flex-wrap items-center gap-3" key={c.id}>
            <span className="font-medium">{localized(c, "name", locale)}</span>
            {c.is_pen_name ? (
              <span className="type-caption">{tw("penName")}</span>
            ) : null}
            <Button
              onClick={() =>
                setForm({
                  bio: { ar: c.bio_ar ?? "", en: c.bio_en ?? "" },
                  id: c.id,
                  name: { ar: c.name_ar ?? "", en: c.name_en },
                  slug: c.slug,
                })
              }
              size="sm"
              variant="ghost"
            >
              {tk("edit")}
            </Button>
          </li>
        ))}
      </ul>
      <form
        className="grid max-w-3xl gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          save.mutate();
        }}
      >
        <h3 className="type-subheading">{form.id ? t("edit") : t("new")}</h3>
        <BilingualField
          label={t("name")}
          maxLength={200}
          onChange={(name) => setForm((f) => ({ ...f, name }))}
          value={form.name}
        />
        <Field hint={tk("slugHint")} label={tk("slug")}>
          {(id) => (
            <Input
              dir="ltr"
              id={id}
              maxLength={80}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              placeholder={slugify(form.name.en)}
              value={form.slug}
            />
          )}
        </Field>
        <BilingualField
          label={t("bio")}
          maxLength={1000}
          multiline
          onChange={(bio) => setForm((f) => ({ ...f, bio }))}
          rows={3}
          value={form.bio}
        />
        <SaveButton disabled={!form.name.en.trim()} pending={save.isPending} />
        <ErrorLine error={save.error} />
      </form>
    </div>
  );
};

const puzzleEditorKeys = [
  "journal.approve",
  "journal.publish",
  "journal.copy",
  "journal.edit.news",
  "journal.edit.letters",
  "journal.edit.gallery",
  "journal.edit.video",
  "journal.edit.voices",
] as const;

export const JournalAdmin = () => {
  const t = useTranslations("nexus.admin.waraq");
  const grants = useGrants();
  const named = (["news", "video", "voices"] as const).some(
    (desk) =>
      hasPermissionAnywhere(grants.data, `journal.edit.${desk}`) ||
      hasPermissionAnywhere(grants.data, "journal.approve")
  );
  const front = hasPermission(grants.data, "journal.frontpage");
  // The same keys as private.can_edit_puzzles().
  const puzzles = puzzleEditorKeys.some((p) =>
    hasPermissionAnywhere(grants.data, p)
  );
  return (
    <div className="grid gap-6">
      <AdminHeading title={t("title")}>{t("lede")}</AdminHeading>
      <Tabs defaultValue="newsroom">
        <TabsList className="flex-wrap">
          <TabsTrigger value="newsroom">{t("tabs.newsroom")}</TabsTrigger>
          {named ? (
            <TabsTrigger value="desks">{t("tabs.desks")}</TabsTrigger>
          ) : null}
          {front ? (
            <TabsTrigger value="front">{t("tabs.front")}</TabsTrigger>
          ) : null}
          <TabsTrigger value="editions">{t("tabs.editions")}</TabsTrigger>
          {puzzles ? (
            <TabsTrigger value="games">{t("tabs.games")}</TabsTrigger>
          ) : null}
          <TabsTrigger value="contributors">
            {t("tabs.contributors")}
          </TabsTrigger>
        </TabsList>
        <TabsContent className="pt-4" value="newsroom">
          <Newsroom />
        </TabsContent>
        {named ? (
          <TabsContent className="pt-4" value="desks">
            <Desks />
          </TabsContent>
        ) : null}
        {front ? (
          <TabsContent className="pt-4" value="front">
            <FrontPage />
          </TabsContent>
        ) : null}
        <TabsContent className="pt-4" value="editions">
          <Editions />
        </TabsContent>
        {puzzles ? (
          <TabsContent className="pt-4" value="games">
            <Puzzles />
          </TabsContent>
        ) : null}
        <TabsContent className="pt-4" value="contributors">
          <Contributors />
        </TabsContent>
      </Tabs>
    </div>
  );
};
