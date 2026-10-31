"use client";

import { Link } from "@repo/internationalization/navigation";
import { localized } from "@repo/sal-data";
import { useLocale, useTranslations } from "next-intl";
import { useMyPartners } from "@/lib/nexus/partners";

/**
 * For a member on a partner's team: the way to its dashboard (owner, Oct
 * 31, 2026: /partners/dashboard).
 */
export const PartnerDeskLink = () => {
  const t = useTranslations("nexus.partnerDesk");
  const locale = useLocale();
  const partner = useMyPartners().data?.[0];
  if (!partner) {
    return null;
  }
  return (
    <p className="type-body">
      <Link className="link" href="/partners/dashboard">
        {t("open", { name: localized(partner, "name", locale) })}
      </Link>
    </p>
  );
};
