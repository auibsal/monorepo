"use client";

import { useAuth } from "@repo/auth/provider";
import { Link } from "@repo/internationalization/navigation";
import { useTranslations } from "next-intl";
import { RequireMember } from "@/components/diwan/gates";
import { DiwanPage } from "@/components/diwan/page";
import { PlacesBoard } from "@/components/diwan/programmes/places-board";
import { PageSpinner } from "@/components/diwan/states";
import { ManageLinks } from "@/components/manage-links";
import { useMyMembership } from "@/lib/diwan/queries";
import { OpenPlaces } from "./open-places";

/**
 * Get involved, the careers page (owner, Oct 31, 2026): every open place,
 * inside the Society and with its partners, for anyone to read: roles, the
 * Apprenticeship, First Ink, volunteering, places with partners and the
 * Company's auditions. Members get the board itself, where they reply
 * and sign up for shifts, with what matches their skills first.
 */
export const GetInvolved = () => {
  const t = useTranslations("diwan.getInvolved");
  const ta = useTranslations("diwan.apprenticeship");
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
      <ManageLinks diwan="/people/openings" />
      <p className="type-body">
        <Link className="link" href="/get-involved/apprenticeship">
          {ta("learn")}
        </Link>
      </p>
      <OpenPlaces />
    </DiwanPage>
  );
};
