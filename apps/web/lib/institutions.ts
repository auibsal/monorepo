import type { Acknowledged } from "@repo/brand/components/sal/acknowledgment";
import { mediaUrl } from "@/lib/media";

/** An organization from the register, as the public pages read it. */
export interface Organization {
  readonly logo_path: string | null;
  readonly logo_static: string | null;
  readonly logo_width: number | null;
  readonly name_ar: string | null;
  readonly name_en: string;
  readonly url: string | null;
}

/**
 * An organization's line entry (decisions.md, Partners): its name in the
 * page's language, its link, and its logo, the uploaded one first, then
 * AUIB's standard set for the campus partners that use it
 * (apps/web/public/institutions: `<logo>.svg` for paper, `<logo>-white.svg`
 * for ink, each 325 high). With no logo, the name stands alone.
 */
export const acknowledged = (
  org: Organization,
  locale: string
): Acknowledged => {
  const uploaded = mediaUrl(org.logo_path);
  let logo: Acknowledged["logo"] = null;
  if (uploaded) {
    logo = { height: 48, src: uploaded, width: 160 };
  } else if (org.logo_static && org.logo_width) {
    logo = {
      height: 325,
      onInk: `/institutions/${org.logo_static}-white.svg`,
      src: `/institutions/${org.logo_static}.svg`,
      width: org.logo_width,
    };
  }
  return {
    href: org.url,
    logo,
    name: (locale === "ar" ? org.name_ar : org.name_en) || org.name_en,
  };
};
