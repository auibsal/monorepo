"use client";

import { Link } from "@repo/internationalization/navigation";
import { useTranslations } from "next-intl";
import { RequireMember } from "@/components/diwan/gates";
import { DiwanPage } from "@/components/diwan/page";
import { PlacesBoard } from "@/components/diwan/programmes/places-board";
import { PageSpinner } from "@/components/diwan/states";
import { ManageLinks } from "@/components/manage-links";
import { useAuth } from "@/lib/auth/provider";
import { useMyMembership } from "@/lib/diwan/queries";
import { OpenPlaces } from "./open-places";

/**
 * Get involved (decisions.md: open roles only), for anyone to read:
 * team roles, event teams, Qalam mentors and the Company's auditions. Members get the board itself, where they reply
 * and sign up for shifts, with what matches their skills first.
 */
export const GetInvolved = () => {
  const t = useTranslations("diwan.getInvolved");
  const { loading, user } = useAuth();
  const mine = useMyMembership();

  if (loading || (user && mine.isPending)) {
    return <PageSpinner />;
  }
  if (user && mine.data?.kind === "member") {
    return (
      <RequireMember>
        <PlacesBoard />
      </RequireMember>
    );
  }
  return (
    <DiwanPage lede={t("lede")} title={t("title")}>
      {user ? null : (
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
      )}
      <ManageLinks diwan="/membership/openings" />
      <OpenPlaces />
    </DiwanPage>
  );
};
