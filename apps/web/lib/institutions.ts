import type { Acknowledged } from "@repo/brand/components/sal/acknowledgment";
import { mediaUrl } from "@/lib/media";

/** An organization from the register, as the public pages read it. */
export interface Organization {
  readonly logo_dark_path?: string | null;
  readonly logo_path: string | null;
  readonly logo_shows_name?: boolean | null;
  readonly logo_static: string | null;
  readonly logo_width: number | null;
  readonly name_ar: string | null;
  readonly name_en: string;
  readonly url: string | null;
}

/**
 * An organization's line entry (decisions.md, Partners; Events): its name
 * in the page's language, its link, and its logo, the uploaded one first
 * (with its logo for dark backgrounds, if any), then AUIB's standard set
 * for the campus partners that use it (apps/web/public/institutions:
 * `<logo>.svg` for paper, `<logo>-white.svg` for ink, each 325 high). The
 * logo is the organization's own in both languages; only its alt text and
 * label follow the page. With no logo, the name stands alone.
 */
export const acknowledged = (
  org: Organization,
  locale: string
): Acknowledged => {
  const uploaded = mediaUrl(org.logo_path);
  let logo: Acknowledged["logo"] = null;
  if (uploaded) {
    logo = {
      height: 48,
      onInk: mediaUrl(org.logo_dark_path ?? null),
      src: uploaded,
      width: 160,
    };
  } else if (org.logo_static && org.logo_width) {
    logo = {
      height: 325,
      onInk: `/institutions/${org.logo_static}-white.svg`,
      src: `/institutions/${org.logo_static}.svg`,
      width: Number(org.logo_width),
    };
  }
  return {
    href: org.url,
    logo,
    name: (locale === "ar" ? org.name_ar : org.name_en) || org.name_en,
    showsName: org.logo_shows_name !== false,
  };
};
