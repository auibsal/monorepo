"use client";

import { useAuth } from "@repo/auth/provider";
import { hasPermissionAnywhere, type Permission } from "@repo/rbac";
import { localized, unwrap } from "@repo/sal-data";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/lib/diwan/navigation";
import { useGrants } from "@/lib/diwan/queries";
import { DiwanSection, RowList } from "../../page";
import { EmptyLine } from "../../states";
import { Needs } from "../needs";
import { Shifts } from "../programmes/admin";
import { EventPartner } from "./joint";
import { EventOffCampus } from "./off-campus";
import { SessionLinks } from "./session-links";

interface PartsEvent {
  readonly id: string;
  readonly off_campus: boolean;
  readonly partner_id: string | null;
  readonly status: string;
  readonly student_life_approved_by: string | null;
  readonly student_life_approved_on: string | null;
}

/**
 * The standard parts of every event (owner, Nov 7, 2026: one standard page,
 * standard parts only, no add-ons): off campus with Student Life's approval,
 * a partner and its checklist, needs, volunteer shifts and links; a
 * meeting's minutes for those who keep them. Booking and check-in are on
 * the event's bookings and its door.
 */
export const EventPartsAdmin = ({ event }: { readonly event: PartsEvent }) => {
  const t = useTranslations("diwan.admin.event.parts");
  const grants = useGrants();
  const can = (permission: Permission) =>
    hasPermissionAnywhere(grants.data, permission);
  return (
    <>
      <EventOffCampus event={event} />
      <EventPartner event={event} />
      <DiwanSection id="needs" title={t("needs")}>
        <Needs eventId={event.id} />
      </DiwanSection>
      <DiwanSection id="shifts" title={t("shifts")}>
        <Shifts eventId={event.id} />
      </DiwanSection>
      <SessionLinks eventId={event.id} />
      {can("governance.manage") || can("governance.minutes.write") ? (
        <EventMinutes eventId={event.id} />
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
              <Link className="link" href={`/council/meetings/${m.id}`}>
                {localized(m, "title", locale) || m.title_en}
              </Link>
            </li>
          ))}
        </RowList>
      ) : (
        <EmptyLine>{t("noMinutes")}</EmptyLine>
      )}
    </DiwanSection>
  );
};
