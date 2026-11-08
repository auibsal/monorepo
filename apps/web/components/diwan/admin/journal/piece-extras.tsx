"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/brand/components/ui/button";
import { Label } from "@repo/brand/components/ui/label";
import type { Locale } from "@repo/internationalization";
import { localized, unwrap } from "@repo/sal-data";
import { buckets, removeFiles, uploadReading } from "@repo/storage";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useState } from "react";
import { FileInput } from "@/components/fields/file-input";
import { ErrorLine, Field, SaveButton, SelectInput } from "../kit";
import type { PieceRecord } from "./workflow";

const useRefresh = () => {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: ["admin", "journal"] });
};

/**
 * The clip paired with the piece (design review A12): any piece from the
 * Video section, shown after the text while it is published.
 */
const Clip = ({ record }: { record: PieceRecord }) => {
  const t = useTranslations("diwan.admin.qirtas.extras");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const refresh = useRefresh();
  const { piece } = record;
  const [clipId, setClipId] = useState(piece?.clip_id ?? "");
  useEffect(() => setClipId(piece?.clip_id ?? ""), [piece?.clip_id]);
  const clips = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("journal")
          .from("pieces")
          .select("id, title_en, title_ar")
          .eq("desk", "video")
          .neq("id", piece?.id ?? "")
          .order("updated_at", { ascending: false })
          .limit(120)
      ) ?? [],
    queryKey: ["admin", "journal", "clips"],
  });
  const save = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase
          .schema("journal")
          .from("pieces")
          .update({ clip_id: clipId || null })
          .eq("id", piece?.id ?? "")
      ),
    onSettled: refresh,
  });
  return (
    <form
      className="grid max-w-xl gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate();
      }}
    >
      <Field hint={t("clipHint")} label={t("clip")}>
        {(fieldId) => (
          <SelectInput
            id={fieldId}
            onChange={(e) => setClipId(e.target.value)}
            value={clipId}
          >
            <option value="">{t("noClip")}</option>
            {clips.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {localized(c, "title", locale)}
              </option>
            ))}
          </SelectInput>
        )}
      </Field>
      <SaveButton pending={save.isPending} success={save.isSuccess} />
      <ErrorLine error={save.error} />
    </form>
  );
};

const READING_PROBLEMS = ["readings_full", "too_large", "type_not_allowed"];

/** Why a reading was refused, in words where the reason is known. */
const ReadingError = ({ error }: { error: Error | null }) => {
  const t = useTranslations("diwan.admin.qirtas.extras.problems");
  const known = READING_PROBLEMS.find((p) => error?.message.includes(p));
  return known ? (
    <p className="text-text text-sm" role="alert">
      {t(known as "readings_full")}
    </p>
  ) : (
    <ErrorLine error={error} />
  );
};

/**
 * The piece read aloud (design review A11, decision D10): one short
 * recording, in a public bucket, never for a members-only piece.
 */
const ReadingFile = ({ record }: { record: PieceRecord }) => {
  const t = useTranslations("diwan.admin.qirtas.extras");
  const { supabase } = useAuth();
  const refresh = useRefresh();
  const id = useId();
  const { piece } = record;
  const path = piece?.reading_path ?? null;
  const setPath = async (next: string | null) =>
    unwrap(
      await supabase
        .schema("journal")
        .from("pieces")
        .update({ reading_path: next })
        .eq("id", piece?.id ?? "")
    );
  const upload = useMutation({
    mutationFn: async (file: File) => {
      const stored = await uploadReading(supabase, piece?.id ?? "", file);
      try {
        await setPath(stored.path);
      } catch (error) {
        // The piece refused it (members only, or Qirtas has its thirty).
        await removeFiles(supabase, buckets.readings.id, [stored.path]);
        throw error;
      }
      if (path) {
        await removeFiles(supabase, buckets.readings.id, [path]);
      }
    },
    onSettled: refresh,
  });
  const remove = useMutation({
    mutationFn: async () => {
      if (path) {
        await setPath(null);
        await removeFiles(supabase, buckets.readings.id, [path]);
      }
    },
    onSettled: refresh,
  });
  if (piece?.members_only) {
    return <p className="type-caption">{t("readingMembersOnly")}</p>;
  }
  return (
    <div className="grid max-w-xl gap-3">
      {path ? (
        <div className="grid gap-2">
          <p className="text-sm font-medium">{t("reading")}</p>
          {/* biome-ignore lint/a11y/useMediaCaption: a reading of the piece's own text */}
          <audio
            className="w-full"
            controls
            preload="none"
            src={
              supabase.storage.from(buckets.readings.id).getPublicUrl(path).data
                .publicUrl
            }
          />
          <Button
            className="justify-self-start"
            disabled={remove.isPending}
            onClick={() => remove.mutate()}
            size="sm"
            type="button"
            variant="ghost"
          >
            {t("removeReading")}
          </Button>
        </div>
      ) : null}
      <Label htmlFor={id}>{path ? t("replaceReading") : t("addReading")}</Label>
      <FileInput
        accept={buckets.readings.mimeTypes.join(",")}
        disabled={upload.isPending}
        id={id}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            upload.mutate(file);
          }
          e.target.value = "";
        }}
      />
      <p className="type-caption">{t("readingHint")}</p>
      <ReadingError error={upload.error ?? remove.error} />
    </div>
  );
};

/** A piece's clip and reading, on its page in the Diwan. */
export const PieceExtras = ({ record }: { record: PieceRecord }) => {
  const t = useTranslations("diwan.admin.qirtas.extras");
  return (
    <section className="grid gap-6">
      <h2 className="type-subheading">{t("title")}</h2>
      <Clip record={record} />
      <ReadingFile record={record} />
    </section>
  );
};
