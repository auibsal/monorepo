import type { Locale } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { episodeTitle } from "@/components/next-stop";
import { NextStopPlayer } from "@/components/next-stop-player";
import { localized, programmes } from "@/lib/data";
import { episodeLd, JsonLd } from "@/lib/json-ld";
import { mediaUrl } from "@/lib/media";
import { localizedMetadata } from "@/lib/metadata";
import { PLACEHOLDER_SLUG } from "@/lib/placeholder";
import { readPublished } from "@/lib/supabase";

// Made on its first visit, then kept until an episode is published again.
export const instant = false;
export const generateStaticParams = () => [{ slug: PLACEHOLDER_SLUG }];

interface EpisodeProps {
  readonly params: Promise<{ locale: Locale; slug: string }>;
}

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/u;

type Episode = programmes.PublicEpisode;

const load = (slug: string): Promise<Episode | null> =>
  SLUG.test(slug)
    ? readPublished(["journal"], (c) => programmes.publicEpisode(c, slug), null)
    : Promise.resolve(null);

export const generateMetadata = async ({
  params,
}: EpisodeProps): Promise<Metadata> => {
  const { locale, slug } = await params;
  const episode = await load(slug);
  if (!episode) {
    return {};
  }
  return localizedMetadata(locale, `/next-stop/episodes/${episode.slug}`, {
    description: localized(episode, "summary", locale),
    image: mediaUrl(episode.thumbnail_path) ?? undefined,
    title: episodeTitle(episode, locale),
  });
};

/** One Next Stop episode: the player, its chapters and its credits. */
const EpisodePage = async ({ params }: EpisodeProps) => {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const episode = await load(slug);
  if (!episode) {
    notFound();
  }
  const t = await getTranslations({ locale, namespace: "web.journal" });
  const credits = await readPublished(
    ["journal"],
    (c) => programmes.episodeCredits(c, episode.id),
    []
  );
  const title = episodeTitle(episode, locale);
  const description = localized(episode, "summary", locale) || null;
  // The edition in the page's language, when there is one per language.
  const videoId =
    locale === "ar" && episode.youtube_id_ar
      ? episode.youtube_id_ar
      : episode.youtube_id;
  const image = mediaUrl(episode.thumbnail_path);
  const chapters = programmes.chaptersOf(episode.chapters);
  const byCredit = programmes.CREDITS.flatMap((credit) => {
    const names = credits
      .filter((c) => c.credit === credit)
      .map((c) => (locale === "ar" ? c.name_ar || c.name_en : c.name_en))
      .filter(Boolean);
    return names.length > 0 ? [{ credit, names }] : [];
  });

  return (
    <article className="mx-auto grid w-full max-w-4xl gap-8 px-4 py-10">
      <JsonLd
        data={episodeLd(locale, {
          description,
          duration: episode.duration_seconds,
          image,
          number: episode.number,
          released: episode.released_on,
          slug: episode.slug,
          title,
          youtubeId: videoId,
        })}
      />
      <header className="grid gap-2">
        <p className="type-caption">
          <Link className="link" href="/next-stop">
            {t("nextStop.title")}
          </Link>
          {episode.number
            ? ` · ${t("nextStop.episode", { number: String(episode.number) })}`
            : ""}
        </p>
        <h1 className="type-display">{title}</h1>
        {episode.released_on ? (
          <p className="type-caption text-text-secondary">
            {t("nextStop.released", {
              date: formatLongDate(episode.released_on, locale),
            })}
          </p>
        ) : null}
      </header>
      <NextStopPlayer image={image} title={title} videoId={videoId} />
      {description ? (
        <p className="type-lede max-w-[60ch]">{description}</p>
      ) : null}

      {chapters.length > 0 ? (
        <section aria-labelledby="chapters" className="grid gap-3">
          <h2 className="type-heading" id="chapters">
            {t("nextStop.chapters")}
          </h2>
          <ol className="border-line grid border-b">
            {chapters.map((chapter) => (
              <li
                className="border-line flex flex-wrap gap-x-4 border-t py-2"
                key={chapter.at}
              >
                <a
                  className="link type-code"
                  dir="ltr"
                  href={`https://www.youtube.com/watch?v=${videoId}&t=${chapter.at}s`}
                  rel="noopener"
                >
                  {programmes.clockOf(chapter.at)}
                </a>
                <span>{localized(chapter, "title", locale)}</span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {byCredit.length > 0 ? (
        <section aria-labelledby="credits" className="grid gap-3">
          <h2 className="type-heading" id="credits">
            {t("nextStop.credits")}
          </h2>
          <dl className="border-line grid border-b">
            {byCredit.map(({ credit, names }) => (
              <div
                className="border-line grid gap-1 border-t py-3 sm:grid-cols-[14rem_1fr]"
                key={credit}
              >
                <dt className="type-label">{t(`nextStop.credit.${credit}`)}</dt>
                <dd>{names.join(locale === "ar" ? "، " : ", ")}</dd>
              </div>
            ))}
          </dl>
          <p className="type-caption text-text-secondary max-w-[60ch]">
            {t("nextStop.closing")}
          </p>
        </section>
      ) : null}
    </article>
  );
};

export default EpisodePage;
