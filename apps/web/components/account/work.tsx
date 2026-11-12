"use client";

import { useTranslations } from "next-intl";
import { YourWork } from "@/components/diwan/journal/pages";
import { DiwanPage } from "@/components/diwan/page";

/** The Work tab: drafts, submissions and pieces (what was saved is its own tab). */
export const WorkPage = () => {
  const t = useTranslations("diwan.journal.write");
  return (
    <DiwanPage lede={t("yourWorkLede")} title={t("yourWork")}>
      <YourWork />
    </DiwanPage>
  );
};
