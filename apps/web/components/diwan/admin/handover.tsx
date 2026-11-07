"use client";

import { useAuth } from "@repo/auth/provider";
import type { Locale } from "@repo/internationalization";
import {
  formatLongDate,
  formatNumber,
} from "@repo/internationalization/format";
import { unwrap } from "@repo/sal-data";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/lib/diwan/navigation";
import { DiwanSection, RowList } from "../page";

/** Where each waiting thing is handled in the Diwan. */
const WHERE: Record<string, string> = {
  grants_asked: "/partnerships",
  hiring_new: "/membership/openings",
  partner_applications: "/partnerships/applications",
  requests_open: "/council/requests",
  submissions_new: "/qirtas",
};

interface Owner {
  name_ar: string | null;
  name_en: string | null;
  title_ar: string | null;
  title_en: string | null;
}

/**
 * The handover (design review A39): what waits across the Society, how
 * long the oldest has waited, and who owns it, by name and title
 * (`core.handover()`, officers only). Every officer sees it, so a new
 * term's team can see what it takes over.
 */
export const Handover = () => {
  const t = useTranslations("diwan.admin.overview.handover");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const rows = useQuery({
    queryFn: async () =>
      unwrap(await supabase.schema("core").rpc("handover")) ?? [],
    queryKey: ["admin", "handover"],
  });
  if (!rows.data) {
    return null;
  }
  const waiting = rows.data.filter((r) => r.waiting > 0);
  const name = (o: Owner) => {
    const n = (locale === "ar" ? o.name_ar : o.name_en) ?? o.name_en ?? "";
    const title = (locale === "ar" ? o.title_ar : o.title_en) ?? "";
    return title ? t("owner", { name: n, title }) : n;
  };

  return (
    <DiwanSection description={t("lede")} id="handover" title={t("title")}>
      {waiting.length === 0 ? (
        <p className="type-body text-text-secondary">{t("nothing")}</p>
      ) : (
        <RowList>
          {waiting.map((r) => {
            const owners = (r.owners ?? []) as unknown as Owner[];
            return (
              <li className="grid gap-1 py-space-4" key={r.item}>
                <Link
                  className="type-subheading hover:text-accent"
                  href={WHERE[r.item] ?? "/"}
                >
                  {t(`items.${r.item}` as "items.hiring_new", {
                    n: formatNumber(r.waiting),
                  })}
                </Link>
                {r.oldest_at ? (
                  <p className="type-caption">
                    {t("oldest", { date: formatLongDate(r.oldest_at, locale) })}
                  </p>
                ) : null}
                <p className="type-body text-text-secondary">
                  {owners.length > 0
                    ? t("owners", { names: owners.map(name).join(t("and")) })
                    : t("noOwner")}
                </p>
              </li>
            );
          })}
        </RowList>
      )}
    </DiwanSection>
  );
};
