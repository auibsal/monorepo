import { Shelf } from "@repo/brand/components/sal/shelf";
import type { Locale } from "@repo/internationalization";
import { formatClock, formatLongDate } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { localized, productions } from "@repo/sal-data";
import { getTranslations } from "next-intl/server";
import { ManageLinks } from "@/components/manage-links";
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

/** A playbill on the shelf: the poster, or the title set as type. */
const Playbill = ({
  kind,
  locale,
  p,
}: {
  readonly kind: string;
  readonly locale: Locale;
  readonly p: Production;
}) => {
  const poster = mediaUrl(p.poster_path);
  const title = localized(p, "title", locale);
  return (
    <Link className="group grid gap-2" href={`/company/${p.slug}`}>
      {poster ? (
        // biome-ignore lint/performance/noImgElement: a poster from the media bucket
        <img
          alt=""
          className="aspect-[2/3] w-full object-cover"
          height={600}
          src={poster}
          width={400}
        />
      ) : (
        <span className="grid aspect-[2/3] content-between border-line border-t pt-space-4">
          <span className="type-subheading text-balance">{title}</span>
          {p.playwright ? (
            <span className="type-caption text-text-secondary">
              {p.playwright}
            </span>
          ) : null}
        </span>
      )}
      <span className="type-heading group-hover:underline">{title}</span>
      <span className="type-caption text-text-secondary">{kind}</span>
    </Link>
  );
};

/**
 * Staged readings and productions, on the Company's page (/company), as a
 * shelf of playbills (the design review C8, Nov 4, 2026), each linking to
 * its own page, /company/<slug>; the same as a list at
 * /company/productions.
 */
export const Productions = async ({ locale }: { locale: Locale }) => {
  const t = await getTranslations({ locale, namespace: "web.productions" });
  const tj = await getTranslations({ locale, namespace: "web.journal" });
  const list = await loadAll();
  return (
    <Section id="productions" title={t("title")}>
      {list.length === 0 ? (
        <p className="type-body">{t("empty")}</p>
      ) : (
        <Shelf
          items={list.map((p) => ({
            key: p.slug,
            node: (
              <Playbill
                kind={t(`kinds.${p.kind as Kind}`)}
                locale={locale}
                p={p}
              />
            ),
          }))}
          label={t("title")}
          listLink={
            <Link className="link" href="/company/productions">
              {t("asList")}
            </Link>
          }
          nextLabel={tj("shelfNext")}
          previousLabel={tj("shelfPrevious")}
        />
      )}
    </Section>
  );
};

/** /company/productions: the same productions as a plain list. */
export const ProductionsList = async ({ locale }: { locale: Locale }) => {
  const t = await getTranslations({ locale, namespace: "web.productions" });
  const list = await loadAll();
  return (
    <div className="mx-auto grid w-full max-w-4xl gap-10 px-4 py-16 sm:py-24">
      <header className="grid gap-4">
        <h1 className="type-display text-balance">{t("title")}</h1>
        <p>
          <Link className="link" href="/company">
            {t("allCompany")}
          </Link>
        </p>
      </header>
      {list.length === 0 ? <p className="type-body">{t("empty")}</p> : null}
      <ul className="grid border-line border-b">
        {list.map((p) => (
          <li className="grid gap-1 border-line border-t py-3" key={p.slug}>
            <Link className="link" href={`/company/${p.slug}`}>
              {localized(p, "title", locale)}
            </Link>
            <span className="type-caption text-text-secondary">
              {t(`kinds.${p.kind as Kind}`)}
              {p.playwright ? ` · ${t("by", { name: p.playwright })}` : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
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
      <PageHeader lede={summary} title={localized(p, "title", locale)}>
        <ManageLinks diwan={`/company/${p.slug}`} />
      </PageHeader>
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
