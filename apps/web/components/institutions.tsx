import type { Acknowledged } from "@repo/brand/components/sal/acknowledgment";
import { WithTheSupportOf } from "@repo/brand/components/sal/acknowledgment";
import { getDirection, type Locale } from "@repo/internationalization";
import { getTranslations } from "next-intl/server";
import { INSTITUTIONS } from "@/lib/institutions";

/**
 * "With the support of" and AUIB's own offices (decisions §2), from the
 * fixed list in lib/institutions, on the partners page only: their logos
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
  const items: Acknowledged[] = INSTITUTIONS.map((item) => ({
    href: item.url,
    logo: logos
      ? {
          height: 325,
          onInk: `/institutions/${item.logo}-white.svg`,
          src: `/institutions/${item.logo}.svg`,
          width: item.width,
        }
      : null,
    name: t(`names.${item.key}`),
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
