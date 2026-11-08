import type { Locale } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import { journal, localized } from "@repo/sal-data";
import { getTranslations } from "next-intl/server";
import { readingUrl } from "@/lib/media";
import { readPublished } from "@/lib/supabase";

/**
 * The piece read aloud (design review A11, decision D10): the browser's own
 * player, which loads nothing until it is played.
 */
export const Reading = async ({
  locale,
  path,
}: {
  locale: Locale;
  path: string | null;
}) => {
  const src = readingUrl(path);
  if (!src) {
    return null;
  }
  const t = await getTranslations({ locale, namespace: "web.journal" });
  return (
    <figure className="grid w-full gap-2 print:hidden">
      <figcaption className="type-caption">{t("listen")}</figcaption>
      {/* biome-ignore lint/a11y/useMediaCaption: a reading of the text printed below it */}
      <audio className="w-full" controls preload="none" src={src} />
    </figure>
  );
};

/**
 * The clip paired with a piece (design review A12): a published Video
 * piece, played here and linked to its own page.
 */
export const PairedClip = async ({
  clipId,
  locale,
}: {
  clipId: string | null;
  locale: Locale;
}) => {
  const [clip] = await readPublished(
    ["journal"],
    async (c) => {
      const found = await journal.pieceClip(c, clipId);
      return found ? [found] : [];
    },
    []
  );
  if (!clip) {
    return null;
  }
  const t = await getTranslations({ locale, namespace: "web.journal" });
  const id = journal.youtubeId(clip.video_url);
  const title = localized(clip, "title", locale);
  return (
    <aside
      aria-labelledby="clip"
      className="border-line mx-auto grid w-full max-w-3xl gap-3 border-t px-4 pt-6 print:hidden"
    >
      <h2 className="type-heading" id="clip">
        {clip.category === "next_stop_episode"
          ? t("clipNextStop")
          : t("clipTitle")}
      </h2>
      {id ? (
        <div className="aspect-video w-full overflow-hidden">
          <iframe
            allow="encrypted-media; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            sandbox="allow-popups allow-popups-to-escape-sandbox allow-presentation allow-same-origin allow-scripts"
            src={`https://www.youtube-nocookie.com/embed/${id}`}
            title={title}
          />
        </div>
      ) : null}
      <Link
        className="type-body justify-self-start underline underline-offset-4"
        href={journal.piecePath(clip)}
      >
        {title}
      </Link>
    </aside>
  );
};
