"use client";

import { useAuth } from "@repo/auth/provider";
import type { Locale } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { hasPermission, type Permission } from "@repo/rbac";
import { forms, unwrap } from "@repo/sal-data";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useGrants, useMemberStatus } from "@/lib/nexus/queries";
import { DiwanPage, DiwanSection, RowList } from "../page";
import { EmptyLine, SectionSpinner } from "../states";

type FormType = Awaited<ReturnType<typeof forms.formTypes>>[number];

/** Whether the person may start this form (the database checks again). */
export const useMayStart = () => {
  const grants = useGrants();
  const status = useMemberStatus();
  return (type: FormType) => {
    switch (type.submit_rule) {
      case "anyone":
        return true;
      case "member":
        return Boolean(status.data?.is_member);
      case "role_holder":
        return (grants.data ?? []).length > 0;
      case "handler":
        return hasPermission(grants.data, type.handle_permission as Permission);
      default:
        return false;
    }
  };
};

export const useFormTypes = () => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: () => forms.formTypes(supabase),
    queryKey: ["forms", "types"],
    staleTime: 60 * 60 * 1000,
  });
};

const FormTitle = ({ formKey }: { formKey: string }) => {
  const t = useTranslations("nexus.forms.defs");
  return <>{t(`${formKey}.title` as Parameters<typeof t>[0])}</>;
};

/**
 * Where a request starts, in the section it belongs to: the plain action
 * ("Pitch a program") and one line on what it is for. Only the ones this
 * person may start are listed; the database checks again on sending.
 */
export const StartLinks = ({ keys }: { readonly keys?: readonly string[] }) => {
  const td = useTranslations("nexus.forms.defs");
  const types = useFormTypes();
  const mayStart = useMayStart();
  const available = (types.data ?? []).filter(
    (type) => (!keys || keys.includes(type.key)) && mayStart(type)
  );
  if (keys) {
    available.sort((a, b) => keys.indexOf(a.key) - keys.indexOf(b.key));
  }
  if (available.length === 0) {
    return null;
  }
  return (
    <RowList>
      {available.map((type) => (
        <li key={type.key}>
          <Link
            className="group grid gap-1"
            href={{
              pathname: "/membership/requests/new",
              query: { form: type.key },
            }}
          >
            <span className="font-medium underline-offset-4 group-hover:text-accent group-hover:underline group-focus-visible:text-accent">
              {td(`${type.key}.action` as Parameters<typeof td>[0])}
            </span>
            <span className="type-caption">
              {td(`${type.key}.purpose` as Parameters<typeof td>[0])}
            </span>
          </Link>
        </li>
      ))}
    </RowList>
  );
};

interface Sent {
  created_at: string;
  form_key: string;
  id: string;
  status: string;
  subject_user_id: string | null;
  submitted_at: string | null;
  submitted_by: string | null;
}

/** What this person has sent, or what was sent about them. */
export const useMySent = () => {
  const { supabase, user } = useAuth();
  return useQuery({
    enabled: Boolean(user),
    queryFn: async (): Promise<Sent[]> =>
      unwrap(
        await supabase
          .schema("governance")
          .from("form_submissions")
          .select(
            "id, form_key, status, submitted_at, created_at, submitted_by, subject_user_id"
          )
          .or(`submitted_by.eq.${user?.id},subject_user_id.eq.${user?.id}`)
          .order("created_at", { ascending: false })
      ) ?? [],
    queryKey: ["forms", "mine", user?.id],
  });
};

/** The rows of what was sent: a draft reopens, the rest open read-only. */
export const SentList = ({ limit }: { readonly limit?: number }) => {
  const t = useTranslations("nexus.forms");
  const locale = useLocale() as Locale;
  const { user } = useAuth();
  const mine = useMySent();
  if (mine.isPending) {
    return <SectionSpinner />;
  }
  const rows = (mine.data ?? []).slice(0, limit);
  if (rows.length === 0) {
    return <p className="type-body text-text-secondary">{t("noMine")}</p>;
  }
  return (
    <RowList>
      {rows.map((s) => (
        <li
          className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1"
          key={s.id}
        >
          <Link
            className="link"
            href={
              s.status === "draft"
                ? {
                    pathname: "/membership/requests/new",
                    query: { form: s.form_key, id: s.id },
                  }
                : { pathname: "/membership/requests/view", query: { id: s.id } }
            }
          >
            <FormTitle formKey={s.form_key} />
          </Link>
          <span className="type-caption">
            {t(`statuses.${s.status as forms.FormStatus}`)} ·{" "}
            {formatLongDate(s.submitted_at ?? s.created_at, locale, true)}
            {s.subject_user_id === user?.id && s.submitted_by !== user?.id
              ? ` · ${t("aboutYou")}`
              : ""}
          </span>
        </li>
      ))}
    </RowList>
  );
};

/**
 * Requests and reports: what you have sent and where each stands, and
 * everything you may start. The same actions also sit in the sections
 * they belong to (Society, Programs, Profile, Administration).
 */
export const Forms = () => {
  const t = useTranslations("nexus.forms");
  const types = useFormTypes();
  const mayStart = useMayStart();
  const none = types.data && types.data.filter(mayStart).length === 0;

  return (
    <DiwanPage lede={t("lede")} narrow title={t("title")}>
      <DiwanSection
        description={t("concern.lede")}
        id="concern"
        title={t("concern.title")}
      >
        <StartLinks keys={["f20"]} />
      </DiwanSection>
      <DiwanSection id="sent" title={t("mine")}>
        <SentList />
      </DiwanSection>
      <DiwanSection id="start" title={t("available")}>
        {types.isPending ? <SectionSpinner /> : null}
        {none ? (
          <EmptyLine action={{ href: "/membership", label: t("toProfile") }}>
            {t("noneAvailable")}
          </EmptyLine>
        ) : null}
        <StartLinks />
      </DiwanSection>
    </DiwanPage>
  );
};
