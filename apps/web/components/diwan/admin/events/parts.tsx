"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/brand/components/ui/button";
import { hasPermissionAnywhere } from "@repo/rbac";
import { localized, unwrap } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/lib/diwan/navigation";
import { useGrants } from "@/lib/diwan/queries";
import { DiwanSection, RowList } from "../../page";
import { EmptyLine } from "../../states";
import { ErrorLine } from "../kit";
import { Needs } from "../needs";
import { Rotas } from "../programmes/admin";
import { BookVote } from "../programmes/book-vote";
import { Prompts } from "../programmes/prompts";

/**
 * An event's parts, on its one page in the Diwan (owner, Nov 5, 2026:
 * every event is a standard event, none in a series): its shifts, its
 * needs from Student Life, the prompts written for it, the book chosen for
 * it and, for Second Chapter's fair, its campaign. Every event offers the
 * same parts; the public page shows the ones it has.
 */
export const EventPartsAdmin = ({ eventId }: { readonly eventId: string }) => {
  const t = useTranslations("diwan.admin.event.parts");
  const grants = useGrants();
  const runs = hasPermissionAnywhere(grants.data, "programs.manage");
  if (!runs) {
    return null;
  }
  return (
    <>
      <DiwanSection id="shifts" title={t("shifts")}>
        <Rotas eventId={eventId} />
      </DiwanSection>
      <DiwanSection id="needs" title={t("needs")}>
        <Needs eventId={eventId} />
      </DiwanSection>
      <DiwanSection id="prompts" title={t("prompts")}>
        <Prompts eventId={eventId} />
      </DiwanSection>
      <DiwanSection id="vote" title={t("vote")}>
        <BookVote eventId={eventId} />
      </DiwanSection>
      {hasPermissionAnywhere(grants.data, "charity.manage") ? (
        <EventCampaign eventId={eventId} />
      ) : null}
    </>
  );
};

/**
 * Second Chapter's campaign on its event (the fair): the event's page on
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
