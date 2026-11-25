"use client";

import { Button } from "@repo/brand/components/ui/button";
import { Label } from "@repo/brand/components/ui/label";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { FileInput } from "@/components/fields/file-input";
import { useAuth } from "@/lib/auth/provider";
import { getMediaUrl, uploadMedia } from "@/lib/storage";
import { StorageError } from "@/lib/storage/files";
import { logoProblem } from "@/lib/storage/image-size";
import { LibraryPicker } from "./media/library";

interface ImageFieldProps {
  /** Folder in the public media bucket, e.g. "events". */
  readonly area: string;
  /**
   * "pdf" takes a PDF (issue PDFs) and shows a link instead of a preview;
   * "logo" an organization's logo, at least 600 pixels high and at most six
   * times as wide (decisions.md, Partners), with the rule under the field.
   */
  readonly kind?: "image" | "logo" | "pdf";
  readonly label?: string;
  readonly onChange: (path: string | null) => void;
  /** Object path in the media bucket, or null. */
  readonly value: string | null;
}

/**
 * The one file field (decisions.md, The site: "One media library"): the
 * current file, Remove, "Choose from library" and Upload. An upload goes to
 * the media bucket (the bucket policy decides who may) and into the
 * library; the field keeps its path. Our own consented photos only.
 */
export const ImageField = ({
  area,
  kind = "image",
  label,
  onChange,
  value,
}: ImageFieldProps) => {
  const t = useTranslations("diwan.admin.kit");
  const { supabase } = useAuth();
  const id = useId();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const reasonFor = (error: unknown) => {
    const code = error instanceof StorageError ? error.code : "";
    if (code === "too_large") {
      return t("fileReasons.too_large");
    }
    if (code === "type_not_allowed") {
      return t("fileReasons.wrong_type");
    }
    return t("fileReasons.other");
  };

  const upload = async (file: File | undefined) => {
    if (!file) {
      return;
    }
    setBusy(true);
    setProblem(null);
    try {
      const wrong = kind === "logo" ? await logoProblem(file) : null;
      if (wrong) {
        setProblem(t("uploadFailed", { reason: t(`fileReasons.${wrong}`) }));
        return;
      }
      const stored = await uploadMedia(supabase, area, file);
      onChange(stored.path);
    } catch (error) {
      setProblem(t("uploadFailed", { reason: reasonFor(error) }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label ?? t("image")}</Label>
      {value ? (
        <div className="flex flex-wrap items-end gap-3">
          {kind === "pdf" ? (
            <a
              className="text-sm break-all underline underline-offset-4"
              dir="ltr"
              href={getMediaUrl(supabase, value)}
              rel="noopener"
              target="_blank"
            >
              {value.slice(value.lastIndexOf("/") + 1)}
            </a>
          ) : (
            // biome-ignore lint/performance/noImgElement: a preview of a just-uploaded object
            <img
              alt={t("imageAlt")}
              className="h-32 w-auto"
              height={128}
              src={getMediaUrl(supabase, value)}
              width={192}
            />
          )}
          <Button
            onClick={() => onChange(null)}
            size="sm"
            type="button"
            variant="outline"
          >
            {t("removeImage")}
          </Button>
        </div>
      ) : null}
      <LibraryPicker
        kinds={
          kind === "logo"
            ? ["logo"]
            : [kind === "pdf" ? "pdf" : "image", "promo"]
        }
        onChoose={onChange}
      />
      <FileInput
        accept={
          kind === "pdf" ? "application/pdf" : "image/jpeg,image/png,image/webp"
        }
        disabled={busy}
        id={id}
        onChange={(e) => upload(e.target.files?.[0])}
      />
      <p className="type-caption">
        {busy ? t("uploading") : null}
        {!busy && kind === "image" ? t("noImageNote") : null}
        {!busy && kind === "logo" ? t("logoRule") : null}
      </p>
      {problem ? (
        <p className="text-text text-sm" role="alert">
          {problem}
        </p>
      ) : null}
    </div>
  );
};
