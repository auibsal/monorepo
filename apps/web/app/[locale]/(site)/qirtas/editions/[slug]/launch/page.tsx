import type { Locale } from "@repo/internationalization";
import { formatClock, formatLongDate } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { journal, localized } from "@repo/sal-data";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { pieceHref } from "@/components/qirtas/cards";
import { localizedMetadata } from "@/lib/metadata";
import { readPublished } from "@/lib/supabase";

interface LaunchProps {
  readonly params: Promise<{ locale: Locale; slug: string }>;
}

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
type Edition = Awaited<ReturnType<typeof journal.issueBySlug>>;

const load = (slug: string): Promise<Edition | null> =>
  SLUG.test(slug)
    ? readPublished(["journal"], (c) => journal.issueBySlug(c, slug), null)
    : Promise.resolve(null);

export const generateMetadata = async ({
  params,
}: LaunchProps): Promise<Metadata> => {
  const { locale, slug } = await params;
  const edition = await load(slug);
  if (!edition) {
    return {};
  }
  const t = await getTranslations({ locale, namespace: "web.journal" });
  return localizedMetadata(locale, `/qirtas/editions/${edition.slug}/launch`, {
    description: localized(edition, "theme", locale),
    title: `${localized(edition, "title", locale)} · ${t("launchTitle")}`,
  });
};

/**
 * An Edition's launch page (design review A22),
 * /qirtas/editions/<slug>/launch: the Edition in large type, its contents
 * and its Launch Night, for the evening itself and for sharing. Only what
 * the Edition's record holds; the plain Edition page stays the reference.
 */
const LaunchPage = async ({ params }: LaunchProps) => {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const edition = await load(slug);
  if (!edition) {
    notFound();
  }
  const t = await getTranslations({ locale, namespace: "web.journal" });
  const [pieces, launch] = await Promise.all([
    readPublished(["journal"], (c) => journal.editionPieces(c, edition.id), []),
    readPublished(
      ["journal", "events"],
      (c) => journal.editionLaunch(c, edition.id),
      null
    ),
  ]);
  const contents = journal.inLanguage(pieces, locale);

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-16 px-4 py-16 sm:py-24">
      <header className="grid gap-6">
        <p className="font-medium text-3xl tracking-tight">{t("title")}</p>
        <h1 className="type-display-xl max-w-5xl text-balance">
          {localized(edition, "title", locale)}
        </h1>
        {localized(edition, "theme", locale) ? (
          <p className="type-lede max-w-[40ch]">
            {localized(edition, "theme", locale)}
          </p>
        ) : null}
      </header>

      {launch ? (
        <section aria-labelledby="launch-night" className="grid gap-2">
          <h2 className="type-heading" id="launch-night">
            {t("launchTitle")}
          </h2>
          <Link className="link type-title" href={`/events/${launch.slug}`}>
            {[
              `${formatLongDate(launch.starts_at, locale)}, ${formatClock(launch.starts_at, locale)}`,
              localized(launch, "venue", locale),
            ]
              .filter(Boolean)
              .join(" · ")}
          </Link>
        </section>
      ) : null}

      {contents.length > 0 ? (
        <section aria-labelledby="contents" className="grid gap-6">
          <h2 className="type-heading" id="contents">
            {t("contents")}
          </h2>
          <ol className="grid border-line border-b">
            {contents.map((piece) => (
              <li className="border-line border-t" key={piece.id}>
                <Link
                  className="group grid gap-x-8 gap-y-1 py-4 sm:grid-cols-[1fr_auto] sm:items-baseline"
                  href={pieceHref(piece)}
                >
                  <span className="type-display group-hover:text-accent">
                    {localized(piece, "title", locale)}
                  </span>
                  {piece.contributor ? (
                    <span className="type-body text-text-secondary">
                      {localized(piece.contributor, "name", locale)}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <p className="type-body">
        <Link className="link" href={`/qirtas/editions/${edition.slug}`}>
          {t("theEdition")}
        </Link>
      </p>
    </div>
  );
};

export default LaunchPage;
