"use client";

import { Link } from "@repo/internationalization/navigation";
import { useTranslations } from "next-intl";
import { ManageLinks } from "@/components/manage-links";
import { useAuth } from "@/lib/auth/provider";

/**
 * Above the list: a visitor is asked to sign in or join; a signed-in
 * person sees their applications; the hiring staff, the Diwan's openings.
 */
export const GetInvolvedLinks = () => {
  const t = useTranslations("diwan.getInvolved");
  const { loading, user } = useAuth();
  if (loading) {
    return null;
  }
  if (!user) {
    return (
      <p className="type-body text-text-secondary">
        {t("members")}{" "}
        <Link
          className="text-accent font-medium hover:underline"
          href={{ pathname: "/sign-in", query: { next: "/get-involved" } }}
        >
          {t("signIn")}
        </Link>{" "}
        <Link className="link" href="/join">
          {t("join")}
        </Link>
      </p>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
      <Link className="link" href="/account/roles">
        {t("yours")}
      </Link>
      <ManageLinks diwan="/membership/openings" />
    </div>
  );
};
