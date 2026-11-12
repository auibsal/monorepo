"use client";

import { useTranslations } from "next-intl";
import { MembershipCard } from "@/components/diwan/home/membership-card";
import { DiwanPage } from "@/components/diwan/page";

/** The Card tab: the membership card, its check and its Wallet pass. */
export const CardPage = () => {
  const t = useTranslations("diwan.nav");
  return (
    <DiwanPage title={t("card")}>
      <MembershipCard />
    </DiwanPage>
  );
};
