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

type Fill = "pending" | "filled" | "unfilled";

/**
 * Google's display ad unit, filled once it is on the page. Google marks the
 * unit `data-ad-status="unfilled"` when it has nothing to show; the slot
 * then disappears rather than leaving an empty box.
 */
const AdSenseUnit = ({
  client,
  onFill,
  slot,
}: {
  client: string;
  onFill: (fill: Fill) => void;
  slot: string;
}) => {
  const unit = useRef<HTMLModElement>(null);

  useEffect(() => {
    const element = unit.current;
    if (!element) {
      return;
    }
    if (!element.dataset.adsbygoogleStatus) {
      window.adsbygoogle = window.adsbygoogle ?? [];
      window.adsbygoogle.push({});
    }
    const report = () => {
      const status = element.dataset.adStatus;
      if (status === "filled" || status === "unfilled") {
        onFill(status);
      }
    };
    report();
    const observer = new MutationObserver(report);
    observer.observe(element, {
      attributeFilter: ["data-ad-status"],
      attributes: true,
    });
    return () => observer.disconnect();
  }, [onFill]);

  return (
    <>
      <Script
        crossOrigin="anonymous"
        id="adsense"
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`}
        strategy="afterInteractive"
      />
      <ins
        className="adsbygoogle block w-full"
        data-ad-client={client}
        data-ad-format="auto"
        data-ad-slot={slot}
        data-full-width-responsive="true"
        ref={unit}
      />
    </>
  );
};

const linkClass = "justify-self-start text-text underline underline-offset-4";

/** A Society or sponsor ad: image, headline, line, one link. */
const HouseAdView = ({ house }: { house: HouseAd }) => {
  const t = useTranslations("web.ads");
  const action = house.action || t("learnMore");
  return (
    <div className="grid items-center gap-4 sm:grid-cols-[auto_1fr]">
      {house.image ? (
        // biome-ignore lint/performance/noImgElement: a published image from the media bucket
        <img
          alt={house.image.alt}
          className="aspect-square w-24 object-cover"
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
          <Link className={linkClass} href={house.url}>
            {action}
          </Link>
        ) : (
          <a
            className={linkClass}
            href={house.url}
            rel={house.kind === "sponsor" ? "sponsored noopener" : "noopener"}
          >
            {action}
          </a>
        )}
      </div>
    </div>
  );
};

const adLabel = (
  t: ReturnType<typeof useTranslations<"web.ads">>,
  house: HouseAd | null
) => {
  if (!house) {
    return t("advertisement");
  }
  return house.kind === "sponsor"
    ? t("sponsoredBy", { name: house.sponsor })
    : t("fromTheSociety");
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
  const [fill, setFill] = useState<Fill>("pending");

  useEffect(() => {
    setShow(!hasSessionCookie(document.cookie));
  }, []);

  if (!(show && (house || adsense)) || (!house && fill === "unfilled")) {
    return null;
  }
  // Google's unit says nothing until it has an ad: no label, no box.
  const quiet = !house && fill !== "filled";

  const label = adLabel(t, house);

  return (
    <aside
      aria-label={label}
      className={quiet ? "grid" : "grid gap-3 border-line border-t p-4"}
    >
      {quiet ? null : <p className="type-label text-text-secondary">{label}</p>}
      {house ? <HouseAdView house={house} /> : null}
      {!house && adsense ? <AdSenseUnit {...adsense} onFill={setFill} /> : null}
    </aside>
  );
};
