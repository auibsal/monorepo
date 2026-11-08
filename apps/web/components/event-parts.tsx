import type { Locale } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { getTranslations } from "next-intl/server";
import { Section } from "@/components/section";
import { events, journal, localized } from "@/lib/data";
import { readPublished } from "@/lib/supabase";

/**
 * The standard parts of an event's page (decisions.md: one standard
 * page, standard parts only; the add-ons are gone). Each shows only when the
 * event has it: Student Life's approval and the trip consent form for an
 * event off campus, the links from the night, and what Qirtas wrote from it.
 * Booking and check-in, needs, volunteer shifts and the partner checklist
 * are on the page itself or in the Diwan.
 */
export const EventParts = async ({
  event,
  locale,
}: {
  readonly event: {
    id: string;
    off_campus: boolean;
    slug: string;
    student_life_approved_on: string | null;
  };
  readonly locale: Locale;
}) => {
  const t = await getTranslations({ locale, namespace: "web.events.parts" });
  const [links, pieces] = await Promise.all([
    readPublished(["events"], (c) => events.sessionLinks(c, [event.id]), []),
    readPublished(
      ["journal"],
      (c) => journal.piecesFromEvents(c, [event.id]),
      []
    ),
  ]);
  // Outside links in the page's language only (one language per page).
  const outside = links.filter((l) => localized(l, "label", locale));
  return (
    <>
      {event.off_campus && event.student_life_approved_on ? (
        <p className="type-caption text-text-secondary">
          {t("approved", {
            date: formatLongDate(event.student_life_approved_on, locale),
          })}{" "}
          <Link className="link" href={`/forms/F-45?event=${event.slug}`}>
            {t("consent")}
          </Link>
        </p>
      ) : null}
      {outside.length > 0 ? (
        <Section id="links" title={t("links")}>
          <ul className="grid gap-2">
            {outside.map((link) => (
              <li key={link.id}>
                <a
                  className="link"
                  href={link.url}
                  rel="noopener"
                  target="_blank"
                >
                  {localized(link, "label", locale)}
                </a>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
      {pieces.some((p) => localized(p, "title", locale)) ? (
        <Section id="qirtas" title={t("qirtas")}>
          <ul className="grid gap-2">
            {pieces
              .filter((p) => localized(p, "title", locale))
              .map((piece) => (
                <li key={piece.id}>
                  <a className="link" href={journal.piecePath(piece)}>
                    {localized(piece, "title", locale)}
                  </a>
                </li>
              ))}
          </ul>
        </Section>
      ) : null}
    </>
  );
};
