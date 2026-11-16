import { SectionHead } from "@repo/brand/components/sal/section-head";
import type { Locale } from "@repo/internationalization";
import { getTranslations } from "next-intl/server";
import { events, localized } from "@/lib/data";
import { readPublished } from "@/lib/supabase";

/**
 * An event's program (decisions.md, Events), when it has one: each work
 * with its credit line, year and length, its one line and any award, as a
 * film series or a reading lists them.
 */
export const EventProgram = async ({
  eventId,
  locale,
}: {
  readonly eventId: string;
  readonly locale: Locale;
}) => {
  const items = await readPublished(
    ["events"],
    (c) => events.programItems(c, eventId),
    []
  );
  if (items.length === 0) {
    return null;
  }
  const t = await getTranslations({ locale, namespace: "web.events.program" });
  return (
    <section className="grid gap-4">
      <SectionHead title={t("title")} />
      <ol className="divide-line border-line grid divide-y border-y">
        {items.map((item) => {
          const facts = [
            item.credit,
            item.year ? String(item.year) : null,
            item.length_minutes
              ? t("length", {
                  n: item.length_minutes,
                  shown: String(item.length_minutes),
                })
              : null,
          ].filter(Boolean);
          // One language per page: the line and the award in its own only.
          const line = locale === "ar" ? item.line_ar : item.line_en;
          const award = locale === "ar" ? item.award_ar : item.award_en;
          return (
            <li className="grid gap-1 py-3" key={item.id}>
              <p className="type-body font-medium">
                {localized(item, "title", locale)}
              </p>
              {facts.length > 0 ? (
                <p className="type-caption">{facts.join(" · ")}</p>
              ) : null}
              {line ? <p className="type-body">{line}</p> : null}
              {award ? <p className="type-caption">{award}</p> : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
};
