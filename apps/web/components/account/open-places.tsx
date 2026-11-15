import {
  type OpenCall,
  OpenCallList,
} from "@repo/brand/components/sal/open-call";
import type { Locale } from "@repo/internationalization";
import {
  formatClock,
  formatLongDate,
  formatNumber,
} from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { getTranslations } from "next-intl/server";
import { localized, type programmes } from "@/lib/data";

type Place = Awaited<ReturnType<typeof programmes.openPlaces>>[number];

const KINDS = ["role", "event_team", "qalam_mentor", "audition"] as const;

/**
 * Every open role, for anyone to read, in one list rendered on the server
 * (decisions.md, Members): team roles, Council seats, event teams, Qalam
 * mentors and the Company's auditions, soonest closing first. Each opens
 * its own page, where members apply. Each row is the one open-call row.
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
  const calls: OpenCall[] = places.map((row) => {
    const kind = KINDS.find((k) => k === row.kind) ?? "role";
    let when = t("anyTime");
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
    return {
      action: (
        <Link className="link text-sm font-medium" href={href}>
          {t("applyLink")}
        </Link>
      ),
      closes: when,
      key: row.id,
      purpose: [
        t(`kinds.${kind}`),
        row.places && row.places > 1
          ? t("places", { count: row.places, n: formatNumber(row.places) })
          : null,
      ]
        .filter(Boolean)
        .join(" · "),
      title: (
        <Link className="hover:underline" href={href}>
          {kind === "audition" ? t("audition", { title }) : String(title)}
        </Link>
      ),
    };
  });
  // One open-call pattern (decisions.md, The site): title · what it's for ·
  // when it closes · its action.
  return <OpenCallList calls={calls} label={t("title")} />;
};
