"use client";

import { Link } from "@repo/internationalization/navigation";
import { useTranslations } from "next-intl";
import { DiwanPage, DiwanSection, RowList } from "@/components/nexus/page";

const POINTS = ["term", "mentor", "hours", "certificate", "apply"] as const;

/**
 * The Apprenticeship, explained (design review A23), at
 * /get-involved/apprenticeship: only what the platform already holds as
 * fact (one term in a Qirtas section or a program, with a mentor; its
 * sessions are shifts, so the hours are service; a certificate drafted on
 * completion; places on Get involved). The places themselves stay on Get
 * involved.
 */
export const Apprenticeship = () => {
  const t = useTranslations("nexus.apprenticeship");
  return (
    <DiwanPage lede={t("lede")} narrow title={t("title")}>
      <DiwanSection id="how" title={t("howTitle")}>
        <RowList ordered>
          {POINTS.map((p) => (
            <li className="grid gap-1 py-space-4" key={p}>
              <h3 className="type-subheading">{t(`points.${p}.title`)}</h3>
              <p className="type-body text-text-secondary">
                {t(`points.${p}.body`)}
              </p>
            </li>
          ))}
        </RowList>
      </DiwanSection>
      <p className="type-body">
        <Link className="link" href="/get-involved">
          {t("places")}
        </Link>
      </p>
    </DiwanPage>
  );
};
