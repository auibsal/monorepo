"use client";

import { hasSessionCookie } from "@repo/auth/session-cookie";
import { Link } from "@repo/internationalization/navigation";
import Script from "next/script";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

export interface HouseAd {
  action: string;
  body: string;
  headline: string;
  image: { alt: string; url: string } | null;
  kind: "society" | "sponsor";
  sponsor: string;
  url: string;
}

interface AdSlotProps {
  readonly adsense: { client: string; slot: string } | null;
  readonly house: HouseAd | null;
}

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

/** Google's display ad unit, filled once it is on the page. */
const AdSenseUnit = ({ client, slot }: { client: string; slot: string }) => {
  const unit = useRef<HTMLModElement>(null);

  useEffect(() => {
    if (unit.current && !unit.current.dataset.adsbygoogleStatus) {
      window.adsbygoogle = window.adsbygoogle ?? [];
      window.adsbygoogle.push({});
    }
  }, []);

  return (
    <>
      <Script
        crossOrigin="anonymous"
        id="adsense"
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`}
        strategy="afterInteractive"
      />
      <ins
        className="adsbygoogle block min-h-24 w-full"
        data-ad-client={client}
        data-ad-format="auto"
        data-ad-slot={slot}
        data-full-width-responsive="true"
        ref={unit}
      />
    </>
  );
};

/**
 * One ad space in Waraq: a Society or sponsor ad when one is running,
 * otherwise AdSense when it is set up. Visitors who are signed in (members
 * of the Nexus) never see it; it waits for the browser to check, so they
 * see no flash of an ad either.
 */
export const AdSlot = ({ adsense, house }: AdSlotProps) => {
  const t = useTranslations("web.ads");
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(!hasSessionCookie(document.cookie));
  }, []);

  if (!(show && (house || adsense))) {
    return null;
  }

  const label = (() => {
    if (!house) {
      return t("advertisement");
    }
    return house.kind === "sponsor"
      ? t("sponsoredBy", { name: house.sponsor })
      : t("fromTheSociety");
  })();

  return (
    <aside
      aria-label={label}
      className="grid gap-3 rounded-card bg-surface-tint p-4"
    >
      <p className="type-kicker text-text-meta">{label}</p>
      {house ? (
        <div className="grid items-center gap-4 sm:grid-cols-[auto_1fr]">
          {house.image ? (
            // biome-ignore lint/performance/noImgElement: a published image from the media bucket
            <img
              alt={house.image.alt}
              className="aspect-square w-24 rounded-card object-cover"
              height={96}
              loading="lazy"
              src={house.image.url}
              width={96}
            />
          ) : null}
          <div className="grid gap-2">
            <p className="type-subheading">{house.headline}</p>
            {house.body ? <p className="type-caption">{house.body}</p> : null}
            {house.url.startsWith("/") ? (
              <Link
                className="justify-self-start text-title underline underline-offset-4"
                href={house.url}
              >
                {house.action || t("learnMore")}
              </Link>
            ) : (
              <a
                className="justify-self-start text-title underline underline-offset-4"
                href={house.url}
                rel={
                  house.kind === "sponsor" ? "sponsored noopener" : "noopener"
                }
              >
                {house.action || t("learnMore")}
              </a>
            )}
          </div>
        </div>
      ) : null}
      {!house && adsense ? <AdSenseUnit {...adsense} /> : null}
    </aside>
  );
};
