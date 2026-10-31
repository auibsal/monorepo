"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/design-system/components/ui/button";
import type { Locale } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import { localized, names, unwrap } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { type FormEvent, useEffect, useState } from "react";
import { Perks } from "@/components/nexus/home/membership-card";
import { DiwanPage, DiwanSection, RowList } from "@/components/nexus/page";
import { DeleteAccount } from "@/components/nexus/profile/delete-account";
import { EmailNotices } from "@/components/nexus/profile/email-notices";
import { Passkeys } from "@/components/nexus/profile/passkeys";
import { NamePartsFields } from "@/components/nexus/setup-form";
import { ErrorState, SectionSpinner } from "@/components/nexus/states";
import { useGuestOf, useMyPartners } from "@/lib/nexus/partners";
import { queryKeys, useProfile } from "@/lib/nexus/queries";

interface Application extends Record<string, unknown> {
  name_ar: string | null;
  name_en: string;
  partner_status: string;
}

/** The organization this person applied for, while it waits. */
const useWaitingApplication = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async () => {
      const row = ((unwrap(
        await supabase.schema("governance").rpc("my_partner_application")
      ) ?? [])[0] ?? null) as Application | null;
      return row?.partner_status === "prospect" ? row : null;
    },
    queryKey: ["partner-application", "waiting", user?.id ?? ""],
  });
};

/**
 * /account (owner, Oct 31, 2026): the account of someone who is not a
 * member. Membership is for AUIB addresses; everyone else is here as a
 * partner's guest (perks, booking places, writing for Qirtas), on a
 * partner's team (its dashboard) or applying to partner.
 */
export const AccountHome = () => {
  const t = useTranslations("nexus.accountHome");
  const locale = useLocale() as Locale;
  const profile = useProfile();
  const guestOf = useGuestOf();
  const teams = useMyPartners();
  const application = useWaitingApplication();

  if (
    guestOf.isPending ||
    teams.isPending ||
    application.isPending ||
    profile.isPending
  ) {
    return <SectionSpinner />;
  }
  if (guestOf.isError || teams.isError || application.isError) {
    return (
      <ErrorState
        onRetry={() =>
          Promise.all([
            guestOf.refetch(),
            teams.refetch(),
            application.refetch(),
          ])
        }
      />
    );
  }
  const verified = guestOf.data.filter((g) => g.status === "verified");
  const pending = guestOf.data.filter((g) => g.status === "pending");
  const name = profile.data ? localized(profile.data, "full_name", locale) : "";
  const nothing =
    guestOf.data.length === 0 && teams.data.length === 0 && !application.data;

  return (
    <DiwanPage
      actions={
        <Link className="link" href="/account/record">
          {t("record")}
        </Link>
      }
      lede={t("lede")}
      title={name || t("title")}
    >
      <DiwanSection id="partners" title={t("partners")}>
        <RowList>
          {teams.data.map((partner) => (
            <li className="grid gap-1" key={partner.id}>
              <Link className="link font-medium" href="/partners/dashboard">
                {t("team", { name: localized(partner, "name", locale) })}
              </Link>
              <p className="type-caption">{t("teamLine")}</p>
            </li>
          ))}
          {verified.map((guest) => (
            <li className="grid gap-1" key={`guest-${guest.name_en}`}>
              <p className="font-medium">
                {t("guest", { name: localized(guest, "name", locale) })}
              </p>
              <p className="type-caption">{t("guestLine")}</p>
            </li>
          ))}
          {pending.map((guest) => (
            <li className="grid gap-1" key={`pending-${guest.name_en}`}>
              <p className="font-medium">
                {t("pending", { name: localized(guest, "name", locale) })}
              </p>
              <p className="type-caption">{t("pendingLine")}</p>
            </li>
          ))}
          {application.data ? (
            <li className="grid gap-1">
              <Link className="link font-medium" href="/partners/join">
                {t("applied", {
                  name: localized(application.data, "name", locale),
                })}
              </Link>
              <p className="type-caption">{t("appliedLine")}</p>
            </li>
          ) : null}
          {nothing ? (
            <li className="grid gap-1">
              <p className="type-body">{t("nothing")}</p>
              <Link className="link justify-self-start" href="/partners">
                {t("aboutPartners")}
              </Link>
            </li>
          ) : null}
        </RowList>
      </DiwanSection>
      {verified.length > 0 ? (
        <>
          <DiwanSection id="do" title={t("do")}>
            <RowList>
              <li className="grid gap-1">
                <Link className="link font-medium" href="/account/calendar">
                  {t("book")}
                </Link>
                <p className="type-caption">{t("bookLine")}</p>
              </li>
              <li className="grid gap-1">
                <Link className="link font-medium" href="/qirtas/write">
                  {t("write")}
                </Link>
                <p className="type-caption">{t("writeLine")}</p>
              </li>
              <li className="grid gap-1">
                <Link className="link font-medium" href="/membership/work">
                  {t("work")}
                </Link>
                <p className="type-caption">{t("workLine")}</p>
              </li>
            </RowList>
          </DiwanSection>
          <Perks how={t("perksHow")} />
        </>
      ) : null}
    </DiwanPage>
  );
};

/** Their name in four parts in each language, as on their papers. */
const NamesForm = () => {
  const t = useTranslations("nexus");
  const tc = useTranslations("common");
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  const profile = useProfile();
  const [form, setForm] = useState({
    ar: names.emptyParts(),
    en: names.emptyParts(),
  });
  useEffect(() => {
    if (profile.data) {
      setForm({
        ar: names.partsFrom(profile.data, "ar"),
        en: names.partsFrom(profile.data, "en"),
      });
    }
  }, [profile.data]);
  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .schema("core")
        .from("profiles")
        .update({
          ...names.partsUpdate(form.en, "en"),
          ...names.partsUpdate(form.ar, "ar"),
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
  let label = tc("save");
  if (save.isPending) {
    label = tc("saving");
  } else if (save.isSuccess) {
    label = tc("saved");
  }
  const complete = names.partsComplete(form.en) && names.partsComplete(form.ar);
  return (
    <form
      className="grid gap-4"
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        if (complete) {
          save.mutate();
        }
      }}
    >
      {(["en", "ar"] as const).map((lang) => (
        <fieldset className="grid gap-3" key={lang}>
          <legend className="mb-2 font-medium text-sm">
            {t(`setup.name.${lang}`)}
          </legend>
          <NamePartsFields
            language={lang}
            onChange={(parts) => setForm((f) => ({ ...f, [lang]: parts }))}
            parts={form[lang]}
          />
        </fieldset>
      ))}
      <p className="type-caption">{t("setup.name.hint")}</p>
      {save.isError ? (
        <p className="text-text" role="alert">
          {t("errors.saveFailed")}
        </p>
      ) : null}
      <Button
        className="justify-self-start"
        disabled={save.isPending || !complete}
        type="submit"
      >
        {label}
      </Button>
    </form>
  );
};

/** /account/settings: their name, email notices, sign-in and deletion. */
export const AccountSettings = () => {
  const t = useTranslations("nexus");
  return (
    <DiwanPage
      lede={t("accountHome.settingsLede")}
      narrow
      title={t("settings.title")}
    >
      <DiwanSection id="name" title={t("accountHome.name")}>
        <NamesForm />
      </DiwanSection>
      <DiwanSection id="email" title={t("settings.noticesEmail")}>
        <EmailNotices />
      </DiwanSection>
      <Passkeys />
      <DeleteAccount />
    </DiwanPage>
  );
};
