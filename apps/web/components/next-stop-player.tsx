"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

/**
 * A click-to-load player (decisions.md, Next Stop): nothing from YouTube
 * loads until the viewer plays, then youtube-nocookie.com. Chapters jump
 * the player to their start.
 */
export const NextStopPlayer = ({
  image,
  start,
  title,
  videoId,
}: {
  image: string | null;
  start?: number;
  title: string;
  videoId: string;
}) => {
  const t = useTranslations("web.journal.nextStop");
  const [playing, setPlaying] = useState(false);
  if (playing) {
    return (
      <div className="aspect-video w-full overflow-hidden">
        <iframe
          allow="autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          className="h-full w-full"
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-popups allow-popups-to-escape-sandbox allow-presentation allow-same-origin allow-scripts"
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0${start ? `&start=${start}` : ""}`}
          title={title}
        />
      </div>
    );
  }
  return (
    <div className="grid gap-2">
      <button
        className="bg-band text-on-band relative grid aspect-video w-full place-items-center overflow-hidden"
        onClick={() => setPlaying(true)}
        type="button"
      >
        {image ? (
          // biome-ignore lint/performance/noImgElement: the episode's own thumbnail
          <img
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            height={720}
            src={image}
            width={1280}
          />
        ) : null}
        <span className="type-label bg-band text-on-band relative px-4 py-2">
          {t("play")}
        </span>
      </button>
      <p className="type-caption text-text-secondary">{t("playNote")}</p>
    </div>
  );
};
