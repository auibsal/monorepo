"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/design-system/components/ui/button";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import type { Locale } from "@repo/internationalization";
import {
  formatLongDate,
  formatNumber,
} from "@repo/internationalization/format";
import { hasPermission } from "@repo/rbac";
import { journal, localized, unwrap } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useGrants } from "@/lib/nexus/queries";
import {
  BilingualField,
  ConfirmAction,
  DateTimeField,
  ErrorLine,
  Field,
  SelectInput,
} from "../kit";

/** Everything the newsroom reads about one piece. */
export const usePieceRecord = (pieceId: string | null) => {
  const { supabase } = useAuth();
  return useQuery({
    enabled: Boolean(pieceId),
    queryFn: async () => {
      const id = pieceId ?? "";
      const j = supabase.schema("journal");
      const [piece, body, approvals, media, credits, corrections, readiness] =
        await Promise.all([
          j
            .from("pieces")
            .select("*, issue:issues(id, title_en, title_ar, publish_at)")
            .eq("id", id)
            .maybeSingle(),
          j.from("piece_bodies").select("*").eq("piece_id", id).maybeSingle(),
          j.from("approvals").select("*").eq("piece_id", id),
          j.from("piece_media").select("*").eq("piece_id", id).order("sort"),
          j
            .from("piece_credits")
            .select("*, contributor:contributors(name_en, name_ar)")
            .eq("piece_id", id)
            .order("sort"),
          j
            .from("corrections")
            .select("*")
            .eq("piece_id", id)
            .order("created_at"),
          j.rpc("publish_readiness", { piece_id: id }),
        ]);
      return {
        approvals: unwrap(approvals) ?? [],
        body: unwrap(body),
        corrections: unwrap(corrections) ?? [],
        credits: unwrap(credits) ?? [],
        media: unwrap(media) ?? [],
        piece: unwrap(piece),
        readiness: (unwrap(readiness) ?? "")
          .split(",")
          .filter(Boolean) as Problem[],
      };
    },
    queryKey: ["admin", "journal", "piece", pieceId],
  });
};

export type PieceRecord = NonNullable<
  ReturnType<typeof usePieceRecord>["data"]
>;
type Piece = NonNullable<PieceRecord["piece"]>;

/** private.publish_check's codes. */
export type Problem =
  | "desk_approval"
  | "chief_approval"
  | "copy_check"
  | "author_approval"
  | "agreement"
  | "titles"
  | "images"
  | "video"
  | "text"
  | "deck";

/** What the caller may do to this piece (the database checks again). */
export const usePieceRights = (piece: Piece | null | undefined) => {
  const grants = useGrants();
  const can = (permission: Parameters<typeof hasPermission>[1]) =>
    Boolean(piece) &&
    hasPermission(grants.data, permission, "issue", piece?.issue_id ?? null);
  const desk = (piece?.desk ?? "news") as journal.Desk;
  return {
    approve: (kind: journal.ApprovalKind) =>
      can(journal.approvalPermission(kind, desk)),
    chief: can("journal.approve"),
    deskEditor: can(`journal.edit.${desk}`),
    front: hasPermission(grants.data, "journal.frontpage"),
  };
};

const NOTE = " border-t border-line p-4";

type Move = (name: string, args: Record<string, unknown>) => void;

/** Runs one workflow function and refreshes the newsroom. */
const useMove = () => {
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const move = useMutation({
    mutationFn: async ({
      args,
      name,
    }: {
      args: Record<string, unknown>;
      name: string;
    }) => {
      const { error } = await supabase
        .schema("journal")
        .rpc(name as never, args as never);
      if (error) {
        throw error;
      }
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["admin", "journal"] }),
  });
  const run: Move = (name, args) => move.mutate({ args, name });
  return { error: move.error, pending: move.isPending, run };
};

const codes = (value: string | null) =>
  (value ?? "").split(",").filter(Boolean) as Problem[];

const StatusLine = ({ piece }: { piece: Piece }) => {
  const t = useTranslations("nexus.admin.waraq");
  const locale = useLocale() as Locale;
  const status = piece.status as journal.PieceStatus;
  let when: string | null = null;
  if (status === "published") {
    when = piece.published_at;
  } else if (status === "scheduled") {
    when = piece.publish_at;
  }
  return (
    <p className="type-body">
      {t(`statuses.${status}`)}
      {when ? ` · ${formatLongDate(when, locale, true)}` : ""}
    </p>
  );
};

const Problems = ({ items, title }: { items: Problem[]; title: string }) => {
  const t = useTranslations("nexus.admin.waraq.problems");
  return (
    <div className={NOTE}>
      <p className="font-medium">{title}</p>
      {items.length > 0 ? (
        <ul className="list-disc ps-5">
          {items.map((p) => (
            <li key={p}>{t(p)}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
};

const AuthorCheck = ({
  move,
  piece,
}: {
  move: ReturnType<typeof useMove>;
  piece: Piece;
}) => {
  const t = useTranslations("nexus.admin.waraq.workflow");
  const locale = useLocale() as Locale;
  let line = t("authorNotAsked");
  if (piece.author_approved_at) {
    line = t("authorApproved", {
      date: formatLongDate(piece.author_approved_at, locale, true),
    });
  } else if (piece.author_requested_at) {
    line = t("authorAsked", {
      date: formatLongDate(piece.author_requested_at, locale, true),
    });
  }
  return (
    <div className="grid gap-2">
      <p className="type-caption">{line}</p>
      {piece.status === "editing" ? (
        <Button
          className="justify-self-start"
          disabled={move.pending}
          onClick={() =>
            move.run("request_author_approval", { piece_id: piece.id })
          }
          size="sm"
          variant="outline"
        >
          {t("askAuthor")}
        </Button>
      ) : null}
    </div>
  );
};

const Approvals = ({
  move,
  record,
}: {
  move: ReturnType<typeof useMove>;
  record: PieceRecord;
}) => {
  const t = useTranslations("nexus.admin.waraq");
  const locale = useLocale() as Locale;
  const { user } = useAuth();
  const piece = record.piece as Piece;
  const rights = usePieceRights(piece);
  const open =
    piece.status === "author_approved" ||
    (piece.status === "editing" && !piece.submission_id);
  return (
    <ul className="grid gap-2">
      {journal.approvalKinds.map((kind) => {
        const given = record.approvals.find((a) => a.kind === kind);
        const mine = given?.approved_by === user?.id;
        const required = journal
          .requiredApprovals(piece.desk as journal.Desk)
          .includes(kind);
        let line = t(required ? "workflow.waiting" : "workflow.optional");
        if (given) {
          line = t(mine ? "workflow.approvedByYou" : "workflow.approved", {
            date: formatLongDate(given.approved_at, locale, true),
          });
        }
        return (
          <li className="flex flex-wrap items-center gap-3" key={kind}>
            <span className="min-w-48">{t(`approvals.${kind}`)}</span>
            <span className="type-caption">{line}</span>
            {!given && open && rights.approve(kind) ? (
              <Button
                disabled={move.pending}
                onClick={() =>
                  move.run("approve_piece", { kind, piece_id: piece.id })
                }
                size="sm"
              >
                {t("workflow.approve")}
              </Button>
            ) : null}
            {mine ? (
              <Button
                disabled={move.pending}
                onClick={() =>
                  move.run("withdraw_approval", { kind, piece_id: piece.id })
                }
                size="sm"
                variant="ghost"
              >
                {t("workflow.withdraw")}
              </Button>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
};

const Schedule = ({
  move,
  piece,
}: {
  move: ReturnType<typeof useMove>;
  piece: Piece;
}) => {
  const t = useTranslations("nexus.admin.waraq.workflow");
  const locale = useLocale() as Locale;
  const [publishAt, setPublishAt] = useState<string | null>(piece.publish_at);
  const edition = piece.issue as {
    publish_at: string | null;
    title_ar: string;
    title_en: string;
  } | null;
  return (
    <div className="grid max-w-md gap-2">
      <DateTimeField
        label={t("publishAt")}
        onChange={setPublishAt}
        value={publishAt}
      />
      <p className="type-caption">
        {edition?.publish_at && !publishAt
          ? t("withEdition", {
              date: formatLongDate(edition.publish_at, locale, true),
              edition: localized(edition, "title", locale),
            })
          : t("publishAtHint")}
      </p>
      <Button
        className="justify-self-start"
        disabled={move.pending || publishAt === piece.publish_at}
        onClick={() =>
          move.run("schedule_piece", {
            piece_id: piece.id,
            publish_at: publishAt,
          })
        }
        size="sm"
        variant="outline"
      >
        {t("setTime")}
      </Button>
    </div>
  );
};

const Unpublish = ({
  move,
  piece,
}: {
  move: ReturnType<typeof useMove>;
  piece: Piece;
}) => {
  const t = useTranslations("nexus.admin.waraq.workflow");
  const [note, setNote] = useState("");
  return (
    <div className="grid max-w-xl gap-2">
      <Field label={t("unpublishNote")}>
        {(id) => (
          <Textarea
            id={id}
            maxLength={2000}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            value={note}
          />
        )}
      </Field>
      <ConfirmAction
        confirmLabel={t("unpublish")}
        description={t("unpublishConfirm")}
        disabled={move.pending || !note.trim()}
        onConfirm={() =>
          move.run("unpublish_piece", { note: note.trim(), piece_id: piece.id })
        }
      >
        {t("unpublish")}
      </ConfirmAction>
    </div>
  );
};

/** The front page rank: 1 is the lead story (Editor-in-Chief). */
export const FrontRank = ({
  disabled,
  onChange,
  value,
}: {
  disabled: boolean;
  onChange: (rank: number | null) => void;
  value: number | null;
}) => {
  const t = useTranslations("nexus.admin.waraq.workflow");
  const label = (rank: number) =>
    rank === 1 ? t("lead") : t("rank", { rank: formatNumber(rank) });
  return (
    <SelectInput
      aria-label={t("front")}
      className="w-56"
      disabled={disabled}
      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
      value={value ?? ""}
    >
      <option value="">{t("notOnFront")}</option>
      {Array.from({ length: 12 }, (_, i) => i + 1).map((rank) => (
        <option key={rank} value={rank}>
          {label(rank)}
        </option>
      ))}
    </SelectInput>
  );
};

/**
 * Where the piece stands and the moves from here: the author's final
 * check, the approvals, the publish time, unpublishing and the front
 * page. Every move is a database function that checks again.
 */
export const Workflow = ({ record }: { record: PieceRecord }) => {
  const t = useTranslations("nexus.admin.waraq.workflow");
  const piece = record.piece as Piece;
  const rights = usePieceRights(piece);
  const move = useMove();
  const status = piece.status as journal.PieceStatus;
  const out = status === "published" || status === "unpublished";
  const editor = rights.chief || rights.deskEditor;
  const sentBack = codes(piece.edit_note);

  return (
    <section className="grid gap-4">
      <h2 className="type-subheading">{t("title")}</h2>
      <StatusLine piece={piece} />
      {status === "editing" && sentBack.length > 0 ? (
        <Problems items={sentBack} title={t("sentBack")} />
      ) : null}
      {out ? null : (
        <Problems
          items={record.readiness}
          title={record.readiness.length === 0 ? t("ready") : t("needs")}
        />
      )}
      {piece.submission_id && !out ? (
        <AuthorCheck move={move} piece={piece} />
      ) : null}
      {out ? null : <Approvals move={move} record={record} />}
      {!out && editor ? <Schedule move={move} piece={piece} /> : null}
      {status === "published" && editor ? (
        <Unpublish move={move} piece={piece} />
      ) : null}
      {status === "unpublished" ? (
        <div className="grid gap-2">
          <p className="type-caption">{piece.unpublish_note}</p>
          <Button
            className="justify-self-start"
            disabled={move.pending}
            onClick={() => move.run("reopen_piece", { piece_id: piece.id })}
            size="sm"
            variant="outline"
          >
            {t("reopen")}
          </Button>
        </div>
      ) : null}
      {status === "published" && rights.front ? (
        <Field hint={t("frontHint")} label={t("front")}>
          {() => (
            <FrontRank
              disabled={move.pending}
              onChange={(rank) =>
                move.run("set_front", { front_rank: rank, piece_id: piece.id })
              }
              value={piece.front_rank}
            />
          )}
        </Field>
      ) : null}
      <ErrorLine error={move.error} />
    </section>
  );
};

/** The editors' and the author's conversation about the piece. */
export const Thread = ({ pieceId }: { pieceId: string }) => {
  const t = useTranslations("nexus.admin.waraq.thread");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const [body, setBody] = useState("");
  const thread = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("journal")
          .rpc("piece_thread", { piece_id: pieceId })
      ) ?? [],
    queryKey: ["journal", "thread", pieceId],
  });
  const writer = (n: {
    from_author: boolean;
    mine: boolean;
    writer_name_ar: string | null;
    writer_name_en: string | null;
  }) => {
    if (n.mine) {
      return t("you");
    }
    if (n.from_author) {
      return t("author");
    }
    return (
      localized(
        {
          name_ar: n.writer_name_ar ?? n.writer_name_en ?? "",
          name_en: n.writer_name_en ?? "",
        },
        "name",
        locale
      ) || t("editor")
    );
  };
  const send = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase
          .schema("journal")
          .from("piece_notes")
          .insert({ body: body.trim(), piece_id: pieceId })
      ),
    onSuccess: async () => {
      setBody("");
      await thread.refetch();
    },
  });
  return (
    <section className="grid gap-4">
      <h2 className="type-subheading">{t("title")}</h2>
      {thread.data?.length === 0 ? (
        <p className="type-body text-text-secondary">{t("empty")}</p>
      ) : null}
      <ol className="grid gap-3">
        {thread.data?.map((n) => (
          <li className="grid gap-1 border-line border-t p-3" key={n.id}>
            <p className="type-caption">
              {writer(n)}
              {" · "}
              {formatLongDate(n.created_at, locale, true)}
            </p>
            <p className="whitespace-pre-wrap">{n.body}</p>
          </li>
        ))}
      </ol>
      <form
        className="grid max-w-2xl gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          send.mutate();
        }}
      >
        <Field label={t("write")}>
          {(id) => (
            <Textarea
              id={id}
              maxLength={4000}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              value={body}
            />
          )}
        </Field>
        <Button
          className="justify-self-start"
          disabled={send.isPending || !body.trim()}
          size="sm"
          type="submit"
        >
          {t("send")}
        </Button>
        <ErrorLine error={send.error} />
      </form>
    </section>
  );
};

/** Corrections are made openly, with a dated note at the end of the piece. */
export const Corrections = ({ record }: { record: PieceRecord }) => {
  const t = useTranslations("nexus.admin.waraq.corrections");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const [note, setNote] = useState({ ar: "", en: "" });
  const add = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase
          .schema("journal")
          .from("corrections")
          .insert({
            note_ar: note.ar.trim() || null,
            note_en: note.en.trim() || null,
            piece_id: record.piece?.id ?? "",
          })
      ),
    onSuccess: async () => {
      setNote({ ar: "", en: "" });
      await queryClient.invalidateQueries({ queryKey: ["admin", "journal"] });
    },
  });
  return (
    <section className="grid gap-4">
      <h2 className="type-subheading">{t("title")}</h2>
      <p className="type-caption">{t("lede")}</p>
      <ul className="grid gap-2">
        {record.corrections.map((c) => (
          <li key={c.id}>
            <span className="type-caption">
              {formatLongDate(c.created_at, locale)}
            </span>
            {" · "}
            {localized(
              {
                note_ar: c.note_ar ?? c.note_en ?? "",
                note_en: c.note_en ?? "",
              },
              "note",
              locale
            )}
          </li>
        ))}
      </ul>
      <BilingualField
        label={t("add")}
        maxLength={1000}
        multiline
        onChange={setNote}
        rows={2}
        value={note}
      />
      <Button
        className="justify-self-start"
        disabled={add.isPending || !(note.en.trim() || note.ar.trim())}
        onClick={() => add.mutate()}
        size="sm"
      >
        {t("save")}
      </Button>
      <ErrorLine error={add.error} />
    </section>
  );
};
