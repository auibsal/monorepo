import { project } from "@repo/config";
import type { Locale } from "@repo/internationalization";
import { events } from "@repo/sal-data";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { EventList } from "@/components/event-list";
import { PageHeader, Section } from "@/components/section";
import { localizedMetadata } from "@/lib/metadata";
import { readPublished } from "@/lib/supabase";

const HTTP_SCHEME = /^https?:/;

interface EventsProps {
  readonly params: Promise<{ locale: Locale }>;
}

export const generateMetadata = async ({
  params,
}: EventsProps): Promise<Metadata> => {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "web.events" });
  return localizedMetadata(locale, "/events", {
    description: t("lede"),
    title: t("title"),
  });
};

const EventsPage = async ({ params }: EventsProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web.events" });
  const [upcoming, past] = await Promise.all([
    readPublished(["events"], (c) => events.publicEvents(c), []),
    readPublished(["events"], (c) => events.pastPublicEvents(c), []),
  ]);
  const feed = `${project.url.replace(HTTP_SCHEME, "webcal:")}/calendar.ics?lang=${locale}`;

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-20 px-4 py-16 sm:py-24">
      <PageHeader lede={t("lede")} title={t("title")}>
        <p className="type-body">
          <a className="link" href={feed}>
            {t("subscribe")}
          </a>{" "}
          <span className="text-text-secondary">{t("subscribeHint")}</span>
        </p>
      </PageHeader>
      <Section id="upcoming" title={t("upcoming")}>
        {(upcoming ?? []).length === 0 ? (
          <p className="type-body text-text-secondary">{t("none")}</p>
        ) : (
          <EventList events={upcoming ?? []} locale={locale} />
        )}
      </Section>
      {(past ?? []).length > 0 ? (
        <Section id="past" title={t("past")}>
          <EventList events={past ?? []} locale={locale} />
        </Section>
      ) : null}
    </div>
  );
};

export default EventsPage;
