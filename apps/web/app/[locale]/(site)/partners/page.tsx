import { Link } from "@repo/internationalization/navigation";
import { localized, partners } from "@repo/sal-data";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Institutions } from "@/components/institutions";
import { PageHeader, Section } from "@/components/section";
import { mediaUrl } from "@/lib/media";
import { type LocaleParams, sectionMetadata } from "@/lib/page";
import { readPublished } from "@/lib/supabase";

export const generateMetadata = sectionMetadata("web.partners", "/partners");

const REACH = ["auib", "iraq", "international"] as const;

/** What a partnership brings, in three (owner, Oct 31, 2026). */
const MEANS = ["together", "guests", "perks"] as const;

/**
 * The partners' front door (owner, Oct 31, 2026: /partners, in place of
 * /about/partners): what partnering with the Society means, the way to
 * apply (/partners/join) and in for a partner's team, then the partners
 * (Policy Manual P11). Only partners that are active and have a signed
 * memorandum in force appear; the register itself is internal.
 */
const PartnersPage = async ({ params }: LocaleParams) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web.partners" });
  const list = await readPublished(
    ["partners"],
    (c) => partners.publicPartners(c),
    []
  );

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-20 px-4 py-16 sm:py-24">
      <PageHeader lede={t("lede")} title={t("title")} />
      <Section id="what-it-means" title={t("means.title")}>
        <ul className="grid gap-8 sm:grid-cols-3">
          {MEANS.map((key) => (
            <li
              className="grid content-start gap-2 border-line border-t pt-4"
              key={key}
            >
              <h3 className="type-subheading">{t(`means.${key}.title`)}</h3>
              <p className="type-body">{t(`means.${key}.body`)}</p>
            </li>
          ))}
        </ul>
      </Section>
      <Section id="work-with-us" title={t("workTitle")}>
        <p className="type-body">{t("work")}</p>
        <p className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <Link
            className="font-medium text-accent hover:underline"
            href="/partners/join"
          >
            {t("apply")}
          </Link>
          <Link
            className="link"
            href={{
              pathname: "/sign-in",
              query: { next: "/partners/dashboard" },
            }}
          >
            {t("teamSignIn")}
          </Link>
        </p>
      </Section>
      <Institutions />
      {list.length === 0 ? <p className="type-body">{t("empty")}</p> : null}
      {REACH.map((reach) => {
        const group = list.filter((p) => p.reach === reach);
        if (group.length === 0) {
          return null;
        }
        return (
          <Section id={reach} key={reach} title={t(`reach.${reach}`)}>
            <ul className="grid gap-4 sm:grid-cols-2">
              {group.map((partner) => {
                const logo = mediaUrl(partner.logo_path);
                const name = localized(partner, "name", locale);
                return (
                  <li
                    className="grid content-start gap-3 border-line border-t py-space-4"
                    key={partner.slug}
                  >
                    {logo ? (
                      // biome-ignore lint/performance/noImgElement: a partner logo from the media bucket
                      <img
                        alt=""
                        className="h-12 w-auto justify-self-start object-contain"
                        height={48}
                        src={logo}
                        width={160}
                      />
                    ) : null}
                    <h3 className="type-subheading">{name}</h3>
                    {localized(partner, "description", locale) ? (
                      <p className="type-body">
                        {localized(partner, "description", locale)}
                      </p>
                    ) : null}
                    {partner.url ? (
                      <a
                        className="type-body justify-self-start underline underline-offset-4"
                        href={partner.url}
                        rel="noopener"
                        target="_blank"
                      >
                        {t("visit", { name })}
                      </a>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </Section>
        );
      })}
    </div>
  );
};

export default PartnersPage;
