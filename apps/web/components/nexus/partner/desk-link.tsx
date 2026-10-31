"use client";

import { useAuth } from "@repo/auth/provider";
import { Link } from "@repo/internationalization/navigation";
import { localized, unwrap } from "@repo/sal-data";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";

/**
 * For a partner's representatives, wherever they land on the site: the way
 * to their partner's page in the Diwan (owner, Oct 31, 2026).
 */
export const PartnerDeskLink = () => {
  const t = useTranslations("nexus.partnerDesk");
  const locale = useLocale();
  const { supabase, user } = useAuth();
  const mine = useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      (unwrap(await supabase.schema("governance").rpc("my_partners")) ??
        []) as { name_ar: string | null; name_en: string }[],
    queryKey: ["partner-desk", "mine-link", user?.id ?? ""],
  });
  const partner = mine.data?.[0];
  if (!partner) {
    return null;
  }
  return (
    <p className="type-body">
      <Link className="link" href="/diwan/partner">
        {t("open", { name: localized(partner, "name", locale) })}
      </Link>
    </p>
  );
};
