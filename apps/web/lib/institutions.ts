import type { Acknowledged } from "@repo/brand/components/sal/acknowledgment";
import { mediaUrl } from "@/lib/media";

/** An organization from the register, as the public pages read it. */
export interface Organization {
  readonly logo_path: string | null;
  readonly logo_shows_name?: boolean | null;
  readonly logo_static: string | null;
  readonly logo_width: number | null;
  readonly name_ar: string | null;
  readonly name_en: string;
  readonly url: string | null;
}

/**
 * Logos in AUIB's standard set that are one file, in their own colors,
 * with no white version: their size and their own alt text (WCAG 1.1.1).
 */
const ONE_FILE: Record<
  string,
  {
    readonly alt: { readonly ar: string; readonly en: string };
    readonly height: number;
    readonly src: string;
    readonly width: number;
  }
> = {
  "american-space": {
    alt: {
      ar: "المساحة الأمريكية: علم الولايات المتحدة، وختم بعثة الولايات المتحدة في العراق، وشعار المساحات الأمريكية، وشعار الجامعة الأمريكية في العراق – بغداد",
      en: "American Space: the U.S. flag, the seal of the United States Mission Iraq, the American Spaces logo and AUIB’s logo",
    },
    height: 600,
    src: "/institutions/american-space-logo-color.png",
    width: 3832,
  },
};

/** An organization's logo: uploaded, or from AUIB's standard set. */
const logoOf = (org: Organization, locale: string) => {
  const uploaded = mediaUrl(org.logo_path);
  if (uploaded) {
    return { alt: null, logo: { height: 48, src: uploaded, width: 160 } };
  }
  const one = org.logo_static ? ONE_FILE[org.logo_static] : undefined;
  if (one) {
    return {
      alt: locale === "ar" ? one.alt.ar : one.alt.en,
      logo: { height: one.height, src: one.src, width: one.width },
    };
  }
  if (org.logo_static && org.logo_width) {
    return {
      alt: null,
      logo: {
        height: 325,
        src: `/institutions/${org.logo_static}.svg`,
        width: Number(org.logo_width),
      },
    };
  }
  return { alt: null, logo: null };
};

/**
 * An organization's line entry (decisions.md, Partners; Events): its name
 * in the page's language, its link, and its logo, the uploaded one first,
 * then AUIB's standard set
 * for the campus partners that use it (apps/web/public/institutions:
 * `<logo>.svg`, 325 high, or one file with its own size and alt text, as
 * the American Space's lockup). The logo is
 * the organization's own in both languages; only its alt text and label
 * follow the page. Every logo has one version where it shows in a row: in
 * dark mode the row sits on a white band. With no logo, the name stands
 * alone.
 */
export const acknowledged = (
  org: Organization,
  locale: string
): Acknowledged => {
  const { alt, logo } = logoOf(org, locale);
  return {
    href: org.url,
    logo,
    logoAlt: alt,
    name: (locale === "ar" ? org.name_ar : org.name_en) || org.name_en,
    showsName: org.logo_shows_name !== false,
  };
};
