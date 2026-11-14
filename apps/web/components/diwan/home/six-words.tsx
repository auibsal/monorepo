"use client";

import type { Locale } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth/provider";
import { localized, programmes, unwrap } from "@/lib/data";
import { DiwanSection, RowList } from "../page";

/**
 * The writer's six-word pages (decisions.md, Members), in Your account →
 * Events, each under the event it was typed at. Private: nothing shows
 * them publicly. Shown only once there is one.
 */
export const SixWords = () => {
  const t = useTranslations("diwan.home.sixWords");
  const locale = useLocale() as Locale;
  const { supabase, user } = useAuth();
  const pages = useQuery({
    enabled: Boolean(user),
    queryFn: () => programmes.mySixWords(supabase),
    queryKey: ["my-six-words", user?.id],
  });
  const eventIds = [
    ...new Set(
      (pages.data ?? []).flatMap((p) => (p.event_id ? [p.event_id] : []))
    ),
  ];
  const events = useQuery({
    enabled: eventIds.length > 0,
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("events")
          .from("events")
          .select("id, title_en, title_ar, starts_at")
          .in("id", eventIds)
      ) ?? [],
    queryKey: ["my-six-words-events", ...eventIds],
  });
  if (!pages.data?.length) {
    return null;
  }
  const eventOf = (id: string | null) =>
    events.data?.find((e) => e.id === id) ?? null;
  return (
    <DiwanSection
      description={t("description")}
      id="six-words"
      title={t("title")}
    >
      <RowList>
        {pages.data.map((page) => {
          const event = eventOf(page.event_id);
          return (
            <li className="grid gap-2" key={page.id}>
              <p className="type-caption">
                {event
                  ? `${localized(event, "title", locale)}, ${formatLongDate(event.starts_at, locale)}`
                  : t("typedOn", {
                      date: formatLongDate(page.created_at, locale),
                    })}
              </p>
              <blockquote
                className="type-heading font-mono font-light whitespace-pre-line"
                dir="auto"
                lang={page.language === "other" ? undefined : page.language}
              >
                {page.text}
              </blockquote>
            </li>
          );
        })}
      </RowList>
    </DiwanSection>
  );
};
