import type { Locale } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { getTranslations } from "next-intl/server";
import { localized, programmes } from "@/lib/data";
import { mediaUrl } from "@/lib/media";
import { readPublished } from "@/lib/supabase";

/**
 * Next Stop's published episodes, the latest first (decisions.md, Next
 * Stop): the Society's show, not part of Qirtas, kept in
 * programmes.episodes and edited in the Diwan (Media → Next Stop).
 */
export const loadEpisodes = () =>
  readPublished(["journal"], (c) => programmes.publicEpisodes(c), []);

export const episodeTitle = (
  episode: programmes.PublicEpisode,
  locale: Locale
) => localized(episode, "title", locale);

/** One episode as a card: its thumbnail, number, title and release date. */
export const EpisodeCard = async ({
  episode,
  heading = "h3",
  locale,
}: {
  episode: programmes.PublicEpisode;
  heading?: "h2" | "h3";
  locale: Locale;
}) => {
  const t = await getTranslations({ locale, namespace: "web.journal" });
  const Heading = heading;
  const image = mediaUrl(episode.thumbnail_path);
  return (
    <article className="grid gap-2">
      {image ? (
        // biome-ignore lint/performance/noImgElement: a public media object, sized by the card
        <img
          alt=""
          className="aspect-video w-full object-cover"
          height={720}
          loading="lazy"
          src={image}
          width={1280}
        />
      ) : null}
      {episode.number ? (
        <p className="type-label">
          {t("nextStop.episode", { number: String(episode.number) })}
        </p>
      ) : null}
      <Heading className="type-subheading">
        <Link
          className="hover:underline"
          href={`/next-stop/episodes/${episode.slug}`}
        >
          {episodeTitle(episode, locale)}
        </Link>
      </Heading>
      {episode.released_on ? (
        <p className="type-caption text-text-secondary">
          {t("nextStop.released", {
            date: formatLongDate(episode.released_on, locale),
          })}
        </p>
      ) : null}
    </article>
  );
};
