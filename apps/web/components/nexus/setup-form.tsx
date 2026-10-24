"use client";

import { useAuth } from "@repo/auth/provider";
import { SalCard } from "@repo/design-system/components/sal/card";
import { FormHeader } from "@repo/design-system/components/sal/form-header";
import { Button } from "@repo/design-system/components/ui/button";
import { Checkbox } from "@repo/design-system/components/ui/checkbox";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import {
  RadioGroup,
  RadioGroupItem,
} from "@repo/design-system/components/ui/radio-group";
import { useRouter } from "@repo/internationalization/navigation";
import { content, membership } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { type FormEvent, useEffect, useId, useState } from "react";
import { safeNextPath, stripLocale } from "@/lib/nexus/navigation";
import { useMemberStatus, useProfile } from "@/lib/nexus/queries";
import { DetailsFields } from "./profile/details-fields";
import { ErrorState, FullPageSpinner } from "./states";

type PledgeKind = "human_authorship" | "member";

const SPACES = /\s+/;

const blankNames = { familyAr: "", familyEn: "", givenAr: "", givenEn: "" };

/**
 * The four name parts, or a first guess from a full name given before the
 * parts were asked for (first word, then the rest), for the member to fix.
 */
const namesFrom = (profile: {
  family_name_ar: string | null;
  family_name_en: string | null;
  full_name_ar: string | null;
  full_name_en: string;
  given_name_ar: string | null;
  given_name_en: string | null;
}) => {
  const split = (full: string | null) => {
    const [first = "", ...rest] = (full ?? "").trim().split(SPACES);
    return { family: rest.join(" "), given: first };
  };
  const en = split(profile.full_name_en);
  const ar = split(profile.full_name_ar);
  return {
    familyAr: profile.family_name_ar ?? ar.family,
    familyEn: profile.family_name_en ?? en.family,
    givenAr: profile.given_name_ar ?? ar.given,
    givenEn: profile.given_name_en ?? en.given,
  };
};

const usePledgeVersions = () => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: async () => {
      const [human, member] = await Promise.all([
        content.publicSetting(supabase, "pledges.human_authorship.version"),
        content.publicSetting(supabase, "pledges.member.version"),
      ]);
      return {
        human_authorship: String(human ?? "1"),
        member: String(member ?? "1"),
      } as Record<PledgeKind, string>;
    },
    queryKey: ["pledge-versions"],
  });
};

const setupIntro = (
  t: ReturnType<typeof useTranslations<"nexus.setup">>,
  isRenewal: boolean,
  completed: boolean
) => {
  if (isRenewal) {
    return t("renewed");
  }
  // Setup done before names were asked for: only the name is missing.
  return completed ? t("name.needed") : t("description");
};

/**
 * After verification: the two required pledges (stored with their version)
 * and the member's choices. Also shown again when a pledge version changes.
 */
export const SetupForm = () => {
  const t = useTranslations("nexus.setup");
  const te = useTranslations("nexus.errors");
  const td = useTranslations("nexus.details");
  const { supabase, user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const next = safeNextPath(useSearchParams().get("next"));
  const status = useMemberStatus();
  const profile = useProfile();
  const versions = usePledgeVersions();
  const id = useId();

  const [accepted, setAccepted] = useState<Record<PledgeKind, boolean>>({
    human_authorship: false,
    member: false,
  });
  const [name, setName] = useState(blankNames);
  const [details, setDetails] = useState(membership.emptyDetails);
  const [prefs, setPrefs] = useState({
    camera_shy: false,
    locale: "en" as "en" | "ar",
    notify_email: true,
    personal_email: "",
  });

  useEffect(() => {
    if (profile.data) {
      setName(namesFrom(profile.data));
      setPrefs({
        camera_shy: profile.data.camera_shy,
        locale: profile.data.locale === "ar" ? "ar" : "en",
        notify_email: profile.data.notify_email,
        personal_email: profile.data.personal_email ?? "",
      });
    }
  }, [profile.data]);

  const pending = status.data?.pending_pledges ?? [];
  const isRenewal =
    Boolean(profile.data?.setup_completed_at) && pending.length > 0;

  const saved = useQuery({
    enabled: Boolean(user),
    queryFn: () => membership.myDetails(supabase, user?.id ?? ""),
    queryKey: ["member-details", user?.id],
  });
  useEffect(() => {
    if (saved.data) {
      setDetails(saved.data);
    }
  }, [saved.data]);

  const save = useMutation({
    mutationFn: async () => {
      await membership.saveDetails(supabase, user?.id ?? "", details);
      await Promise.all(
        pending.map((kind) =>
          membership.acceptPledge(supabase, kind, versions.data?.[kind] ?? "1")
        )
      );
      const { error } = await supabase
        .schema("core")
        .from("profiles")
        .update({
          ...prefs,
          family_name_ar: name.familyAr.trim(),
          family_name_en: name.familyEn.trim(),
          given_name_ar: name.givenAr.trim(),
          given_name_en: name.givenEn.trim(),
          personal_email: prefs.personal_email.trim() || null,
          setup_completed_at:
            profile.data?.setup_completed_at ?? new Date().toISOString(),
        })
        .eq("id", user?.id ?? "");
      if (error) {
        throw error;
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries();
      router.replace(next ? stripLocale(next) : "/account", {
        locale: prefs.locale,
      });
    },
  });

  if (status.isPending || profile.isPending || versions.isPending) {
    return <FullPageSpinner />;
  }
  if (status.isError || profile.isError || versions.isError) {
    return <ErrorState onRetry={() => status.refetch()} />;
  }

  const named = Object.values(name).every((part) => part.trim() !== "");
  const ready = named && pending.every((kind) => accepted[kind]);
  // Your name, one step per pending pledge, then the choices (always ready).
  const total = pending.length + 2;
  const done =
    (named ? 1 : 0) +
    pending.filter((kind) => accepted[kind]).length +
    (ready ? 1 : 0);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (ready) {
      save.mutate();
    }
  };

  return (
    <>
      <FormHeader title={t("title")}>
        {setupIntro(t, isRenewal, Boolean(profile.data?.setup_completed_at))}
      </FormHeader>
      <div className="grid gap-2" role="status">
        <p className="type-label">
          {t("progress", { done: String(done), total: String(total) })}
        </p>
        <div
          aria-hidden="true"
          className="h-3 w-full border border-line bg-surface"
        >
          <div
            className="h-full bg-band transition-[width]"
            style={{ width: `${(done / total) * 100}%` }}
          />
        </div>
      </div>
      <form className="grid gap-6" onSubmit={submit}>
        <fieldset className="grid gap-4">
          <legend className="type-subheading mb-2">{t("name.title")}</legend>
          <p className="type-caption" id={`${id}-name-hint`}>
            {t("name.hint")}
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor={`${id}-given-en`}>{t("name.givenEn")}</Label>
              <Input
                aria-describedby={`${id}-name-hint`}
                autoComplete="given-name"
                dir="ltr"
                id={`${id}-given-en`}
                lang="en"
                maxLength={60}
                onChange={(event) =>
                  setName((n) => ({ ...n, givenEn: event.target.value }))
                }
                required
                value={name.givenEn}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`${id}-family-en`}>{t("name.familyEn")}</Label>
              <Input
                aria-describedby={`${id}-name-hint`}
                autoComplete="family-name"
                dir="ltr"
                id={`${id}-family-en`}
                lang="en"
                maxLength={60}
                onChange={(event) =>
                  setName((n) => ({ ...n, familyEn: event.target.value }))
                }
                required
                value={name.familyEn}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`${id}-given-ar`}>{t("name.givenAr")}</Label>
              <Input
                aria-describedby={`${id}-name-hint`}
                dir="rtl"
                id={`${id}-given-ar`}
                lang="ar"
                maxLength={60}
                onChange={(event) =>
                  setName((n) => ({ ...n, givenAr: event.target.value }))
                }
                required
                value={name.givenAr}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`${id}-family-ar`}>{t("name.familyAr")}</Label>
              <Input
                aria-describedby={`${id}-name-hint`}
                dir="rtl"
                id={`${id}-family-ar`}
                lang="ar"
                maxLength={60}
                onChange={(event) =>
                  setName((n) => ({ ...n, familyAr: event.target.value }))
                }
                required
                value={name.familyAr}
              />
            </div>
          </div>
        </fieldset>
        {pending.length > 0 ? (
          <fieldset className="grid gap-4">
            <legend className="type-subheading mb-2">{t("pledges")}</legend>
            {pending.map((kind) => {
              const key =
                kind === "human_authorship" ? "humanAuthorship" : "member";
              return (
                <SalCard key={kind}>
                  <h2 className="type-subheading">{t(`${key}.title`)}</h2>
                  <p className="type-body text-text-secondary">
                    {t(`${key}.why`)}
                  </p>
                  <p className="type-body">{t(`${key}.body`)}</p>
                  <p className="type-caption type-code">
                    v{versions.data?.[kind]}
                  </p>
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={accepted[kind]}
                      id={`${id}-${kind}`}
                      onCheckedChange={(value) =>
                        setAccepted((current) => ({
                          ...current,
                          [kind]: value === true,
                        }))
                      }
                    />
                    <Label className="leading-normal" htmlFor={`${id}-${kind}`}>
                      {t(`${key}.accept`)}
                    </Label>
                  </div>
                </SalCard>
              );
            })}
          </fieldset>
        ) : null}

        <fieldset className="grid gap-4">
          <legend className="type-subheading mb-2">{t("preferences")}</legend>
          <div className="grid gap-2">
            <p className="text-sm" id={`${id}-locale`}>
              {t("locale")}
            </p>
            <RadioGroup
              aria-labelledby={`${id}-locale`}
              className="flex gap-6"
              onValueChange={(value) =>
                setPrefs((p) => ({
                  ...p,
                  locale: value === "ar" ? "ar" : "en",
                }))
              }
              value={prefs.locale}
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem id={`${id}-en`} value="en" />
                <Label htmlFor={`${id}-en`} lang="en">
                  English
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem id={`${id}-ar`} value="ar" />
                <Label htmlFor={`${id}-ar`} lang="ar">
                  العربية
                </Label>
              </div>
            </RadioGroup>
          </div>
          <div className="flex items-start gap-3">
            <Checkbox
              checked={prefs.notify_email}
              id={`${id}-notify`}
              onCheckedChange={(value) =>
                setPrefs((p) => ({ ...p, notify_email: value === true }))
              }
            />
            <Label className="leading-normal" htmlFor={`${id}-notify`}>
              {t("notifications")}
            </Label>
          </div>
          <div className="flex items-start gap-3">
            <Checkbox
              aria-describedby={`${id}-shy-hint`}
              checked={prefs.camera_shy}
              id={`${id}-shy`}
              onCheckedChange={(value) =>
                setPrefs((p) => ({ ...p, camera_shy: value === true }))
              }
            />
            <div className="grid gap-1">
              <Label className="leading-normal" htmlFor={`${id}-shy`}>
                {t("cameraShy")}
              </Label>
              <p className="type-caption" id={`${id}-shy-hint`}>
                {t("cameraShyHint")}
              </p>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`${id}-personal`}>{t("personalEmail")}</Label>
            <Input
              aria-describedby={`${id}-personal-hint`}
              autoComplete="email"
              dir="ltr"
              id={`${id}-personal`}
              onChange={(event) =>
                setPrefs((p) => ({ ...p, personal_email: event.target.value }))
              }
              type="email"
              value={prefs.personal_email}
            />
            <p className="type-caption" id={`${id}-personal-hint`}>
              {t("personalEmailHint")}
            </p>
          </div>
        </fieldset>

        <fieldset className="grid gap-4">
          <legend className="type-subheading mb-2">{td("title")}</legend>
          <p className="type-caption">{td("lede")}</p>
          <DetailsFields onChange={setDetails} value={details} />
        </fieldset>

        {save.isError ? (
          <p className="text-text" role="alert">
            {te("saveFailed")}
          </p>
        ) : null}
        <Button disabled={!ready || save.isPending} type="submit">
          {t("submit")}
        </Button>
      </form>
    </>
  );
};
