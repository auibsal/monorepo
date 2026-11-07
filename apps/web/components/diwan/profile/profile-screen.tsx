"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/brand/components/ui/button";
import { Checkbox } from "@repo/brand/components/ui/checkbox";
import { Label } from "@repo/brand/components/ui/label";
import { Textarea } from "@repo/brand/components/ui/textarea";
import { formatNumber } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { membership, names } from "@repo/sal-data";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { type FormEvent, useEffect, useId, useState } from "react";
import { isNameTaken } from "@/lib/diwan/errors";
import { queryKeys, useProfile } from "@/lib/diwan/queries";
import { DiwanPage, DiwanSection } from "../page";
import { NamePartsFields } from "../setup-form";
import { ErrorState, SectionSpinner } from "../states";
import { DetailsSection } from "./details-fields";

export const ProfileScreen = () => {
  const t = useTranslations("diwan");
  const tc = useTranslations("common");
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  const profile = useProfile();
  const id = useId();
  const [form, setForm] = useState({
    bio: "",
    camera_shy: false,
    names: { ar: names.emptyParts(), en: names.emptyParts() },
    title_form: "" as "" | "masculine" | "feminine",
  });

  useEffect(() => {
    if (profile.data) {
      setForm({
        bio: profile.data.bio ?? "",
        camera_shy: profile.data.camera_shy,
        names: {
          ar: names.partsFrom(profile.data, "ar"),
          en: names.partsFrom(profile.data, "en"),
        },
        title_form:
          profile.data.title_form === "feminine" ||
          profile.data.title_form === "masculine"
            ? profile.data.title_form
            : "",
      });
    }
  }, [profile.data]);

  const words = membership.wordCount(form.bio);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .schema("core")
        .from("profiles")
        .update({
          ...names.partsUpdate(form.names.en, "en"),
          ...names.partsUpdate(form.names.ar, "ar"),
          bio: form.bio.trim() || null,
          camera_shy: form.camera_shy,
          title_form: form.title_form || null,
        })
        .eq("id", user?.id ?? "");
      if (error) {
        throw error;
      }
    },
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.profile(user?.id ?? ""),
      }),
  });

  if (profile.isPending) {
    return <SectionSpinner />;
  }
  if (profile.isError) {
    return <ErrorState onRetry={() => profile.refetch()} />;
  }

  let saveLabel = tc("save");
  if (save.isPending) {
    saveLabel = tc("saving");
  } else if (save.isSuccess) {
    saveLabel = tc("saved");
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const named =
      names.partsComplete(form.names.en) && names.partsComplete(form.names.ar);
    if (words <= membership.BIO_MAX_WORDS && named) {
      save.mutate();
    }
  };

  return (
    <DiwanPage
      actions={
        <Link className="link" href="/account/settings">
          {t("settings.title")}
        </Link>
      }
      lede={t("profile.lede")}
      narrow
      title={t("profile.title")}
    >
      <DiwanSection id="about-you" title={t("profile.aboutYou")}>
        <form className="grid gap-4" onSubmit={submit}>
          {(["en", "ar"] as const).map((lang) => (
            <fieldset className="grid gap-3" key={lang}>
              <legend className="mb-2 font-medium text-sm">
                {t(`setup.name.${lang}`)}
              </legend>
              <NamePartsFields
                language={lang}
                onChange={(parts) =>
                  setForm((f) => ({
                    ...f,
                    names: { ...f.names, [lang]: parts },
                  }))
                }
                parts={form.names[lang]}
              />
            </fieldset>
          ))}
          <p className="type-caption">{t("setup.name.hint")}</p>
          <div className="grid gap-2">
            <Label htmlFor={`${id}-bio`}>{t("profile.bio")}</Label>
            <Textarea
              aria-describedby={`${id}-bio-count`}
              aria-invalid={words > membership.BIO_MAX_WORDS}
              id={`${id}-bio`}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              rows={4}
              value={form.bio}
            />
            <p
              className={
                words > membership.BIO_MAX_WORDS
                  ? "type-caption text-text"
                  : "type-caption"
              }
              id={`${id}-bio-count`}
            >
              {t("profile.bioCount", { count: formatNumber(words) })}
            </p>
          </div>
          <div className="flex items-start gap-3">
            <Checkbox
              aria-describedby={`${id}-photos-hint`}
              checked={!form.camera_shy}
              id={`${id}-photos`}
              onCheckedChange={(v) =>
                setForm((f) => ({ ...f, camera_shy: v !== true }))
              }
            />
            <div className="grid gap-1">
              <Label className="leading-normal" htmlFor={`${id}-photos`}>
                {t("profile.photos")}
              </Label>
              <p className="type-caption" id={`${id}-photos-hint`}>
                {t("profile.photosHint")}
              </p>
            </div>
          </div>
          {/* Optional (decisions §13): the Arabic form of a title that
              names you, on the Council page, the masthead, your card and
              letters. */}
          <fieldset className="grid gap-2">
            <legend className="mb-2 font-medium text-sm">
              {t("profile.titleForm")}
            </legend>
            <p className="type-caption">{t("profile.titleFormHint")}</p>
            {(["", "masculine", "feminine"] as const).map((value) => (
              <label className="flex items-center gap-2" key={value || "unset"}>
                <input
                  checked={form.title_form === value}
                  name={`${id}-title-form`}
                  onChange={() => setForm((f) => ({ ...f, title_form: value }))}
                  type="radio"
                  value={value}
                />
                <span className="type-body">
                  {t(`profile.titleForms.${value || "unset"}`)}
                </span>
              </label>
            ))}
          </fieldset>
          {save.isError ? (
            <p className="text-text" role="alert">
              {isNameTaken(save.error)
                ? t("errors.nameTaken")
                : t("errors.saveFailed")}
            </p>
          ) : null}
          <Button
            className="justify-self-start"
            disabled={save.isPending}
            type="submit"
          >
            {saveLabel}
          </Button>
        </form>
      </DiwanSection>
      <DetailsSection />
    </DiwanPage>
  );
};
