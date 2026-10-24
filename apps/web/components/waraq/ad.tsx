import type { Locale } from "@repo/internationalization";
import { ads, localized } from "@repo/sal-data";
import { clientEnv as env } from "@/env.client";
import { mediaUrl } from "@/lib/media";
import { readPublished } from "@/lib/supabase";
import { AdSlot, type HouseAd } from "./ad-slot";

interface WaraqAdProps {
  readonly locale: Locale;
  /** The page's path, so slots take turns through the running ads. */
  readonly page: string;
  /** This slot's place on the page (0, 1, …). */
  readonly slot: number;
}

/** An ad space in Waraq (see AdSlot): the running ads are read here. */
export const WaraqAd = async ({ locale, page, slot }: WaraqAdProps) => {
  const running = await readPublished(["journal"], ads.currentAds, []);
  const ad = ads.adForSlot(running, page, slot);
  const image = mediaUrl(ad?.image_path);
  const house: HouseAd | null = ad
    ? {
        action: localized(ad, "action", locale),
        body: localized(ad, "body", locale),
        headline: localized(ad, "headline", locale),
        image: image
          ? { alt: localized(ad, "image_alt", locale), url: image }
          : null,
        kind: ad.kind,
        sponsor: localized(ad, "sponsor", locale),
        url: ad.url,
      }
    : null;
  const client = env.NEXT_PUBLIC_ADSENSE_CLIENT;
  const adSlot = env.NEXT_PUBLIC_ADSENSE_SLOT;
  return (
    <AdSlot
      adsense={client && adSlot ? { client, slot: adSlot } : null}
      house={house}
    />
  );
};
