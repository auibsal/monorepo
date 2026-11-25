import {
  CampusPartners as CampusLine,
  LogoBand,
} from "@repo/brand/components/sal/acknowledgment";
import { getDirection, type Locale } from "@repo/internationalization";
import { getTranslations } from "next-intl/server";
import { partners } from "@/lib/data";
import { acknowledged } from "@/lib/institutions";
import { readPublished } from "@/lib/supabase";

/**
 * "Campus partners" (decisions.md, Partners): AUIB's own offices, from the
 * one register, on the partners page after the partners, each linking to
 * its page on AUIB's site.
 */
export const CampusPartners = async ({
  className,
  locale,
}: {
  readonly className?: string;
  readonly locale: Locale;
}) => {
  const t = await getTranslations({ locale, namespace: "web.institutions" });
  const list = await readPublished(
    ["partners"],
    (c) => partners.publicPartners(c),
    []
  );
  const campus = list
    .filter((p) => p.relation === "campus")
    .map((p) => acknowledged(p, locale))
    .sort((a, b) => a.name.localeCompare(b.name, locale));
  return campus.length === 0 ? null : (
    <LogoBand className={className}>
      <CampusLine
        dir={getDirection(locale)}
        items={campus}
        label={t("campusPartners")}
        lang={locale}
      />
    </LogoBand>
  );
};
