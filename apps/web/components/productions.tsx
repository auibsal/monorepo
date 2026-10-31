import type { Locale } from "@repo/internationalization";
import { formatClock, formatLongDate } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { localized, productions } from "@repo/sal-data";
import { getTranslations } from "next-intl/server";
import { PageHeader, Section } from "@/components/section";
import { mediaUrl } from "@/lib/media";
import { readPublished } from "@/lib/supabase";

type Kind = productions.ProductionKind;
type Department = productions.Department;

const DEPARTMENTS = productions.departments;

const loadAll = async () =>
  readPublished(
    ["productions", "partners", "events"],
    async (c) => {
      const list = await productions.publicProductions(c);
      return Promise.all(
        list.map(async (p) => ({
          ...p,
          ...(await productions.publicProduction(c, p.id)),
        }))
      );
    },
    []
  );

type Production = Awaited<ReturnType<typeof loadAll>>[number];

/**
 * Staged readings and productions, on the Company's page (/company): each
 * a line linking to its own page, /company/<slug>.
 */
export const Productions = async ({ locale }: { locale: Locale }) => {
  const t = await getTranslations({ locale, namespace: "web.productions" });
  const list = await loadAll();
  return (
    <Section id="productions" title={t("title")}>
      {list.length === 0 ? <p className="type-body">{t("empty")}</p> : null}
      <ul className="grid gap-x-10 md:grid-cols-2">
        {list.map((p) => (
          <li
            className="grid content-start gap-2 border-line border-t py-space-4"
            key={p.slug}
          >
            <h3 className="type-heading">
              <Link className="hover:text-accent" href={`/company/${p.slug}`}>
                {localized(p, "title", locale)}
              </Link>
            </h3>
            <p className="type-label">
              {t(`kinds.${p.kind as Kind}`)}
              {p.playwright ? ` · ${t("by", { name: p.playwright })}` : ""}
            </p>
            {localized(p, "summary", locale) ? (
              <p className="type-body text-text-secondary">
                {localized(p, "summary", locale)}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </Section>
  );
};

/** One production by its address, if it may be public. */
export const loadProduction = async (slug: string) =>
  (await loadAll()).find((p) => p.slug === slug) ?? null;

/**
 * A production's own page: only what may be public is shown (the title,
 * summary and poster, the credits people agreed to show, partners with a
 * memorandum in force, and published performances once the script's
 * rights are cleared).
 */
export const ProductionView = async ({
  locale,
  p,
}: {
  locale: Locale;
  p: Production;
}) => {
  const t = await getTranslations({ locale, namespace: "web.productions" });
  const poster = mediaUrl(p.poster_path);
  const summary = localized(p, "summary", locale);
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-16 sm:py-24">
      <PageHeader lede={summary} title={localized(p, "title", locale)} />
      <div className="grid gap-6 sm:grid-cols-[1fr_2fr]">
        {poster ? (
          // biome-ignore lint/performance/noImgElement: a poster from the media bucket
          <img
            alt={t("posterAlt", { title: localized(p, "title", locale) })}
            className="w-full object-cover"
            height={600}
            src={poster}
            width={420}
          />
        ) : null}
        <div className="grid content-start gap-4">
          <p className="type-label">
            {t(`kinds.${p.kind as Kind}`)}
            {p.playwright ? ` · ${t("by", { name: p.playwright })}` : ""}
          </p>
          {p.partners.length > 0 ? (
            <p className="type-body">
              {t("with", {
                names: p.partners
                  .map((partner) => localized(partner, "name", locale))
                  .join(locale === "ar" ? "، " : ", "),
              })}
            </p>
          ) : null}
          {p.performances.length > 0 ? (
            <div className="grid gap-2">
              <h3 className="type-subheading">{t("performances")}</h3>
              <ul className="grid gap-2">
                {p.performances.map((e) => (
                  <li key={e.slug}>
                    <Link className="link" href={`/events/${e.slug}`}>
                      {formatLongDate(e.starts_at, locale)} ·{" "}
                      {formatClock(e.starts_at, locale)}
                      {localized(e, "venue", locale)
                        ? ` · ${localized(e, "venue", locale)}`
                        : ""}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {p.credits.length > 0 ? (
            <div className="grid gap-3">
              <h3 className="type-subheading">{t("company")}</h3>
              {DEPARTMENTS.map((d) => {
                const people = p.credits.filter((c) => c.department === d);
                if (people.length === 0) {
                  return null;
                }
                return (
                  <div className="grid gap-1" key={d}>
                    <p className="type-label">
                      {t(`departments.${d as Department}`)}
                    </p>
                    <ul className="grid gap-1">
                      {people.map((c) => (
                        <li
                          className="type-body"
                          key={`${c.role_en}-${c.name_en}`}
                        >
                          <span className="font-bold">
                            {localized(c, "name", locale)}
                          </span>
                          {" · "}
                          {localized(c, "role", locale)}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      </div>
      <p className="border-line border-t pt-space-4">
        <Link className="link type-caption" href="/company">
          {t("allCompany")}
        </Link>
      </p>
    </div>
  );
};
