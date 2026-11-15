"use client";

import { Button } from "@repo/brand/components/ui/button";
import { project } from "@repo/config";
import { Link } from "@repo/internationalization/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { useAuth } from "@/lib/auth/provider";
import { localized, names, unwrap } from "@/lib/data";
import {
  queryKeys,
  useEsign,
  useMyAddresses,
  useProfile,
} from "@/lib/diwan/queries";
import { ErrorLine } from "../admin/kit";
import { Section } from "./section";

/**
 * Consent to sign electronically, for an account made before the sign-up
 * line gave it (decisions.md, Documents and forms): a to-do on Today until
 * answered. "Not now" leaves it for the page where the person next signs.
 */
export const EsignToDo = () => {
  const t = useTranslations("diwan.esign");
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const esign = useEsign();
  const answer = useMutation({
    mutationFn: async (agree: boolean) =>
      unwrap(await supabase.schema("core").rpc("answer_esign", { agree })),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["account", "esign"] }),
  });
  if (!esign.data || esign.data.asked_at || esign.data.agreed_at) {
    return null;
  }
  return (
    <Section description={t("lede")} id="esign" title={t("title")}>
      <p className="type-body max-w-[60ch]">{t("what")}</p>
      <div className="flex flex-wrap items-center gap-4">
        <Button
          disabled={answer.isPending}
          onClick={() => answer.mutate(true)}
          size="sm"
          variant="outline"
        >
          {t("agree")}
        </Button>
        <button
          className="link"
          disabled={answer.isPending}
          onClick={() => answer.mutate(false)}
          type="button"
        >
          {t("notNow")}
        </button>
      </div>
      <ErrorLine error={answer.error} />
    </Section>
  );
};

/**
 * The Arabic form of a title that names the person (decisions.md,
 * Members), for an account made before sign-up asked it: one tap.
 */
export const ArabicFormToDo = () => {
  const t = useTranslations("diwan.home.toDos.arabicForm");
  const ts = useTranslations("diwan.settings.account.arabicForms");
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  const profile = useProfile();
  const save = useMutation({
    mutationFn: async (form: "masculine" | "feminine") => {
      const { error } = await supabase
        .schema("core")
        .from("profiles")
        .update({ title_form: form })
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
  if (!profile.data || profile.data.title_form) {
    return null;
  }
  return (
    <Section description={t("lede")} id="arabic-form" title={t("title")}>
      <div className="flex flex-wrap items-center gap-4">
        {(["masculine", "feminine"] as const).map((form) => (
          <Button
            disabled={save.isPending}
            key={form}
            onClick={() => save.mutate(form)}
            size="sm"
            variant="outline"
          >
            {ts(form)}
          </Button>
        ))}
      </div>
      <ErrorLine error={save.error} />
    </Section>
  );
};

/**
 * An official name with parts missing (an account from before the
 * four-part names): nothing to type here, since only Membership corrects
 * the name; the line says how.
 */
export const NameToDo = () => {
  const t = useTranslations("diwan.home.toDos.name");
  const profile = useProfile();
  if (!profile.data || names.hasFourPartNames(profile.data)) {
    return null;
  }
  return (
    <Section id="official-name" title={t("title")}>
      <p className="type-body max-w-[60ch]">{t("body")}</p>
    </Section>
  );
};

/**
 * Someone who left AUIB with no confirmed personal email yet (decisions.md,
 * Members): the AUIB address will stop working, so Today asks until one is
 * added; once confirmed it becomes the sign-in.
 */
export const PersonalEmailToDo = () => {
  const t = useTranslations("diwan.home.toDos.personalEmail");
  const { data } = useMyAddresses();
  if (!(data?.left_auib_at && data.sign_in_auib) || data.personal_verified) {
    return null;
  }
  return (
    <Section id="personal-email" title={t("title")}>
      <p className="type-body max-w-[60ch]">{t("body")}</p>
      <Link
        className="link justify-self-start"
        href="/account/settings#account"
      >
        {t("action")}
      </Link>
    </Section>
  );
};

interface Organization {
  applied: boolean;
  domain: string;
  partner_id: string | null;
  partner_name_ar: string | null;
  partner_name_en: string | null;
  request_status: string | null;
}

/** "Not now" on the suggestion to apply, kept in this browser only. */
const HINT_KEY = "sal_partner_hint_dismissed";

const hintDismissed = (domain: string) => {
  try {
    return window.localStorage.getItem(HINT_KEY) === domain;
  } catch {
    return false;
  }
};

/**
 * An organization's address (decisions.md, Partners): someone who signed
 * up at a domain that isn't a personal provider's or AUIB's. Where a
 * partner opened that domain, they may ask to join its team (the Partner
 * Lead approves); otherwise Today suggests applying as a partner.
 */
export const OrganizationToDo = () => {
  const t = useTranslations("diwan.home.toDos.organization");
  const locale = useLocale();
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  const key = ["account", "organization", user?.id];
  const org = useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      ((unwrap(await supabase.schema("core").rpc("my_organization")) ??
        [])[0] ?? null) as Organization | null,
    queryKey: key,
  });
  const [dismissed, setDismissed] = useState(false);
  const done = () => queryClient.invalidateQueries({ queryKey: key });
  const ask = useMutation({
    mutationFn: async (partner: string) =>
      unwrap(
        await supabase
          .schema("governance")
          .rpc("ask_to_join_partner", { partner })
      ),
    onSuccess: done,
  });
  const withdraw = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase.schema("governance").rpc("withdraw_partner_join_request")
      ),
    onSuccess: done,
  });
  const { data } = org;
  if (!data) {
    return null;
  }
  if (data.partner_id) {
    const name = localized(
      { name_ar: data.partner_name_ar, name_en: data.partner_name_en },
      "name",
      locale
    );
    if (data.request_status === "declined") {
      return null;
    }
    if (data.request_status === "pending") {
      return (
        <Section id="organization" title={t("askedTitle", { name })}>
          <p className="type-body max-w-[60ch]">{t("askedBody", { name })}</p>
          <button
            className="link justify-self-start"
            disabled={withdraw.isPending}
            onClick={() => withdraw.mutate()}
            type="button"
          >
            {t("withdraw")}
          </button>
          <ErrorLine error={withdraw.error} />
        </Section>
      );
    }
    return (
      <Section id="organization" title={t("joinTitle", { name })}>
        <p className="type-body max-w-[60ch]">{t("joinBody", { name })}</p>
        <Button
          className="justify-self-start"
          disabled={ask.isPending}
          onClick={() => ask.mutate(data.partner_id ?? "")}
          variant="outline"
        >
          {t("ask")}
        </Button>
        <ErrorLine error={ask.error} />
      </Section>
    );
  }
  if (data.applied || dismissed || hintDismissed(data.domain)) {
    return null;
  }
  const notNow = () => {
    try {
      window.localStorage.setItem(HINT_KEY, data.domain);
    } catch {
      // Private browsing: hidden for this visit only.
    }
    setDismissed(true);
  };
  return (
    <Section id="organization" title={t("partnerTitle")}>
      <p className="type-body max-w-[60ch]">{t("partnerBody")}</p>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <Link className="link" href="/partners/apply">
          {t("apply")}
        </Link>
        <button
          className="link text-text-secondary"
          onClick={notNow}
          type="button"
        >
          {t("notNow")}
        </button>
      </div>
    </Section>
  );
};

/**
 * An alum's request for Associate membership (decisions.md, Members: alumni
 * sign up with another address and ask for Associate, which the Director
 * of Membership approves; Associates are 18 or older): on Today while it
 * waits, and once if it is declined. An approved request needs no line:
 * the account is an Associate's.
 */
export const AssociateRequestToDo = () => {
  const t = useTranslations("diwan.home.toDos.associate");
  const { supabase, user } = useAuth();
  const request = useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      (unwrap(
        await supabase.schema("membership").rpc("my_associate_request")
      ) ?? [])[0] ?? null,
    queryKey: ["account", "associate-request", user?.id],
  });
  const status = request.data?.status;
  if (status === "pending") {
    return (
      <Section id="associate-request" title={t("pendingTitle")}>
        <p className="type-body max-w-[60ch]">{t("pendingBody")}</p>
      </Section>
    );
  }
  if (status === "declined") {
    return (
      <Section id="associate-request" title={t("declinedTitle")}>
        <p className="type-body max-w-[60ch]">
          {t.rich("declinedBody", {
            address: project.mailboxes.hello,
            email: (chunks) => (
              <bdi>
                <a className="link" href={`mailto:${project.mailboxes.hello}`}>
                  {chunks}
                </a>
              </bdi>
            ),
          })}
        </p>
      </Section>
    );
  }
  return null;
};
