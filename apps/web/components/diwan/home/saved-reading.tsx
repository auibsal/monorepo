"use client";

import { useAuth } from "@repo/auth/provider";
import { formatLongDate } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { journal, localized, unwrap } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { DiwanPage, RowList } from "../page";
import { EmptyLine, SectionSpinner } from "../states";
import { Section } from "./section";

const KEY = ["saved-reading"];

/**
 * What a reader saved to read later (the design review A9 and C22, Nov 4,
 * 2026): published pieces only, newest saved first. Their own work, sent
 * or in draft, never shows here; it lives on /qirtas/write.
 */
const useSaved = (limit?: number) => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: async () => {
      let query = supabase
        .schema("journal")
        .from("saved_pieces")
        .select(
          "saved_at, piece:pieces(id, slug, desk, title_en, title_ar, published_at)"
        )
        .order("saved_at", { ascending: false });
      if (limit) {
        query = query.limit(limit);
      }
      // A piece no longer readable (unpublished) comes back without it.
      return (unwrap(await query) ?? []).flatMap((row) =>
        row.piece ? [{ ...row.piece, saved_at: row.saved_at }] : []
      );
    },
    queryKey: [...KEY, limit ?? "all"],
  });
};

type Saved = NonNullable<ReturnType<typeof useSaved>["data"]>[number];

const SavedRows = ({
  removable = false,
  rows,
}: {
  readonly removable?: boolean;
  readonly rows: readonly Saved[];
}) => {
  const t = useTranslations("web.journal.saved");
  const locale = useLocale() as "en" | "ar";
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const remove = useMutation({
    mutationFn: async (pieceId: string) =>
      unwrap(
        await supabase
          .schema("journal")
          .from("saved_pieces")
          .delete()
          .eq("piece_id", pieceId)
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
  return (
    <RowList>
      {rows.map((piece) => (
        <li
          className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1"
          key={piece.id}
        >
          <span className="grid gap-0.5">
            <a className="link" href={journal.piecePath(piece)}>
              {localized(piece, "title", locale)}
            </a>
            {piece.published_at ? (
              <span className="type-caption">
                {formatLongDate(piece.published_at, locale)}
              </span>
            ) : null}
          </span>
          {removable ? (
            <button
              className="link type-caption"
              disabled={remove.isPending}
              onClick={() => remove.mutate(piece.id)}
              type="button"
            >
              {t("unsave")}
            </button>
          ) : null}
        </li>
      ))}
    </RowList>
  );
};

/** Today's few: the latest three saved, and the way to the rest. */
export const SavedReadingSection = () => {
  const t = useTranslations("web.journal.saved");
  const saved = useSaved(3);
  if (!saved.data?.length) {
    return null;
  }
  return (
    <Section
      action={
        <Link className="link" href="/membership/saved">
          {t("all")}
        </Link>
      }
      id="saved"
      title={t("title")}
    >
      <SavedRows rows={saved.data} />
    </Section>
  );
};

/** /membership/saved: everything saved, each with a way to let it go. */
export const SavedReadingPage = () => {
  const t = useTranslations("web.journal.saved");
  const saved = useSaved();
  return (
    <DiwanPage lede={t("lede")} narrow title={t("title")}>
      {saved.isPending ? <SectionSpinner /> : null}
      {saved.data?.length === 0 ? (
        <EmptyLine action={{ href: "/qirtas", label: t("browse") }}>
          {t("empty")}
        </EmptyLine>
      ) : null}
      {saved.data?.length ? <SavedRows removable rows={saved.data} /> : null}
    </DiwanPage>
  );
};
