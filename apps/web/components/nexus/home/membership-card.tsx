"use client";

import { useAuth } from "@repo/auth/provider";
import { formatLongDate } from "@repo/internationalization/format";
import { useLocale, useTranslations } from "next-intl";
import QRCode from "react-qr-code";
import { useMemberStatus, useProfile } from "@/lib/nexus/queries";

/** Membership card with the member's check-in code. */
export const MembershipCard = () => {
  const t = useTranslations("nexus.home");
  const locale = useLocale() as "en" | "ar";
  const { user } = useAuth();
  const status = useMemberStatus();
  const profile = useProfile();

  if (!(status.data && profile.data && user)) {
    return null;
  }

  const name =
    (locale === "ar" && profile.data.full_name_ar) || profile.data.full_name_en;

  return (
    <section
      aria-labelledby="membership-card"
      className="grid gap-6 bg-surface-reading p-6 sm:grid-cols-[1fr_auto] sm:p-8"
    >
      <div className="grid content-start gap-2">
        <h2 className="type-title" id="membership-card">
          {name}
        </h2>
        <p className="type-caption">{t("card.title")}</p>
        {status.data.member_since ? (
          <p className="type-body">
            {t("card.memberSince", {
              date: formatLongDate(status.data.member_since, locale, true),
            })}
          </p>
        ) : null}
        <p className="type-body text-text-secondary">
          {status.data.tier ? t(`tiers.${status.data.tier}`) : null}
          {status.data.tier ? " · " : null}
          {status.data.voting_member ? t("card.voting") : t("card.notVoting")}
        </p>
      </div>
      <figure className="grid justify-items-center gap-2">
        <div className="bg-surface p-3" data-theme="light">
          <QRCode
            aria-hidden="true"
            size={132}
            value={`sal:member:${user.id}`}
          />
        </div>
        <figcaption className="type-caption max-w-40 text-center">
          {t("card.qr")}
        </figcaption>
      </figure>
    </section>
  );
};
