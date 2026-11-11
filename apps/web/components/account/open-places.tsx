import type { Locale } from "@repo/internationalization";
import {
  formatClock,
  formatLongDate,
  formatNumber,
} from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { getTranslations } from "next-intl/server";
import { RowList } from "@/components/diwan/page";
import { localized, type programmes } from "@/lib/data";

type Place = Awaited<ReturnType<typeof programmes.openPlaces>>[number];

const KINDS = ["role", "event_team", "qalam_mentor", "audition"] as const;

/**
 * Every open role, for anyone to read, in one list rendered on the server
 * (decisions §1, §17): team roles, Council seats, event teams, Qalam
 * mentors and the Company's auditions, soonest closing first. Each opens
 * its own page, where members apply.
 */
export const OpenPlaces = async ({
  locale,
  places,
}: {
  readonly locale: Locale;
  readonly places: readonly Place[];
}) => {
  const t = await getTranslations({ locale, namespace: "diwan.getInvolved" });
  if (places.length === 0) {
    return <p className="type-body">{t("none")}</p>;
  }
  return (
    <RowList>
      {places.map((row) => {
        const kind = KINDS.find((k) => k === row.kind) ?? "role";
        let when: string | null = null;
        if (kind === "audition" && row.closes_at) {
          when = t("on", {
            date: formatLongDate(row.closes_at, locale),
            time: formatClock(row.closes_at, locale),
          });
        } else if (row.closes_at) {
          when = t("closes", { date: formatLongDate(row.closes_at, locale) });
        }
        let href = `/get-involved/${row.id}`;
        if (kind === "audition") {
          href = "/company/auditions";
        } else if (kind === "event_team" && row.event_slug) {
          href = `/events/${row.event_slug}`;
        }
        const title = localized(row, "title", locale);
        return (
          <li className="grid gap-1" key={row.id}>
            <p className="font-medium">
              <Link className="hover:underline" href={href}>
                {kind === "audition" ? t("audition", { title }) : String(title)}
              </Link>
            </p>
            <p className="type-caption">
              {[
                t(`kinds.${kind}`),
                when,
                row.places && row.places > 1
                  ? t("places", {
                      count: row.places,
                      n: formatNumber(row.places),
                    })
                  : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            {localized(row, "body", locale) ? (
              <p className="type-body text-text-secondary line-clamp-3 whitespace-pre-line">
                {localized(row, "body", locale)}
              </p>
            ) : null}
          </li>
        );
      })}
    </RowList>
  );
};
