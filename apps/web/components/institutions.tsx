import type { Acknowledged } from "@repo/brand/components/sal/acknowledgment";
import { WithTheSupportOf } from "@repo/brand/components/sal/acknowledgment";
import { getDirection, type Locale } from "@repo/internationalization";
import { getTranslations } from "next-intl/server";
import { shownSupporters } from "@/lib/institutions";
import { readPublished } from "@/lib/supabase";

/**
 * "With the support of" and AUIB's own offices (decisions §2), as
 * Partnerships keeps them in the Diwan, on the partners page only: their logos
 * (or, with `logos` off, their names), each linking to its page on AUIB's
 * site.
 */
export const Support = async ({
  className,
  locale,
  logos = false,
}: {
  readonly className?: string;
  readonly locale: Locale;
  readonly logos?: boolean;
}) => {
  const t = await getTranslations({ locale, namespace: "web.institutions" });
  const supporters = await readPublished(["partners"], shownSupporters, []);
  if (supporters.length === 0) {
    return null;
  }
  const items: Acknowledged[] = supporters.map((item) => ({
    href: item.url,
    logo:
      logos && item.logo && item.logo_width
        ? {
            height: 325,
            onInk: `/institutions/${item.logo}-white.svg`,
            src: `/institutions/${item.logo}.svg`,
            width: item.logo_width,
          }
        : null,
    name: (locale === "ar" ? item.name_ar : item.name_en) ?? item.name_en,
  }));
  return (
    <WithTheSupportOf
      className={className}
      compact={!logos}
      dir={getDirection(locale)}
      items={items}
      label={t("withTheSupportOf")}
      lang={locale}
    />
  );
};
