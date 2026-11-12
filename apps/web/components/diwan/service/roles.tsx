"use client";

import { Button } from "@repo/brand/components/ui/button";
import type { Locale } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth/provider";
import { forms, unwrap } from "@/lib/data";
import { useQueryParam } from "@/lib/diwan/use-query-param";
import { FormValues, useFormLabels } from "../forms/field";
import { DiwanPage, DiwanSection, RowList } from "../page";
import { EmptyLine, SectionSpinner } from "../states";

const KEY = ["account", "roles"];

const pick = (locale: string, en: string | null, ar: string | null) =>
  (locale === "ar" ? ar : en) || en || "";

/** The roles held, the current first (decisions.md, Your account). */
export const MyRoles = () => {
  const t = useTranslations("diwan.service.roles");
  const locale = useLocale() as Locale;
  const { supabase, user } = useAuth();
  const roles = useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("access")
          .from("role_assignments")
          .select("id, role, starts_at, ends_at, roles(name_en, name_ar)")
          .eq("user_id", user?.id ?? "")
          .order("starts_at", { ascending: false })
      ) ?? [],
    queryKey: [...KEY, "mine", user?.id],
  });
  const now = Date.now();
  return (
    <DiwanSection id="roles" title={t("title")}>
      {roles.isPending ? <SectionSpinner /> : null}
      {roles.data?.length === 0 ? (
        <EmptyLine action={{ href: "/get-involved", label: t("getInvolved") }}>
          {t("none")}
        </EmptyLine>
      ) : null}
      <RowList>
        {(roles.data ?? []).map((r) => {
          const ended = r.ends_at && Date.parse(r.ends_at) <= now;
          return (
            <li
              className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1"
              key={r.id}
            >
              <span className="font-medium">
                {pick(locale, r.roles?.name_en ?? r.role, r.roles?.name_ar)}
              </span>
              <span className="type-caption">
                {ended
                  ? t("held", {
                      from: formatLongDate(r.starts_at, locale, true),
                      to: formatLongDate(r.ends_at ?? "", locale, true),
                    })
                  : t("since", {
                      from: formatLongDate(r.starts_at, locale, true),
                    })}
              </span>
            </li>
          );
        })}
      </RowList>
    </DiwanSection>
  );
};

/**
 * The handover (decisions.md, Documents and forms): to sign for a role
 * that is ending or has just ended, and to countersign for the role one
 * takes over, or, as the seat's officer, when it has no holder yet.
 */
export const Handovers = () => {
  const t = useTranslations("diwan.service.handover");
  const locale = useLocale() as Locale;
  const { supabase, user } = useAuth();
  const due = useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      unwrap(await supabase.schema("access").rpc("my_handovers_due")) ?? [],
    queryKey: [...KEY, "handovers-due", user?.id],
  });
  const toCountersign = useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      unwrap(
        await supabase.schema("governance").rpc("handovers_to_countersign")
      ) ?? [],
    queryKey: [...KEY, "to-countersign", user?.id],
  });
  const rows = [
    ...(due.data ?? []).map((d) => ({
      href: `${forms.formPaths.handover}?role=${d.assignment_id}`,
      id: d.assignment_id,
      line: t("sign", { role: pick(locale, d.role_en, d.role_ar) }),
    })),
    ...(toCountersign.data ?? []).map((c) => ({
      href: `/account/roles/countersign/${c.id}`,
      id: c.id,
      line: t("countersign", {
        name: c.outgoing,
        role: pick(locale, c.role_en, c.role_ar),
      }),
    })),
  ];
  if (rows.length === 0) {
    return null;
  }
  return (
    <DiwanSection id="handovers" title={t("title")}>
      <RowList>
        {rows.map((r) => (
          <li key={r.id}>
            <Link className="link font-medium" href={r.href}>
              {r.line}
            </Link>
          </li>
        ))}
      </RowList>
    </DiwanSection>
  );
};

/**
 * The countersignature: the incoming holder (or the seat's officer) reads
 * the handover and countersigns it in the name the register holds.
 */
export const Countersign = () => {
  const t = useTranslations("diwan.service.handover");
  const locale = useLocale() as Locale;
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  const id = useQueryParam("id") ?? "";
  const labels = useFormLabels("handover");
  const list = useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      unwrap(
        await supabase.schema("governance").rpc("handovers_to_countersign")
      ) ?? [],
    queryKey: [...KEY, "to-countersign", user?.id],
  });
  const me = useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      unwrap(await supabase.schema("core").rpc("my_register_name")),
    queryKey: ["forms", "me", user?.id],
  });
  const sign = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase.schema("governance").rpc("second_sign_form", {
          signer_name: me.data ?? "",
          submission_id: id,
        })
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
  if (list.isPending) {
    return <SectionSpinner />;
  }
  const row = list.data?.find((h) => h.id === id);
  if (sign.isSuccess) {
    return (
      <EmptyLine action={{ href: "/account/roles", label: t("back") }}>
        {t("countersigned")}
      </EmptyLine>
    );
  }
  if (!row) {
    return (
      <EmptyLine action={{ href: "/account/roles", label: t("back") }}>
        {t("notFound")}
      </EmptyLine>
    );
  }
  return (
    <DiwanPage
      lede={t("countersignLede", {
        date: formatLongDate(row.signed_at, locale, true),
        name: row.outgoing,
      })}
      narrow
      title={t("countersignTitle", {
        role: pick(locale, row.role_en, row.role_ar),
      })}
    >
      {row.reference ? <p className="type-caption">{row.reference}</p> : null}
      <FormValues
        data={(row.data ?? {}) as forms.FormData}
        fields={forms.forms.handover.fields}
        labels={labels}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Button
          disabled={!me.data || sign.isPending}
          onClick={() => sign.mutate()}
        >
          {t("countersignAs", { name: me.data ?? "" })}
        </Button>
        <Link className="link" href="/account/roles">
          {t("back")}
        </Link>
      </div>
      {sign.isError ? (
        <p className="type-body text-accent" role="alert">
          {t("failed")}
        </p>
      ) : null}
    </DiwanPage>
  );
};
