import type { Locale } from "@repo/internationalization";
import { charity, events, localized } from "@repo/sal-data";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ImpactReport, loadReport } from "@/components/impact-report";
import { SecondChapterCatalog } from "@/components/second-chapter-catalog";
import { WhatsOn } from "@/components/whats-on-page";
import { localizedMetadata } from "@/lib/metadata";
import { readPublished } from "@/lib/supabase";
import { isMonthSegment, monthFrom } from "@/lib/whats-on";

interface PartProps {
  readonly params: Promise<{ locale: Locale; part: string; slug: string }>;
  readonly searchParams: Promise<{ language?: string }>;
}

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

type PublicEvent = Awaited<ReturnType<typeof events.publicEvent>>;
type Campaign = Awaited<ReturnType<typeof charity.campaignForEvent>>;

/** The public event at this address, with its campaign, if it has one. */
const loadEventCampaign = async (slug: string) => {
  if (!SLUG.test(slug)) {
    return null;
  }
  const event = await readPublished<PublicEvent | null>(
    ["events"],
    (c) => events.publicEvent(c, slug),
    null
  );
  if (!event) {
    return null;
  }
  const campaign = await readPublished<Campaign | null>(
    ["charity"],
    (c) => charity.campaignForEvent(c, event.id),
    null
  );
  return campaign ? { campaign, event } : null;
};

export const generateMetadata = async ({
  params,
}: PartProps): Promise<Metadata> => {
  const { locale, part, slug } = await params;
  if (isMonthSegment(slug) && part === "society") {
    const t = await getTranslations({ locale, namespace: "web.events" });
    return localizedMetadata(locale, `/events/${slug}/society`, {
      description: t("lede"),
      title: t("title"),
    });
  }
  if (part !== "catalog" && part !== "impact") {
    return {};
  }
  const found = await loadEventCampaign(slug);
  if (!found) {
    return {};
  }
  const t = await getTranslations({ locale, namespace: "web.give" });
  const title = part === "catalog" ? t("catalog.title") : t("report.title");
  return localizedMetadata(locale, `/events/${slug}/${part}`, {
    description: localized(found.campaign, "title", locale),
    title: `${title} · ${localized(found.event, "title", locale)}`,
  });
};

/**
 * Under an event's address (owner, Nov 5, 2026: every event is a standard
 * event, none in a series): a month of What's on with the Society's dates
 * alone (/events/2026-11/society), and, for an event that carries Second
 * Chapter's campaign, its catalog (/events/<event>/catalog) and its
 * impact report (/events/<event>/impact).
 */
const PartPage = async ({ params, searchParams }: PartProps) => {
  const { locale, part, slug } = await params;
  setRequestLocale(locale);
  if (isMonthSegment(slug) && part === "society") {
    return (
      <WhatsOn locale={locale} month={monthFrom(slug)} withUniversity={false} />
    );
  }
  if (part !== "catalog" && part !== "impact") {
    notFound();
  }
  const found = await loadEventCampaign(slug);
  if (!found) {
    notFound();
  }
  if (part === "catalog") {
    const { language } = await searchParams;
    const only = charity.CATALOG_LANGUAGES.find((l) => l === language) ?? null;
    return (
      <SecondChapterCatalog
        campaign={found.campaign}
        event={found.event}
        language={only}
        locale={locale}
      />
    );
  }
  const report = await loadReport(found.event.id);
  if (!report) {
    notFound();
  }
  return <ImpactReport eventSlug={slug} locale={locale} report={report} />;
};

export default PartPage;
