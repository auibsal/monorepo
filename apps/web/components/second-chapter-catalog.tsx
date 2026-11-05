import type { Locale } from "@repo/internationalization";
import { formatNumber } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { charity, localized } from "@repo/sal-data";
import { getTranslations } from "next-intl/server";
import { readPublished } from "@/lib/supabase";

type Campaign = NonNullable<
  Awaited<ReturnType<typeof charity.campaignForEvent>>
>;

/** An event's campaign catalog: /events/<event>/catalog (owner, Nov 5, 2026). */
export const catalogPath = (eventSlug: string) =>
  `/events/${eventSlug}/catalog`;

/** The campaign's listed books (A27). */
const loadCatalog = (campaign: Campaign) =>
  readPublished(
    ["charity"],
    async (c) => ({
      books: (await charity.catalogBooks(c, campaign.id)) ?? [],
      campaign,
    }),
    { books: [], campaign }
  );

/** On the event's page: the way to the catalog, once it has books. */
export const CatalogLink = async ({
  campaign,
  eventSlug,
  locale,
}: {
  readonly campaign: Campaign;
  readonly eventSlug: string;
  readonly locale: Locale;
}) => {
  const catalog = await loadCatalog(campaign);
  if (catalog.books.length === 0) {
    return null;
  }
  const t = await getTranslations({ locale, namespace: "web.give.catalog" });
  return (
    <p className="type-body">
      <Link className="link" href={catalogPath(eventSlug)}>
        {t("link", { count: formatNumber(catalog.books.length, locale) })}
      </Link>
    </p>
  );
};

/**
 * /events/<event>/catalog (the design review A27; owner, Nov 5, 2026: an
 * event's own): the books given to the event's campaign, to see what the
 * fair will hold. Browse only: no prices, no reserving; a language to
 * narrow it to.
 */
export const SecondChapterCatalog = async ({
  campaign,
  event,
  language,
  locale,
}: {
  readonly campaign: Campaign;
  readonly event: {
    slug: string;
    title_ar: string | null;
    title_en: string | null;
  };
  readonly language: charity.CatalogLanguage | null;
  readonly locale: Locale;
}) => {
  const t = await getTranslations({ locale, namespace: "web.give.catalog" });
  const PATH = catalogPath(event.slug);
  const catalog = await loadCatalog(campaign);
  const books = catalog.books.filter(
    (b) => !language || b.language === language
  );
  return (
    <div className="mx-auto grid w-full max-w-4xl gap-10 px-4 py-16 sm:py-24">
      <header className="grid gap-4">
        <h1 className="type-display text-balance">{t("title")}</h1>
        <p className="type-lede max-w-prose">
          {t("lede", {
            campaign: localized(catalog.campaign, "title", locale),
          })}
        </p>
        <p>
          <Link className="link" href={`/events/${event.slug}`}>
            {localized(event, "title", locale)}
          </Link>
        </p>
      </header>
      {catalog.books.length > 0 ? (
        <nav aria-label={t("languages")}>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {[null, ...charity.CATALOG_LANGUAGES].map((l) => (
              <li key={l ?? "all"}>
                <Link
                  aria-current={l === language ? "page" : undefined}
                  className="link aria-[current=page]:font-medium aria-[current=page]:no-underline"
                  href={l ? `${PATH}?language=${l}` : PATH}
                >
                  {l ? t(`language.${l}`) : t("all")}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
      {books.length === 0 ? (
        <p className="type-body text-text-secondary">{t("empty")}</p>
      ) : null}
      {books.length > 0 ? (
        <ul className="grid gap-x-10 border-line border-b sm:grid-cols-2">
          {books.map((book) => (
            <li className="grid gap-1 border-line border-t py-4" key={book.id}>
              <span className="type-subheading" dir="auto">
                {book.title}
              </span>
              {book.author ? (
                <span className="type-body text-text-secondary" dir="auto">
                  {book.author}
                </span>
              ) : null}
              <span className="type-caption text-text-secondary">
                {t(`language.${book.language as charity.CatalogLanguage}`)}
                {book.copies > 1
                  ? ` · ${t("copies", { count: formatNumber(book.copies, locale) })}`
                  : ""}
              </span>
              {book.note ? (
                <span className="type-caption" dir="auto">
                  {book.note}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      <p className="type-caption text-text-secondary">{t("noPrices")}</p>
    </div>
  );
};
