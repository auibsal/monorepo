"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import type { Locale } from "@repo/internationalization";
import {
  formatDate,
  formatLongDate,
  formatNumber,
} from "@repo/internationalization/format";
import { hasPermission, hasPermissionAnywhere } from "@repo/rbac";
import { journal, localized, sanitizeRichText, unwrap } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { TabLinks } from "@/components/frame/tab-links";
import { Link } from "@/lib/nexus/navigation";
import { useGrants } from "@/lib/nexus/queries";
import { useQueryParam } from "@/lib/nexus/use-query-param";
import { SectionSpinner } from "../../states";
import { AdsAdmin } from "../ads";
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
import { Needs } from "../needs";
import { openSubmissionFile } from "../pipeline/data";
import { PipelineAdmin } from "../pipeline/pipeline";
import { NextStopAdmin } from "../programmes/admin";
import { Prizes } from "./prizes";
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
          href={`/qirtas/editions/${i.id}`}
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
      <Link className={buttonLink} href="/qirtas/editions/new">
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
          "id, desk, category, language, title_en, title_ar, status, publish_at, published_at, updated_at, front_rank, contributor:contributors!pieces_contributor_id_fkey(name_en, name_ar)"
        )
        .order("updated_at", { ascending: false })
        .limit(200);
      if (desk) {
        query = query.eq("desk", desk);
      }
      if (status) {
        query = query.eq("status", status);
      }
      // Work in progress first, then what is scheduled, then the published
      // by date: the order the newsroom reads in.
      const rank = (s: string) => journal.pieceStatuses.indexOf(s as never);
      const when = (p: {
        publish_at: string | null;
        published_at: string | null;
        updated_at: string;
      }) => p.published_at ?? p.publish_at ?? p.updated_at;
      return (unwrap(await query) ?? []).sort(
        (a, b) =>
          rank(a.status) - rank(b.status) || when(b).localeCompare(when(a))
      );
    },
    queryKey: [...key, "pieces", desk, status],
  });
  type Row = NonNullable<typeof pieces.data>[number];
  const columns: Column<Row>[] = [
    {
      cell: (p) => (
        <Link
          className="font-medium underline underline-offset-4"
          dir="auto"
          href={`/qirtas/pieces/${p.id}`}
          lang={p.language === "ar" ? "ar" : "en"}
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
          when = ` · ${formatDate(p.published_at, locale)}`;
        } else if (s === "scheduled" && p.publish_at) {
          when = ` · ${formatDate(p.publish_at, locale)}`;
        }
        const lead = p.front_rank === 1 ? ` · ${t("workflow.lead")}` : "";
        return `${t(`statuses.${s}`)}${when}${lead}`;
      },
      className: "whitespace-nowrap",
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
        <Link className={buttonLink} href="/qirtas/pieces/new">
          {t("newPiece")}
        </Link>
      </div>
      {pieces.data ? (
        <DataTable
          caption={t("sortedBy")}
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
    <li className="grid gap-3 border-line border-t p-4">
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
          href={`/qirtas/pieces/${item.piece_id}`}
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
              {journal.newsroomDesks.map((d) => (
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
          href={`/qirtas/pieces/${p.id}`}
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
  "journal.edit.games",
] as const;

// Who sees which half: the newsroom keys, and the blind review's.
const newsroomKeys = [
  "journal.publish",
  "journal.approve",
  "journal.copy",
  "journal.frontpage",
  "journal.edit.news",
  "journal.edit.letters",
  "journal.edit.gallery",
  "journal.edit.video",
  "journal.edit.voices",
  "journal.edit.games",
] as const;
const reviewKeys = [
  "journal.manage",
  "journal.review",
  "journal.identity.view",
  "journal.decide",
  "journal.advise",
] as const;

/**
 * Qirtas in the Diwan: everything sent to the paper, in one place. The
 * type decides the process: desk pieces go straight to the newsroom;
 * Edition work goes through the blind review first, then joins it.
 */
export const JournalAdmin = () => {
  const t = useTranslations("nexus.admin.waraq");
  const grants = useGrants();
  const requested = useQueryParam("tab");
  const anywhere = (keys: readonly string[]) =>
    keys.some((p) => hasPermissionAnywhere(grants.data, p as "journal.manage"));
  const newsroom = anywhere(newsroomKeys);
  const review = anywhere(reviewKeys);
  const named = journal.newsroomDesks.some(
    (desk) =>
      hasPermissionAnywhere(grants.data, `journal.edit.${desk}`) ||
      hasPermissionAnywhere(grants.data, "journal.approve")
  );
  const front = hasPermission(grants.data, "journal.frontpage");
  // The same keys as private.can_edit_puzzles().
  const puzzles = puzzleEditorKeys.some((p) =>
    hasPermissionAnywhere(grants.data, p)
  );
  const prizes = hasPermissionAnywhere(grants.data, "journal.prizes");
  const nextStop =
    hasPermissionAnywhere(grants.data, "programmes.manage") ||
    hasPermissionAnywhere(grants.data, "journal.edit.video");
  const ads =
    hasPermissionAnywhere(grants.data, "content.manage") ||
    hasPermissionAnywhere(grants.data, "partners.manage");
  // Six views (the overhaul, Oct 30, 2026): the front page, the desks, the
  // contributors and the needs list sit in the Newsroom; the Prizes beside
  // the Editions; Next Stop and the ads came from Programs and Site.
  const tabs = (
    [
      ["newsroom", newsroom || named || front],
      ["review", review],
      ["editions", newsroom || prizes],
      ["next-stop", nextStop],
      ["games", puzzles],
      ["ads", ads],
    ] as const
  )
    .filter(([, shown]) => shown)
    .map(([tab]) => tab);
  const first = tabs.find((tab) => tab === requested) ?? tabs[0];

  if (!(grants.data && first)) {
    return <SectionSpinner />;
  }

  return (
    <div className="grid gap-6">
      <AdminHeading title={t("title")}>{t("lede")}</AdminHeading>
      {/* Each view has its own address (?tab=), so it can be shared. */}
      <TabLinks
        label={t("title")}
        pathname="/qirtas"
        tabs={tabs.map((tab) => ({ key: tab, label: t(`tabs.${tab}`) }))}
      />
      <div className="pt-4">
        <JournalTab key={first} tab={first} />
      </div>
    </div>
  );
};

/** The paper's needs list, on Qirtas's own program row. */
const QirtasNeeds = () => {
  const { supabase } = useAuth();
  const row = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("core")
          .from("programmes")
          .select("id")
          .eq("slug", "waraq")
          .maybeSingle()
      ),
    queryKey: ["admin", "qirtas-programme"],
  });
  if (row.isPending) {
    return <SectionSpinner />;
  }
  return row.data ? <Needs programmeId={row.data.id} /> : null;
};

type JournalTabKey =
  | "newsroom"
  | "review"
  | "editions"
  | "next-stop"
  | "games"
  | "ads";

const JournalTab = ({ tab }: { tab: JournalTabKey }) => {
  const grants = useGrants();
  const has = (permission: Parameters<typeof hasPermission>[1]) =>
    hasPermissionAnywhere(grants.data, permission);
  const inNewsroom = newsroomKeys.some((permission) => has(permission));
  switch (tab) {
    case "newsroom":
      return (
        <div className="grid gap-14">
          {inNewsroom ? <Newsroom /> : null}
          {journal.newsroomDesks.some(
            (desk) => has(`journal.edit.${desk}`) || has("journal.approve")
          ) ? (
            <Desks />
          ) : null}
          {hasPermission(grants.data, "journal.frontpage") ? (
            <FrontPage />
          ) : null}
          {inNewsroom ? <Contributors /> : null}
          {hasPermission(grants.data, "journal.manage") ? (
            <QirtasNeeds />
          ) : null}
        </div>
      );
    case "review":
      return <PipelineAdmin embedded />;
    case "editions":
      return (
        <div className="grid gap-14">
          <Editions />
          {has("journal.prizes") ? <Prizes /> : null}
        </div>
      );
    case "next-stop":
      return <NextStopAdmin />;
    case "games":
      return <Puzzles />;
    default:
      return <AdsAdmin />;
  }
};
