"use client";

import { Button } from "@repo/brand/components/ui/button";
import { Checkbox } from "@repo/brand/components/ui/checkbox";
import { Input } from "@repo/brand/components/ui/input";
import { Label } from "@repo/brand/components/ui/label";
import { Textarea } from "@repo/brand/components/ui/textarea";
import { formatNumber } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { type FormEvent, useEffect, useId, useState } from "react";
import { useAuth } from "@/lib/auth/provider";
import { membership, names } from "@/lib/data";
import { queryKeys, useProfile } from "@/lib/diwan/queries";
import { DiwanPage, DiwanSection } from "../page";
import { NamePartsFields } from "../setup-form";
import { ErrorState, SectionSpinner } from "../states";

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
    preferred: { first_ar: "", first_en: "", last_ar: "", last_en: "" },
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
        preferred: {
          first_ar: profile.data.preferred_first_ar ?? "",
          first_en: profile.data.preferred_first_en ?? "",
          last_ar: profile.data.preferred_last_ar ?? "",
          last_en: profile.data.preferred_last_en ?? "",
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
          preferred_first_ar: form.preferred.first_ar.trim() || null,
          preferred_first_en: form.preferred.first_en.trim() || null,
          preferred_last_ar: form.preferred.last_ar.trim() || null,
          preferred_last_en: form.preferred.last_en.trim() || null,
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
              <legend className="mb-2 text-sm font-medium">
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
          {/* A preferred name (decisions §19): shown in place of the legal
              first or last name on the site, the card and the Council page. */}
          <fieldset className="grid gap-3">
            <legend className="mb-2 text-sm font-medium">
              {t("profile.preferred.title")}
            </legend>
            <p className="type-caption">{t("profile.preferred.hint")}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {(["first_en", "last_en", "first_ar", "last_ar"] as const).map(
                (part) => (
                  <div className="grid gap-2" key={part}>
                    <Label htmlFor={`${id}-${part}`}>
                      {t(`profile.preferred.${part}`)}
                    </Label>
                    <Input
                      dir={part.endsWith("_ar") ? "rtl" : "ltr"}
                      id={`${id}-${part}`}
                      lang={part.endsWith("_ar") ? "ar" : "en"}
                      maxLength={60}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          preferred: { ...f.preferred, [part]: e.target.value },
                        }))
                      }
                      value={form.preferred[part]}
                    />
                  </div>
                )
              )}
            </div>
          </fieldset>
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
            <legend className="mb-2 text-sm font-medium">
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
              {t("errors.saveFailed")}
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
    </DiwanPage>
  );
};
