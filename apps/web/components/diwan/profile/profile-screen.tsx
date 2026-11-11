"use client";

import { Button } from "@repo/brand/components/ui/button";
import { Checkbox } from "@repo/brand/components/ui/checkbox";
import { Input } from "@repo/brand/components/ui/input";
import { Label } from "@repo/brand/components/ui/label";
import { Textarea } from "@repo/brand/components/ui/textarea";
import {
  formatLongDate,
  formatNumber,
} from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
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
    preferred: { ar: "", en: "" },
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
          ar: profile.data.preferred_name_ar ?? "",
          en: profile.data.preferred_name_en ?? "",
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
  const locale = useLocale();
  const lockedAt = profile.data?.legal_name_locked_at ?? null;
  // The member checks their legal name before it locks (decisions.md, Members).
  const [checking, setChecking] = useState(false);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .schema("core")
        .from("profiles")
        .update({
          // A locked legal name is not the member's to change.
          ...(lockedAt
            ? {}
            : {
                ...names.partsUpdate(form.names.en, "en"),
                ...names.partsUpdate(form.names.ar, "ar"),
              }),
          bio: form.bio.trim() || null,
          camera_shy: form.camera_shy,
          preferred_name_ar: form.preferred.ar.trim() || null,
          preferred_name_en: form.preferred.en.trim() || null,
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

  const lock = useMutation({
    mutationFn: async () => {
      // Saved first, so what is locked is what the member checked.
      await save.mutateAsync();
      const { error } = await supabase.schema("core").rpc("lock_legal_name");
      if (error) {
        throw error;
      }
    },
    onSuccess: () => setChecking(false),
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

  const preferredOk =
    names.inScript(form.preferred.en, "en") &&
    names.inScript(form.preferred.ar, "ar");
  const legalComplete =
    names.partsReady(form.names.en, "en") &&
    names.partsReady(form.names.ar, "ar");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const named =
      lockedAt !== null ||
      (names.partsInScript(form.names.en, "en") &&
        names.partsInScript(form.names.ar, "ar"));
    if (words <= membership.BIO_MAX_WORDS && named && preferredOk) {
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
          <h3 className="type-subheading">{t("profile.legal.title")}</h3>
          {lockedAt ? (
            <div className="grid gap-2">
              {(["en", "ar"] as const).map((lang) => (
                <p dir={lang === "ar" ? "rtl" : "ltr"} key={lang} lang={lang}>
                  {names.nameParts
                    .map((part) => form.names[lang][part].trim())
                    .filter(Boolean)
                    .join(" ")}
                </p>
              ))}
              <p className="type-caption">
                {t("profile.legal.locked", {
                  date: formatLongDate(lockedAt, locale),
                })}
              </p>
            </div>
          ) : (
            <>
              {(["en", "ar"] as const).map((lang) => (
                <fieldset className="grid gap-3" key={lang}>
                  <legend className="mb-2 text-sm font-medium">
                    {t(`setup.name.${lang}`)}
                  </legend>
                  <NamePartsFields
                    language={lang}
                    onChange={(parts) => {
                      setChecking(false);
                      setForm((f) => ({
                        ...f,
                        names: { ...f.names, [lang]: parts },
                      }));
                    }}
                    parts={form.names[lang]}
                  />
                </fieldset>
              ))}
              <p className="type-caption">{t("setup.name.hint")}</p>
              {checking ? (
                <div className="border-line grid gap-3 border-y py-4">
                  <p className="type-body font-medium">
                    {t("profile.legal.checkTitle")}
                  </p>
                  {(["en", "ar"] as const).map((lang) => (
                    <p
                      dir={lang === "ar" ? "rtl" : "ltr"}
                      key={lang}
                      lang={lang}
                    >
                      {names.nameParts
                        .map((part) => form.names[lang][part].trim())
                        .filter(Boolean)
                        .join(" ")}
                    </p>
                  ))}
                  <p className="type-body text-text-secondary">
                    {t("profile.legal.checkBody")}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                    <Button
                      disabled={lock.isPending}
                      onClick={() => lock.mutate()}
                      type="button"
                      variant="outline"
                    >
                      {t("profile.legal.confirm")}
                    </Button>
                    <button
                      className="link"
                      onClick={() => setChecking(false)}
                      type="button"
                    >
                      {t("profile.legal.edit")}
                    </button>
                  </div>
                  {lock.isError ? (
                    <p className="text-text" role="alert">
                      {t("profile.legal.lockFailed")}
                    </p>
                  ) : null}
                </div>
              ) : (
                <button
                  className="link justify-self-start"
                  disabled={!legalComplete}
                  onClick={() => setChecking(true)}
                  type="button"
                >
                  {t("profile.legal.check")}
                </button>
              )}
            </>
          )}
          {/* The preferred name (decisions.md, Members): one whole name per
              language, shown everywhere but certificates, letters and
              signed forms. Empty means the default. */}
          <fieldset className="grid gap-3">
            <legend className="mb-2 text-sm font-medium">
              {t("profile.preferred.title")}
            </legend>
            <p className="type-caption">{t("profile.preferred.hint")}</p>
            {(["en", "ar"] as const).map((lang) => (
              <div className="grid max-w-xl gap-2" key={lang}>
                <Label htmlFor={`${id}-preferred-${lang}`}>
                  {t(`profile.preferred.${lang}`)}
                </Label>
                <Input
                  aria-invalid={!names.inScript(form.preferred[lang], lang)}
                  dir={lang === "ar" ? "rtl" : "ltr"}
                  id={`${id}-preferred-${lang}`}
                  lang={lang}
                  maxLength={120}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      preferred: { ...f.preferred, [lang]: e.target.value },
                    }))
                  }
                  value={form.preferred[lang]}
                />
                {form.preferred[lang] ? (
                  <button
                    className="link justify-self-start"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        preferred: { ...f.preferred, [lang]: "" },
                      }))
                    }
                    type="button"
                  >
                    {t("profile.preferred.useDefault")}
                  </button>
                ) : null}
              </div>
            ))}
            {preferredOk ? null : (
              <p className="type-caption" role="alert">
                {t("profile.preferred.script")}
              </p>
            )}
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
