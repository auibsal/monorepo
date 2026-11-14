"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useMyMembership, useProfile } from "@/lib/diwan/queries";
import { DiwanPage } from "../page";
import { Handovers } from "../service/roles";
import { Elections } from "../society/elections";
import { Motions } from "../society/motions";
import { PrizeVote } from "../society/prize-vote";
import { ChildConsents } from "./child-consents";
import { JournalSection } from "./journal";
import { MembershipCard } from "./membership-card";
import { NextEvents } from "./next-events";
import { Notices } from "./notices";
import { OtherHome } from "./other-home";
import { MyProgrammes } from "./programmes";
import { Renewal } from "./renewal";
import { RoleChecklist, UnsignedRoleAgreements } from "./role-checklist";
import { ArabicFormToDo, EsignToDo, NameToDo } from "./to-dos";
import { VotingEligibility } from "./voting";

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
 * Today (decisions.md, The site): the first screen after signing in, for
 * everyone. The live card at the top with Add to Wallet, then the to-dos
 * to sign or finish, an open election as a card while it's open, and
 * what's next. Today's to-dos are the only guidance: no walkthroughs.
 */
export const MemberHome = () => {
  const t = useTranslations("diwan.home");
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
  const member = mine.data?.kind === "member";

  return (
    <DiwanPage
      title={
        name && greeting
          ? t(`greetings.${greeting}`, { name })
          : t("greetingPlain")
      }
    >
      <MembershipCard />
      {/* The to-dos: each shows only while there is something to do. */}
      <div className="grid gap-x-16 gap-y-14 lg:grid-cols-2">
        <EsignToDo />
        <NameToDo />
        <ArabicFormToDo />
        {member ? (
          <>
            <Renewal />
            <UnsignedRoleAgreements />
            <Handovers />
            <RoleChecklist />
          </>
        ) : null}
      </div>
      {member ? (
        <>
          <Elections />
          <PrizeVote />
          <div className="grid gap-x-16 gap-y-14 lg:grid-cols-2">
            <Notices />
            <NextEvents />
            <MyProgrammes />
            <JournalSection />
            <Motions />
            <VotingEligibility />
          </div>
        </>
      ) : null}
      {/* A parent's view of their child's consents, whatever their class. */}
      <ChildConsents />
      {/* A guest, a partner's person, or someone not yet either. */}
      {mine.isSuccess && !member ? <OtherHome /> : null}
    </DiwanPage>
  );
};
