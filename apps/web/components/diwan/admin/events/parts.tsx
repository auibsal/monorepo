"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/brand/components/ui/button";
import { hasPermissionAnywhere, type Permission } from "@repo/rbac";
import { localized, unwrap } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Link } from "@/lib/diwan/navigation";
import { useGrants } from "@/lib/diwan/queries";
import { DiwanSection, RowList } from "../../page";
import { EmptyLine } from "../../states";
import { ErrorLine } from "../kit";
import { Needs } from "../needs";
import { Rotas } from "../programmes/admin";
import { BookVote } from "../programmes/book-vote";
import { Prompts } from "../programmes/prompts";
import { EventPartner } from "./joint";
import { EventOffCampus } from "./off-campus";
import { SessionLinks } from "./session-links";

type AddOn =
  | "offCampus"
  | "partner"
  | "needs"
  | "shifts"
  | "links"
  | "prompts"
  | "vote"
  | "collection"
  | "minutes";

interface PartsEvent {
  readonly id: string;
  readonly off_campus: boolean;
  readonly partner_id: string | null;
  readonly status: string;
  readonly student_life_approved_on: string | null;
}

/** Which add-ons the event already has, from its records. */
const useHas = (eventId: string) => {
  const { supabase } = useAuth();
  return useQuery({
    queryFn: async () => {
      const count = async (
        schema: "programmes" | "events" | "charity" | "governance",
        table: string
      ) =>
        (
          await supabase
            .schema(schema as "programmes")
            .from(table as "needs")
            .select("id", { count: "exact", head: true })
            .eq("event_id", eventId)
        ).count ?? 0;
      const [needs, shifts, links, prompts, vote, collection, minutes] =
        await Promise.all([
          count("programmes", "needs"),
          count("programmes", "rotas"),
          count("events", "session_links"),
          count("programmes", "prompts"),
          count("programmes", "book_ballots"),
          count("charity", "campaigns"),
          count("governance", "minutes"),
        ]);
      return { collection, links, minutes, needs, prompts, shifts, vote };
    },
    queryKey: ["admin", "event-add-ons", eventId],
  });
};

/**
 * One kind of event, with add-ons (owner, Nov 5, 2026, evening: "Don't
 * keep event-specific things. All events have standard pages, we change
 * the details."). Every event has the same details above; below them,
 * the add-ons it has, and one row to add any other: off campus (Student
 * Life's approval), a partner and its checklist, needs, shifts, links,
 * prompts, a book vote, the book fair's collection and a meeting's
 * minutes. The public page shows the ones it has.
 */
export const EventPartsAdmin = ({ event }: { readonly event: PartsEvent }) => {
  const t = useTranslations("diwan.admin.event.parts");
  const grants = useGrants();
  const has = useHas(event.id);
  const [added, setAdded] = useState<readonly AddOn[]>([]);
  const can = (permission: Permission) =>
    hasPermissionAnywhere(grants.data, permission);
  const offered: readonly AddOn[] = [
    "offCampus",
    "partner",
    "needs",
    "shifts",
    "links",
    "prompts",
    "vote",
    ...(can("charity.manage") ? (["collection"] as const) : []),
    ...(can("governance.manage") || can("governance.minutes.write")
      ? (["minutes"] as const)
      : []),
  ];
  const present: Record<AddOn, boolean> = {
    collection: (has.data?.collection ?? 0) > 0,
    links: (has.data?.links ?? 0) > 0,
    minutes: (has.data?.minutes ?? 0) > 0,
    needs: (has.data?.needs ?? 0) > 0,
    offCampus: event.off_campus,
    partner: Boolean(event.partner_id),
    prompts: (has.data?.prompts ?? 0) > 0,
    shifts: (has.data?.shifts ?? 0) > 0,
    vote: (has.data?.vote ?? 0) > 0,
  };
  const shown = (part: AddOn) => present[part] || added.includes(part);
  const more = offered.filter((part) => !shown(part));
  return (
    <>
      {shown("offCampus") ? <EventOffCampus event={event} /> : null}
      {shown("partner") ? <EventPartner event={event} /> : null}
      {shown("needs") ? (
        <DiwanSection id="needs" title={t("needs")}>
          <Needs eventId={event.id} />
        </DiwanSection>
      ) : null}
      {shown("shifts") ? (
        <DiwanSection id="shifts" title={t("shifts")}>
          <Rotas eventId={event.id} />
        </DiwanSection>
      ) : null}
      {shown("links") ? <SessionLinks eventId={event.id} /> : null}
      {shown("prompts") ? (
        <DiwanSection id="prompts" title={t("prompts")}>
          <Prompts eventId={event.id} />
        </DiwanSection>
      ) : null}
      {shown("vote") ? (
        <DiwanSection id="vote" title={t("vote")}>
          <BookVote eventId={event.id} />
        </DiwanSection>
      ) : null}
      {shown("collection") ? <EventCampaign eventId={event.id} /> : null}
      {shown("minutes") ? <EventMinutes eventId={event.id} /> : null}
      {more.length > 0 ? (
        <DiwanSection id="add-ons" title={t("add")}>
          <p className="type-body text-text-secondary">{t("addLede")}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {more.map((part) => (
              <Button
                key={part}
                onClick={() => setAdded((list) => [...list, part])}
                size="sm"
                type="button"
                variant="ghost"
              >
                {t(`addOns.${part}`)}
              </Button>
            ))}
          </div>
        </DiwanSection>
      ) : null}
    </>
  );
};

/** A meeting's minutes and resolutions, kept in Society, pointing here. */
const EventMinutes = ({ eventId }: { readonly eventId: string }) => {
  const t = useTranslations("diwan.admin.event.parts");
  const locale = useLocale() as "en" | "ar";
  const { supabase } = useAuth();
  const minutes = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("governance")
          .from("minutes")
          .select("id, title_en, title_ar, status")
          .eq("event_id", eventId)
      ) ?? [],
    queryKey: ["admin", "event-minutes", eventId],
  });
  return (
    <DiwanSection id="minutes" title={t("minutes")}>
      {(minutes.data ?? []).length > 0 ? (
        <RowList>
          {(minutes.data ?? []).map((m) => (
            <li key={m.id}>
              <Link className="link" href={`/society/meetings/${m.id}`}>
                {localized(m, "title", locale) || m.title_en}
              </Link>
            </li>
          ))}
        </RowList>
      ) : (
        <EmptyLine
          action={{
            href: `/society/meetings/new?event=${eventId}`,
            label: t("writeMinutes"),
          }}
        >
          {t("noMinutes")}
        </EmptyLine>
      )}
    </DiwanSection>
  );
};

/**
 * the book fair's campaign on its event (the fair): the event's page on
 * the site then carries the collection, its catalog and its impact report.
 */
const EventCampaign = ({ eventId }: { readonly eventId: string }) => {
  const t = useTranslations("diwan.admin.event.parts");
  const locale = useLocale() as "en" | "ar";
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const key = ["admin", "event-campaign", eventId];
  const campaigns = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("charity")
          .from("campaigns")
          .select("id, slug, title_en, title_ar, event_id, status")
          .order("created_at", { ascending: false })
      ) ?? [],
    queryKey: key,
  });
  const link = useMutation({
    mutationFn: async ({ id, on }: { id: string; on: boolean }) =>
      unwrap(
        await supabase
          .schema("charity")
          .from("campaigns")
          .update({ event_id: on ? eventId : null })
          .eq("id", id)
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });
  const mine = (campaigns.data ?? []).filter((c) => c.event_id === eventId);
  const free = (campaigns.data ?? []).filter((c) => !c.event_id);
  return (
    <DiwanSection id="collection" title={t("collection")}>
      <p className="type-body text-text-secondary">{t("collectionLede")}</p>
      {mine.length === 0 && free.length === 0 ? (
        <EmptyLine
          action={{ href: "/events/campaigns", label: t("campaigns") }}
        >
          {t("noCampaigns")}
        </EmptyLine>
      ) : null}
      {mine.length + free.length > 0 ? (
        <RowList>
          {[...mine, ...free].map((c) => (
            <li
              className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1"
              key={c.id}
            >
              <Link className="link" href={`/events/campaigns/${c.slug}`}>
                {localized(c, "title", locale) || c.title_en}
              </Link>
              <Button
                disabled={link.isPending}
                onClick={() =>
                  link.mutate({ id: c.id, on: c.event_id !== eventId })
                }
                size="sm"
                type="button"
                variant="ghost"
              >
                {c.event_id === eventId ? t("unlink") : t("link")}
              </Button>
            </li>
          ))}
        </RowList>
      ) : null}
      <ErrorLine error={link.error} />
    </DiwanSection>
  );
};
