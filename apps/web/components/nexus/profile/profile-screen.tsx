"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/design-system/components/ui/button";
import { Checkbox } from "@repo/design-system/components/ui/checkbox";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { formatNumber } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { membership } from "@repo/sal-data";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { type FormEvent, useEffect, useId, useState } from "react";
import { queryKeys, useProfile } from "@/lib/nexus/queries";
import { DiwanPage, DiwanSection } from "../page";
import { ErrorState, SectionSpinner } from "../states";
import { Affiliations } from "./affiliations";
import { DetailsSection } from "./details-fields";

export const ProfileScreen = () => {
  const t = useTranslations("nexus");
  const tc = useTranslations("common");
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  const profile = useProfile();
  const id = useId();
  const [form, setForm] = useState({
    bio: "",
    camera_shy: false,
    full_name_ar: "",
    full_name_en: "",
  });

  useEffect(() => {
    if (profile.data) {
      setForm({
        bio: profile.data.bio ?? "",
        camera_shy: profile.data.camera_shy,
        full_name_ar: profile.data.full_name_ar ?? "",
        full_name_en: profile.data.full_name_en,
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
          ...form,
          bio: form.bio.trim() || null,
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
    const named = [form.full_name_en, form.full_name_ar].every(
      (name) => name.trim() !== ""
    );
    if (words <= membership.BIO_MAX_WORDS && named) {
      save.mutate();
    }
  };

  return (
    <DiwanPage
      actions={
        <Link className="link" href="/membership/settings">
          {t("settings.title")}
        </Link>
      }
      lede={t("profile.lede")}
      narrow
      title={t("profile.title")}
    >
      <DiwanSection id="about-you" title={t("profile.aboutYou")}>
        <form className="grid gap-4" onSubmit={submit}>
          <div className="grid gap-4 sm:grid-cols-2">
            {(["en", "ar"] as const).map((lang) => (
              <div className="grid gap-2" key={lang}>
                <Label htmlFor={`${id}-name-${lang}`}>
                  {t(`setup.name.${lang}`)}
                </Label>
                <Input
                  dir={lang === "en" ? "ltr" : "rtl"}
                  id={`${id}-name-${lang}`}
                  lang={lang}
                  maxLength={120}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      [`full_name_${lang}`]: e.target.value,
                    }))
                  }
                  required
                  value={form[`full_name_${lang}`]}
                />
              </div>
            ))}
          </div>
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
              checked={form.camera_shy}
              id={`${id}-shy`}
              onCheckedChange={(v) =>
                setForm((f) => ({ ...f, camera_shy: v === true }))
              }
            />
            <Label className="leading-normal" htmlFor={`${id}-shy`}>
              {t("setup.cameraShy")}
            </Label>
          </div>
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
      <DetailsSection />
      <Affiliations />
    </DiwanPage>
  );
};
