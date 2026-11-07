"use client";

import { useTranslations } from "next-intl";
import { SavedReadingAll } from "@/components/diwan/home/saved-reading";
import { YourWork } from "@/components/diwan/journal/pages";
import { DiwanPage } from "@/components/diwan/page";

/** The Work tab: drafts and submissions, then what was saved to read. */
export const WorkPage = () => {
  const t = useTranslations("diwan.journal.write");
  return (
    <DiwanPage lede={t("yourWorkLede")} title={t("yourWork")}>
      <YourWork />
      <SavedReadingAll />
    </DiwanPage>
  );
};
