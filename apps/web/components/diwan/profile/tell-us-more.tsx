"use client";

import { Link } from "@repo/internationalization/navigation";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth/provider";
import { membership } from "@/lib/data";

type Details = membership.MemberDetails;

/** Whether Today should ask for details: nothing to match roles with yet. */
export const detailsThin = (details: Details) =>
  details.interests.length === 0 && details.skills.length === 0;

/**
 * The line on Today that asks for a few details while there's little to
 * match places with. It opens Profile's details (Nov 4, 2026: one form for
 * them, in place of the separate "Tell us more" pages).
 */
export const TellUsMoreLine = () => {
  const t = useTranslations("diwan.more");
  const { supabase, user } = useAuth();
  const details = useQuery({
    enabled: Boolean(user),
    queryFn: () => membership.myDetails(supabase, user?.id ?? ""),
    queryKey: ["member-details", user?.id],
  });
  if (!(details.data && detailsThin(details.data))) {
    return null;
  }
  return (
    <p className="type-body border-line py-space-3 border-y">
      <Link
        className="link font-medium"
        href="/account/settings/profile#details"
      >
        {t("today.link")}
      </Link>{" "}
      <span className="text-text-secondary">{t("today.line")}</span>
    </p>
  );
};
