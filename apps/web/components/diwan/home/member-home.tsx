"use client";

import { formatNumber } from "@repo/internationalization/format";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/provider";
import { unwrap } from "@/lib/data";
import { useMyMembership, useProfile } from "@/lib/diwan/queries";
import { DiwanPage } from "../page";
import { Handovers } from "../service/roles";
import { Elections } from "../society/elections";
import { Motions } from "../society/motions";
import { PrizeVote } from "../society/prize-vote";
import { ChildConsents } from "./child-consents";
import { MembershipCard } from "./membership-card";
import { AssignmentsToDo, CreditsToDo } from "./newsroom-todos";
import { NextEvents } from "./next-events";
import { Notices } from "./notices";
import { OtherHome } from "./other-home";
import { MyPrograms } from "./programs";
import { Renewal } from "./renewal";
import { RoleChecklist, UnsignedRoleAgreements } from "./role-checklist";
import {
  ArabicFormToDo,
  AssociateRequestToDo,
  EsignToDo,
  NameToDo,
  OrganizationToDo,
  PersonalEmailToDo,
} from "./to-dos";

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

/**
 * How many to-dos are left (decisions.md, To-dos): the length of the one
 * list, core.my_todos(), so the count is always the list's.
 */
const ToDoCount = () => {
  const t = useTranslations("diwan.home");
  const { supabase, user } = useAuth();
  const todos = useQuery({
    enabled: Boolean(user),
    queryFn: async () =>
      unwrap(await supabase.schema("api").rpc("my_todos")) ?? [],
    queryKey: ["home", "my-todos", user?.id],
  });
  if (!todos.data) {
    return null;
  }
  const count = todos.data.length;
  if (count === 0) {
    return null;
  }
  return (
    <p className="type-body text-text-secondary" role="status">
      {t("toDoCount", { count, countText: formatNumber(count) })}
    </p>
  );
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
 * everyone, showing only what needs the person. In order: the live card
 * with Add to Wallet; the to-dos, one line and one button each; an open
 * election (or Prize vote, or motion) while it's open; then their next
 * events, shifts and new notices, each only when there are some. A section
 * with nothing in it doesn't appear; empty states live on each list's own
 * page.
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
      <ToDoCount />
      {/* The to-dos: each shows only while there is something to do. */}
      <div className="grid gap-x-16 gap-y-14 lg:grid-cols-2">
        <EsignToDo />
        <PersonalEmailToDo />
        <NameToDo />
        <ArabicFormToDo />
        {member ? null : <AssociateRequestToDo />}
        {member ? null : <OrganizationToDo />}
        {member ? (
          <>
            <Renewal />
            <UnsignedRoleAgreements />
            <Handovers />
            <RoleChecklist />
            <AssignmentsToDo />
            <CreditsToDo />
          </>
        ) : null}
      </div>
      {member ? (
        <>
          <Elections />
          <PrizeVote />
          <Motions />
          <div className="grid gap-x-16 gap-y-14 lg:grid-cols-2">
            <NextEvents />
            <MyPrograms />
            <Notices />
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
