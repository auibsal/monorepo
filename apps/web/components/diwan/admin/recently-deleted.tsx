"use client";

import { Button } from "@repo/brand/components/ui/button";
import type { Locale } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/auth/provider";
import { localized, unwrap } from "@/lib/data";
import { DiwanSection, RowList } from "../page";
import { ErrorLine } from "./kit";

/** The records with a Recently deleted (decisions.md, The site). */
export type TrashKind = "event" | "media" | "partner";

/** How long Undo stays on the page after a delete. */
const UNDO_SECONDS = 10;

interface Use {
  readonly kind:
    | "edition"
    | "episode"
    | "event"
    | "memorandum"
    | "partner"
    | "piece"
    | "production";
  readonly title_ar: string | null;
  readonly title_en: string | null;
}

interface Uses {
  readonly blocked: "in_use" | "unlist_first" | "unpublish_first" | null;
  readonly title_ar: string | null;
  readonly title_en: string | null;
  readonly uses: readonly Use[];
}

const trashKey = (kind: TrashKind) => ["admin", "recently-deleted", kind];

/**
 * Delete on a record's page: a confirmation on the page that names the
 * record and where it is used (or what to do first), then Undo for ten
 * seconds; the record waits 30 days in its area's Recently deleted.
 */
export const DeleteRecord = ({
  id,
  kind,
  onDeleted,
}: {
  readonly id: string;
  readonly kind: TrashKind;
  /** Called once Undo has gone: back to the list. */
  readonly onDeleted: () => void;
}) => {
  const t = useTranslations("diwan.admin.kit.trash");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const [stage, setStage] = useState<"idle" | "asking" | "deleted">("idle");
  const [left, setLeft] = useState(UNDO_SECONDS);
  const done = useRef(onDeleted);
  done.current = onDeleted;

  const uses = useQuery({
    enabled: stage === "asking",
    queryFn: async () =>
      unwrap(
        await supabase.schema("api").rpc("record_uses", { kind, record_id: id })
      ) as unknown as Uses,
    queryKey: ["admin", "record-uses", kind, id],
  });

  const remove = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase
          .schema("api")
          .rpc("trash_record", { kind, record_id: id })
      ),
    onSuccess: () => {
      setLeft(UNDO_SECONDS);
      setStage("deleted");
    },
  });

  const undo = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase
          .schema("api")
          .rpc("restore_record", { kind, record_id: id })
      ),
    onSuccess: () => setStage("idle"),
  });

  useEffect(() => {
    if (stage !== "deleted" || undo.isPending) {
      return;
    }
    if (left <= 0) {
      queryClient.invalidateQueries({ queryKey: trashKey(kind) });
      done.current();
      return;
    }
    const timer = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(timer);
  }, [stage, left, undo.isPending, kind, queryClient]);

  if (stage === "deleted") {
    return (
      <div className="border-line flex flex-wrap items-center gap-x-5 gap-y-2 border-t pt-4">
        <p className="type-body" role="status">
          {t("deleted")}
        </p>
        <Button
          disabled={undo.isPending}
          onClick={() => undo.mutate()}
          size="sm"
          variant="outline"
        >
          {t("undo")}
        </Button>
        <ErrorLine error={undo.error} />
      </div>
    );
  }

  if (stage === "idle") {
    return (
      <button
        className="link text-text-secondary justify-self-start"
        onClick={() => setStage("asking")}
        type="button"
      >
        {t("delete")}
      </button>
    );
  }

  const found = uses.data;
  const name = found ? localized({ ...found }, "title", locale) : "";
  return (
    <section
      aria-label={t("delete")}
      className="border-line grid max-w-3xl gap-3 border-t pt-4"
    >
      {found ? (
        <>
          <p className="type-body">
            {found.blocked ? t(`blocked.${found.blocked}`, { name }) : null}
            {found.blocked ? null : t("confirm", { name })}
          </p>
          {found.uses.length > 0 ? (
            <ul className="type-body grid list-disc gap-1 ps-5">
              {found.uses.map((use) => (
                <li key={`${use.kind}-${use.title_en}`}>
                  {t(`uses.${use.kind}`, {
                    title: localized({ ...use }, "title", locale),
                  })}
                </li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}
      <ErrorLine error={uses.error ?? remove.error} />
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {found && !found.blocked ? (
          <Button
            disabled={remove.isPending}
            onClick={() => remove.mutate()}
            size="sm"
            variant="outline"
          >
            {t("confirmYes")}
          </Button>
        ) : null}
        <button
          className="link text-text-secondary"
          onClick={() => setStage("idle")}
          type="button"
        >
          {t("cancel")}
        </button>
      </div>
    </section>
  );
};

/**
 * An area's Recently deleted: what the person may restore, with the day
 * each is removed for good. Hidden while empty.
 */
export const RecentlyDeleted = ({ kind }: { readonly kind: TrashKind }) => {
  const t = useTranslations("diwan.admin.kit.trash");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const rows = useQuery({
    queryFn: async () =>
      unwrap(await supabase.schema("api").rpc("recently_deleted", { kind })) ??
      [],
    queryKey: trashKey(kind),
  });
  const restore = useMutation({
    mutationFn: async (id: string) =>
      unwrap(
        await supabase
          .schema("api")
          .rpc("restore_record", { kind, record_id: id })
      ),
    onSuccess: () => queryClient.invalidateQueries(),
  });
  if (!rows.data?.length) {
    return null;
  }
  return (
    <DiwanSection
      description={t("lede")}
      id="recently-deleted"
      title={t("title")}
    >
      <RowList>
        {rows.data.map((row) => (
          <li
            className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-1"
            key={row.id}
          >
            <span className="type-body">{localized(row, "title", locale)}</span>
            <span className="type-caption">
              {t("purges", { date: formatLongDate(row.purges_at, locale) })}
            </span>
            <button
              className="link font-medium"
              disabled={restore.isPending}
              onClick={() => restore.mutate(row.id)}
              type="button"
            >
              {t("restore")}
            </button>
          </li>
        ))}
      </RowList>
      <ErrorLine error={restore.error} />
    </DiwanSection>
  );
};
