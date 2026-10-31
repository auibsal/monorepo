"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useMyMembership, useProfile } from "@/lib/nexus/queries";
import { DiwanPage } from "../page";
import { TellUsMoreLine } from "../profile/tell-us-more";
import { JournalSection } from "./journal";
import { MembershipCard } from "./membership-card";
import { NextEvents } from "./next-events";
import { Notices } from "./notices";
import { OtherHome } from "./other-home";
import { MyProgrammes } from "./programmes";
import { Requests } from "./requests";
import { SixWords } from "./six-words";

type Greeting = "morning" | "afternoon" | "evening" | "late" | "friday";

/**
 * The greeting for this moment in Baghdad: by the time of day, and "Happy
 * Friday" on Fridays (the weekend's first day in Iraq) until the evening.
 */
export const greetingFor = (at: Date): Greeting => {
  const parts = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    hourCycle: "h23",
    timeZone: "Asia/Baghdad",
    weekday: "short",
  }).formatToParts(at);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 12);
  const friday = parts.find((p) => p.type === "weekday")?.value === "Fri";
  if (hour < 5) {
    return "late";
  }
  if (friday && hour < 17) {
    return "friday";
  }
  if (hour < 12) {
    return "morning";
  }
  if (hour < 17) {
    return "afternoon";
  }
  return "evening";
};

/** The greeting, kept current while the page stays open. */
const useGreeting = () => {
  const [greeting, setGreeting] = useState<Greeting | null>(null);
  useEffect(() => {
    const update = () => setGreeting(greetingFor(new Date()));
    update();
    const timer = window.setInterval(update, 60_000);
    return () => window.clearInterval(timer);
  }, []);
  return greeting;
};

/**
 * Today, mobile-first (the overhaul, Oct 30, 2026): the card, then what
 * needs the member (notices, only when there are some), what's next, their
 * shifts and the Callboard, Qirtas, what they have sent, and their six
 * words once the Tour has them. Sections in twos, so a full page reads in
 * threes. Voting eligibility is on Society; the calendar feed on My
 * calendar.
 */
export const MemberHome = () => {
  const t = useTranslations("nexus.home");
  const locale = useLocale();
  const profile = useProfile();
  const mine = useMyMembership();
  const greeting = useGreeting();
  // The first word of the name, in the page's language.
  const [name] = (
    (locale === "ar" && profile.data?.full_name_ar) ||
    profile.data?.full_name_en ||
    ""
  )
    .trim()
    .split(" ");

  return (
    <DiwanPage
      title={
        name && greeting
          ? t(`greetings.${greeting}`, { name })
          : t("greetingPlain")
      }
    >
      <MembershipCard />
      {mine.data?.kind === "member" ? (
        <>
          <TellUsMoreLine />
          <div className="grid gap-x-16 gap-y-14 lg:grid-cols-2">
            <Notices />
            <NextEvents />
            <MyProgrammes />
            <JournalSection />
            <Requests />
            <SixWords />
          </div>
        </>
      ) : null}
      {/* A guest, a partner's person, or someone not yet either. */}
      {mine.isSuccess && mine.data.kind !== "member" ? <OtherHome /> : null}
    </DiwanPage>
  );
};
