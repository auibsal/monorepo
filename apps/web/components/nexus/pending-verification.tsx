"use client";

import { useAuth } from "@repo/auth/provider";
import { FormHeader } from "@repo/design-system/components/sal/form-header";
import { Link } from "@repo/internationalization/navigation";
import { localized, unwrap } from "@repo/sal-data";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { PartnerDeskLink } from "./partner/desk-link";
import { Affiliations } from "./profile/affiliations";

/**
 * Shown to accounts on addresses outside AUIB: one of the Society's
 * partners verifies them (owner, Oct 31, 2026), so they choose theirs.
 * An organization applies to partner instead.
 */
export const PendingVerification = () => {
  const t = useTranslations("nexus.pending");
  return (
    <main className="mx-auto grid w-full max-w-xl gap-6 px-4 py-12" id="main">
      <FormHeader title={t("title")}>{t("body")}</FormHeader>
      <PartnerDeskLink />
      <Affiliations />
      <p className="type-body">
        {t("organization")}{" "}
        <Link className="link" href="/partners/join">
          {t("apply")}
        </Link>
      </p>
    </main>
  );
};

/**
 * For people verified as a partner's members: what they can use in the
 * Nexus (the Journal calls opened to their partner, their profile and
 * service). The rest is for Society members.
 */
export const PartnerGuest = () => {
  const t = useTranslations("nexus.partnerGuest");
  const locale = useLocale();
  const { supabase } = useAuth();
  // "Guest of …": a guest sees only the partners they are verified with.
  const partnerNames = useQuery({
    queryFn: async () =>
      unwrap(await supabase.schema("governance").rpc("partner_names")) ?? [],
    queryKey: ["partner-names", "guest"],
  });
  const names = (partnerNames.data ?? [])
    .map((p) => localized(p, "name", locale))
    .join(", ");
  const links = [
    ["/qirtas/write", t("journal")],
    ["/membership/settings/profile", t("profile")],
    ["/membership/record", t("service")],
    ["/membership/settings", t("settings")],
  ] as const;
  return (
    <main className="mx-auto grid w-full max-w-xl gap-6 px-4 py-12" id="main">
      <FormHeader title={names ? t("guestOf", { partner: names }) : t("title")}>
        {t("body")}
      </FormHeader>
      <PartnerDeskLink />
      <ul className="grid gap-2">
        {links.map(([href, label]) => (
          <li key={href}>
            <Link className="link" href={href}>
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
};
