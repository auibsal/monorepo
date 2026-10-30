"use client";

import { useAuth } from "@repo/auth/provider";
import { Link } from "@repo/internationalization/navigation";
import { useTranslations } from "next-intl";
import { RequireMember } from "@/components/nexus/gates";
import { DiwanPage, RowList } from "@/components/nexus/page";
import { Callboard } from "@/components/nexus/programmes/callboard";
import { PageSpinner } from "@/components/nexus/states";

const WAYS = [
  { href: "/join", key: "join" },
  { href: "/events", key: "shifts" },
  { href: "/company", key: "audition" },
] as const;

/**
 * Get involved (the overhaul, Oct 30, 2026): public, so a visitor learns
 * the three ways in before signing up; members get the Callboard itself,
 * the roles, shifts and auditions, with what matches their skills first.
 */
export const GetInvolved = () => {
  const t = useTranslations("nexus.getInvolved");
  const { loading, user } = useAuth();

  if (loading) {
    return <PageSpinner />;
  }
  if (user) {
    return (
      <RequireMember>
        <Callboard />
      </RequireMember>
    );
  }
  return (
    <DiwanPage lede={t("lede")} narrow title={t("title")}>
      <RowList>
        {WAYS.map((way) => (
          <li className="grid gap-1 py-5" key={way.key}>
            <Link
              className="type-subheading font-light hover:text-accent"
              href={way.href}
            >
              {t(`ways.${way.key}.title`)}
            </Link>
            <p className="type-body text-text-secondary">
              {t(`ways.${way.key}.body`)}
            </p>
          </li>
        ))}
      </RowList>
      <p className="type-body text-text-secondary">
        {t("members")}{" "}
        <Link
          className="font-medium text-accent hover:underline"
          href={{ pathname: "/sign-in", query: { next: "/get-involved" } }}
        >
          {t("signIn")}
        </Link>
      </p>
    </DiwanPage>
  );
};
