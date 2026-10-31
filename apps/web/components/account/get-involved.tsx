"use client";

import { useAuth } from "@repo/auth/provider";
import { Link } from "@repo/internationalization/navigation";
import { useTranslations } from "next-intl";
import { ManageLinks } from "@/components/manage-links";
import { RequireMember } from "@/components/nexus/gates";
import { DiwanPage } from "@/components/nexus/page";
import { Callboard } from "@/components/nexus/programmes/callboard";
import { PageSpinner } from "@/components/nexus/states";
import { useMyMembership } from "@/lib/nexus/queries";
import { OpenPlaces } from "./open-places";

/**
 * Get involved, the careers page (owner, Oct 31, 2026): every open place,
 * inside the Society and with its partners, for anyone to read: roles, the
 * Apprenticeship, First Ink, volunteering, places with partners and the
 * Company's auditions. Members get the Callboard itself, where they reply
 * and sign up for shifts, with what matches their skills first.
 */
export const GetInvolved = () => {
  const t = useTranslations("nexus.getInvolved");
  const { loading, user } = useAuth();
  const mine = useMyMembership();

  if (loading || (user && mine.isPending)) {
    return <PageSpinner />;
  }
  if (user && mine.data?.kind === "member") {
    return (
      <RequireMember>
        <Callboard />
      </RequireMember>
    );
  }
  return (
    <DiwanPage lede={t("lede")} title={t("title")}>
      {user ? null : (
        <p className="type-body text-text-secondary">
          {t("members")}{" "}
          <Link
            className="font-medium text-accent hover:underline"
            href={{ pathname: "/sign-in", query: { next: "/get-involved" } }}
          >
            {t("signIn")}
          </Link>{" "}
          <Link className="link" href="/join">
            {t("join")}
          </Link>
        </p>
      )}
      <ManageLinks diwan="/people/hiring" />
      <OpenPlaces />
    </DiwanPage>
  );
};
