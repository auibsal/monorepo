"use client";

import { useLocale, useTranslations } from "next-intl";
import { useProfile } from "@/lib/nexus/queries";
import { DiwanPage } from "../page";
import { JournalSection } from "./journal";
import { MembershipCard } from "./membership-card";
import { NextEvents } from "./next-events";
import { Notices } from "./notices";
import { MyProgrammes } from "./programmes";
import { SixWords } from "./six-words";
import { VotingEligibility } from "./voting";

/**
 * Member home, mobile-first: what to do next first (notices only when there
 * are some), then voting and the Register. The calendar feed is a
 * setting, so it lives in Profile and privacy.
 */
export const MemberHome = () => {
  const t = useTranslations("nexus.home");
  const locale = useLocale();
  const profile = useProfile();
  const name =
    (locale === "ar" && profile.data?.full_name_ar) ||
    profile.data?.full_name_en ||
    "";

  return (
    <DiwanPage title={name ? t("greeting", { name }) : t("greetingPlain")}>
      <MembershipCard />
      <div className="grid gap-x-16 gap-y-14 lg:grid-cols-2">
        <Notices />
        <NextEvents />
        <JournalSection />
        <MyProgrammes />
        <VotingEligibility />
        <SixWords />
      </div>
    </DiwanPage>
  );
};
