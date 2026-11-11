import type { Acknowledged } from "@repo/brand/components/sal/acknowledgment";
import { WithTheSupportOf } from "@repo/brand/components/sal/acknowledgment";
import { getDirection, type Locale } from "@repo/internationalization";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { shownSupporters } from "@/lib/institutions";
import { readPublished } from "@/lib/supabase";

interface SupportProps {
  readonly className?: string;
  readonly locale: Locale;
  readonly logos?: boolean;
}

/**
 * "With the support of" and AUIB's own offices (decisions §2), as
 * Partnerships keeps them in the Diwan, on the partners page only: their logos
 * (or, with `logos` off, their names), each linking to its page on AUIB's
 * site.
 */
export const Support = (props: SupportProps) => (
  // A read the cache can't keep (an error, or a table not yet migrated when
  // a preview builds against production) streams in, not blocks the page.
  <Suspense fallback={null}>
    <SupportList {...props} />
  </Suspense>
);

const SupportList = async ({
  className,
  locale,
  logos = false,
}: SupportProps) => {
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
