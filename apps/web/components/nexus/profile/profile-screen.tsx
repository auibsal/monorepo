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
    family_name_ar: "",
    family_name_en: "",
    given_name_ar: "",
    given_name_en: "",
    notify_email: true,
  });

  useEffect(() => {
    if (profile.data) {
      setForm({
        bio: profile.data.bio ?? "",
        camera_shy: profile.data.camera_shy,
        family_name_ar: profile.data.family_name_ar ?? "",
        family_name_en: profile.data.family_name_en ?? "",
        given_name_ar: profile.data.given_name_ar ?? "",
        given_name_en: profile.data.given_name_en ?? "",
        notify_email: profile.data.notify_email,
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
    const named = [
      form.given_name_en,
      form.family_name_en,
      form.given_name_ar,
      form.family_name_ar,
    ].every((part) => part.trim() !== "");
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
            <div className="grid gap-2">
              <Label htmlFor={`${id}-given_name_en`}>
                {t("setup.name.givenEn")}
              </Label>
              <Input
                dir="ltr"
                id={`${id}-given_name_en`}
                lang="en"
                maxLength={60}
                onChange={(e) =>
                  setForm((f) => ({ ...f, given_name_en: e.target.value }))
                }
                required
                value={form.given_name_en}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`${id}-family_name_en`}>
                {t("setup.name.familyEn")}
              </Label>
              <Input
                dir="ltr"
                id={`${id}-family_name_en`}
                lang="en"
                maxLength={60}
                onChange={(e) =>
                  setForm((f) => ({ ...f, family_name_en: e.target.value }))
                }
                required
                value={form.family_name_en}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`${id}-given_name_ar`}>
                {t("setup.name.givenAr")}
              </Label>
              <Input
                dir="rtl"
                id={`${id}-given_name_ar`}
                lang="ar"
                maxLength={60}
                onChange={(e) =>
                  setForm((f) => ({ ...f, given_name_ar: e.target.value }))
                }
                required
                value={form.given_name_ar}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`${id}-family_name_ar`}>
                {t("setup.name.familyAr")}
              </Label>
              <Input
                dir="rtl"
                id={`${id}-family_name_ar`}
                lang="ar"
                maxLength={60}
                onChange={(e) =>
                  setForm((f) => ({ ...f, family_name_ar: e.target.value }))
                }
                required
                value={form.family_name_ar}
              />
            </div>
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
              checked={form.notify_email}
              id={`${id}-notify`}
              onCheckedChange={(v) =>
                setForm((f) => ({ ...f, notify_email: v === true }))
              }
            />
            <Label className="leading-normal" htmlFor={`${id}-notify`}>
              {t("setup.notifications")}
            </Label>
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
