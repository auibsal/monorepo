"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@repo/design-system/components/ui/dialog";
import { apiPath } from "@repo/internationalization";
import {
  formatClock,
  formatLongDate,
  formatNumber,
} from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { events, localized, unwrap } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import QRCode from "react-qr-code";
import { queryKeys, useMyRsvps, useMyWaitlist } from "@/lib/nexus/queries";
import { RowList } from "../page";
import { EmptyLine, ErrorState, SectionSpinner } from "../states";
import { Section } from "./section";

export const NextEvents = () => {
  const t = useTranslations("nexus.home.events");
  const ta = useTranslations("nexus.next");
  const tc = useTranslations("common");
  const locale = useLocale() as "en" | "ar";
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  const rsvps = useMyRsvps();
  const waitlist = useMyWaitlist();

  const cancel = useMutation({
    mutationFn: (eventId: string) => events.cancelRsvp(supabase, eventId),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.rsvps(user?.id ?? ""),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.waitlist(user?.id ?? ""),
        }),
      ]),
  });

  const upcoming = (rsvps.data ?? [])
    .filter(
      (r) =>
        r.event && new Date(r.event.ends_at ?? r.event.starts_at) >= new Date()
    )
    .sort((a, b) =>
      (a.event?.starts_at ?? "").localeCompare(b.event?.starts_at ?? "")
    );

  return (
    <Section
      action={
        upcoming.length > 0 ? (
          <Link className="link type-caption" href="/membership/calendar">
            {t("browse")}
          </Link>
        ) : undefined
      }
      id="next-events"
      title={t("title")}
    >
      {rsvps.isPending ? <SectionSpinner /> : null}
      {rsvps.isError ? <ErrorState onRetry={() => rsvps.refetch()} /> : null}
      {rsvps.data &&
      upcoming.length === 0 &&
      (waitlist.data ?? []).length === 0 ? (
        <EmptyLine
          action={{ href: "/membership/calendar", label: ta("browseEvents") }}
        >
          {t("empty")}
        </EmptyLine>
      ) : null}
      <RowList>
        {upcoming.map((rsvp) =>
          rsvp.event ? (
            <li className="grid grid-cols-[1fr_auto] gap-4" key={rsvp.id}>
              <div className="grid content-start gap-1">
                <h3 className="type-subheading">
                  {localized(rsvp.event, "title", locale)}
                </h3>
                <p className="type-body">
                  {formatLongDate(rsvp.event.starts_at, locale)} ·{" "}
                  {formatClock(rsvp.event.starts_at, locale)}
                </p>
                {localized(rsvp.event, "venue", locale) ? (
                  <p className="type-caption">
                    {localized(rsvp.event, "venue", locale)}
                  </p>
                ) : null}
                <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1">
                  <Button asChild size="sm" variant="link">
                    <a
                      href={apiPath(`/calendar/events/${rsvp.event.slug}.ics`)}
                    >
                      {t("addToCalendar")}
                    </a>
                  </Button>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="ghost">
                        {t("cancel")}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{t("cancel")}</DialogTitle>
                        <DialogDescription>
                          {t("cancelConfirm", {
                            event: localized(rsvp.event, "title", locale),
                          })}
                        </DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button
                          disabled={cancel.isPending}
                          onClick={() =>
                            rsvp.event && cancel.mutate(rsvp.event.id)
                          }
                        >
                          {tc("confirm")}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
              <figure className="grid justify-items-center gap-1">
                <div className="bg-surface p-1.5" data-theme="light">
                  <QRCode
                    aria-hidden="true"
                    size={72}
                    value={`sal:ticket:${rsvp.ticket_code}`}
                  />
                </div>
                <figcaption className="type-caption">{t("ticket")}</figcaption>
              </figure>
            </li>
          ) : null
        )}
        {(waitlist.data ?? []).map((entry) =>
          entry.event ? (
            <li key={entry.id}>
              <WaitlistItem
                eventId={entry.event.id}
                title={localized(entry.event, "title", locale)}
              />
            </li>
          ) : null
        )}
      </RowList>
    </Section>
  );
};

/** A waitlist place, with the member's current position. */
const WaitlistItem = ({
  eventId,
  title,
}: {
  eventId: string;
  title: string;
}) => {
  const t = useTranslations("nexus.home.events");
  const { supabase } = useAuth();
  const position = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("events")
          .rpc("waitlist_position", { event_id: eventId })
      ),
    queryKey: ["waitlist-position", eventId],
  });

  return (
    <div className="grid gap-1">
      <h3 className="type-subheading">{title}</h3>
      {position.data ? (
        <p className="type-caption">
          {t("waitlist", { position: formatNumber(position.data) })}
        </p>
      ) : null}
    </div>
  );
};
