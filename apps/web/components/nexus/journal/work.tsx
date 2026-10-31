"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/design-system/components/ui/button";
import type { Locale } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { journal, localized, sanitizeRichText, unwrap } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useQueryParam } from "@/lib/nexus/use-query-param";
import { Thread } from "../admin/journal/workflow";
import {
  AdminHeading,
  BilingualField,
  ConfirmAction,
  ErrorLine,
} from "../admin/kit";
import { DiwanSection } from "../page";
import { OnTheSite } from "../site-links";
import { SectionSpinner } from "../states";
import { Agreement } from "./pages";

/** The contributor form: how the name is spelled, and the bio. */
const ContributorForm = ({ contributorId }: { contributorId: string }) => {
  const t = useTranslations("nexus.waraq.contributor");
  const { supabase } = useAuth();
  const mine = useQuery({
    queryFn: async () =>
      unwrap(await supabase.schema("journal").rpc("my_contributors")) ?? [],
    queryKey: ["journal", "my-contributors"],
  });
  const record = mine.data?.find((c) => c.id === contributorId);
  const [name, setName] = useState({ ar: "", en: "" });
  const [bio, setBio] = useState({ ar: "", en: "" });
  useEffect(() => {
    if (record) {
      setName({ ar: record.name_ar ?? "", en: record.name_en });
      setBio({ ar: record.bio_ar ?? "", en: record.bio_en ?? "" });
    }
  }, [record]);
  const save = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase.schema("journal").rpc("update_my_contributor", {
          bio_ar: bio.ar,
          bio_en: bio.en,
          contributor_id: contributorId,
          name_ar: name.ar,
          name_en: name.en,
        })
      ),
    onSuccess: () => mine.refetch(),
  });
  if (!record) {
    return null;
  }
  return (
    <DiwanSection id="title" title={t("title")}>
      <p className="type-caption">
        {record.is_pen_name ? t("penNameLede") : t("lede")}
      </p>
      <BilingualField
        label={t("name")}
        maxLength={200}
        onChange={setName}
        value={name}
      />
      <BilingualField
        label={t("bio")}
        maxLength={600}
        multiline
        onChange={setBio}
        rows={3}
        value={bio}
      />
      <p className="type-caption">
        {t("words", {
          ar: journal.wordCount(bio.ar),
          en: journal.wordCount(bio.en),
        })}
      </p>
      <div>
        <Button
          disabled={save.isPending || name.en.trim().length < 2}
          onClick={() => save.mutate()}
          size="sm"
        >
          {t("save")}
        </Button>
      </div>
      <ErrorLine error={save.error} />
    </DiwanSection>
  );
};

/**
 * The author's view of their accepted piece: the text as the editors have
 * it, the conversation, the final approval, the agreement and the
 * contributor form.
 */
export const MyPiece = () => {
  const t = useTranslations("nexus.waraq");
  const tw = useTranslations("nexus.admin.waraq");
  const tj = useTranslations("nexus.admin.journal");
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
    <Link className="text-sm underline underline-offset-4" href="/qirtas/write">
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
        <section className="grid max-w-3xl gap-3 border-line border-t p-4">
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
      <ContributorForm contributorId={piece.contributor_id} />
    </div>
  );
};
