"use client";

import { Textarea } from "@repo/brand/components/ui/textarea";
import type { Locale } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useAuth } from "@/lib/auth/provider";
import { journal, localized, sanitizeRichText, unwrap } from "@/lib/data";
import { useQueryParam } from "@/lib/diwan/use-query-param";
import { Thread } from "../admin/journal/workflow";
import {
  AdminHeading,
  ConfirmAction,
  ErrorLine,
  Field,
  SaveButton,
} from "../admin/kit";
import { DiwanSection } from "../page";
import { OnTheSite } from "../site-links";
import { SectionSpinner } from "../states";
import { Agreement } from "./pages";

/**
 * The author's view of their accepted piece: the text as the editors have
 * it, the conversation, the final approval, the agreement and the
 * contributor form.
 */
export const MyPiece = () => {
  const t = useTranslations("diwan.qirtas");
  const tw = useTranslations("diwan.admin.qirtas");
  const tj = useTranslations("diwan.admin.journal");
  const locale = useLocale() as Locale;
  const id = useQueryParam("id");
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const data = useQuery({
    enabled: Boolean(id),
    queryFn: async () => {
      const j = supabase.schema("journal");
      const [piece, body] = await Promise.all([
        j
          .from("pieces")
          .select("*")
          .eq("id", id ?? "")
          .maybeSingle(),
        j
          .from("piece_bodies")
          .select("body_en, body_ar")
          .eq("piece_id", id ?? "")
          .maybeSingle(),
      ]);
      return { body: unwrap(body), piece: unwrap(piece) };
    },
    queryKey: ["journal", "my-piece", id],
  });
  const approve = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase
          .schema("journal")
          .rpc("author_approve", { piece_id: id ?? "" })
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["journal", "my-piece", id] }),
  });

  const back = (
    <Link
      className="text-sm underline underline-offset-4"
      href="/qirtas/submit"
    >
      {t("back")}
    </Link>
  );
  if (data.isPending && id) {
    return <SectionSpinner />;
  }
  const piece = data.data?.piece;
  if (!piece) {
    return (
      <div className="grid gap-4">
        <AdminHeading actions={back} title={t("pieceTitle")} />
        <p>{t("pieceNotFound")}</p>
      </div>
    );
  }
  const status = piece.status as journal.PieceStatus;
  const texts = [
    { html: data.data?.body?.body_en, lang: "en" },
    { html: data.data?.body?.body_ar, lang: "ar" },
  ].filter((text): text is { html: string; lang: string } =>
    Boolean(text.html)
  );

  return (
    <div className="grid gap-10">
      <AdminHeading
        actions={
          <>
            {back}
            {status === "published" && piece.slug ? (
              <OnTheSite href={journal.piecePath(piece)} />
            ) : null}
          </>
        }
        title={localized(piece, "title", locale) || t("pieceTitle")}
      >
        {`${tj(`categories.${piece.category as journal.Category}`)} · ${tw(`statuses.${status}`)}`}
      </AdminHeading>

      {status === "editing" ? (
        <section className="border-line grid max-w-3xl gap-3 border-t p-4">
          <h2 className="type-subheading">{t("finalCheck")}</h2>
          <p>{t("finalCheckLede")}</p>
          <div>
            <ConfirmAction
              confirmLabel={t("approve")}
              description={t("approveConfirm")}
              disabled={approve.isPending}
              onConfirm={() => approve.mutate()}
              variant="default"
            >
              {t("approve")}
            </ConfirmAction>
          </div>
          <ErrorLine error={approve.error} />
        </section>
      ) : null}
      {status === "author_approved" && piece.author_approved_at ? (
        <p>
          {t("youApproved", {
            date: formatLongDate(piece.author_approved_at, locale, true),
          })}
        </p>
      ) : null}
      {status === "published" && piece.published_at ? (
        <p>
          {t("published", {
            date: formatLongDate(piece.published_at, locale, true),
          })}
        </p>
      ) : null}

      {piece.desk === "news" &&
      status !== "published" &&
      status !== "unpublished" ? (
        <Disclosure
          current={piece.conflict_disclosure}
          key={piece.conflict_disclosure ?? ""}
          pieceId={piece.id}
        />
      ) : null}
      {piece.submission_id ? (
        <Agreement submissionId={piece.submission_id} />
      ) : null}

      <DiwanSection id="thetext" title={t("theText")}>
        {texts.map((text) => (
          <div
            className="prose max-w-none"
            // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized with the one rich-text policy
            dangerouslySetInnerHTML={{ __html: sanitizeRichText(text.html) }}
            dir={text.lang === "ar" ? "rtl" : "ltr"}
            key={text.lang}
            lang={text.lang}
          />
        ))}
      </DiwanSection>

      <Thread pieceId={piece.id} />
    </div>
  );
};

/**
 * The writer's ties to what they cover (decisions.md, Qirtas: the
 * newsroom's standards), for the editors to reassign or note.
 */
const Disclosure = ({
  current,
  pieceId,
}: {
  current: string | null;
  pieceId: string;
}) => {
  const t = useTranslations("diwan.qirtas.disclosure");
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const [text, setText] = useState(current ?? "");
  const save = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase.schema("journal").rpc("set_conflict_disclosure", {
          disclosure: text,
          piece_id: pieceId,
        })
      ),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: ["journal", "my-piece", pieceId],
      }),
  });
  return (
    <form
      className="grid max-w-3xl gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <Field hint={t("hint")} label={t("label")}>
        {(id) => (
          <Textarea
            id={id}
            maxLength={2000}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            value={text}
          />
        )}
      </Field>
      <SaveButton pending={save.isPending} quiet success={save.isSuccess} />
      <ErrorLine error={save.error} />
    </form>
  );
};
