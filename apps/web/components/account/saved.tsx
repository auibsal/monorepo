"use client";

import { useTranslations } from "next-intl";
import { SavedReadingAll } from "@/components/diwan/home/saved-reading";
import { DiwanPage } from "@/components/diwan/page";

/** The Saved tab: what was saved to read later. */
export const SavedPage = () => {
  const t = useTranslations("diwan.nav");
  return (
    <DiwanPage title={t("saved")}>
      <SavedReadingAll />
    </DiwanPage>
  );
};
