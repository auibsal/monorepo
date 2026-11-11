import { Link } from "@repo/internationalization/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Support } from "@/components/institutions";
import { ManageLinks } from "@/components/manage-links";
import { PageHeader, Section } from "@/components/section";
import { localized, partners } from "@/lib/data";
import { mediaUrl } from "@/lib/media";
import { type LocaleParams, sectionMetadata } from "@/lib/page";
import { readPublished } from "@/lib/supabase";

export const generateMetadata = sectionMetadata("web.partners", "/partners");

/**
 * Partners by kind (decisions.md, Partners and sponsors on the site): each
 * group alphabetical, every logo the same size, no tiers or ranking.
 */
const GROUPS = {
  charities: ["charity", "foundation"],
  clubs: ["club"],
  culture: ["cultural", "publisher", "archive", "media"],
  others: ["department", "business", "other"],
  schools: ["university"],
} as const;
const GROUP_ORDER = [
  "clubs",
  "culture",
  "charities",
  "schools",
  "others",
] as const;

/**
 * What a partner gets and gives, before anyone signs in (the design
 * review C7, Nov 4, 2026).
 */
const SIDES = {
  gets: ["together", "guests"],
  gives: ["side", "team"],
} as const;

/**
 * The partners' front door (decisions.md: /partners, in place of
 * /about/partners): what partnering with the Society means, the way to
 * apply (/partners/apply) and in for a partner's team, then the partners
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
      <PageHeader lede={t("lede")} title={t("title")}>
        <ManageLinks diwan="/partnerships" partner />
      </PageHeader>
      {(["gets", "gives"] as const).map((side) => (
        <Section
          id={`what-a-partner-${side}`}
          key={side}
          title={t(`${side}.title`)}
        >
          <ul className="grid gap-8 sm:grid-cols-3">
            {SIDES[side].map((key) => (
              <li
                className="border-line grid content-start gap-2 border-t pt-4"
                key={key}
              >
                <h3 className="type-subheading">
                  {t(`${side}.${key}.title` as "gets.together.title")}
                </h3>
                <p className="type-body">
                  {t(`${side}.${key}.body` as "gets.together.body")}
                </p>
              </li>
            ))}
          </ul>
        </Section>
      ))}
      {list.length === 0 ? <p className="type-body">{t("empty")}</p> : null}
      {GROUP_ORDER.map((group) => {
        const kinds: readonly string[] = GROUPS[group];
        const members = list
          .filter((p) => kinds.includes(p.kind ?? "other"))
          .map((p) => ({ ...p, shown: localized(p, "name", locale) }))
          .sort((a, b) => a.shown.localeCompare(b.shown, locale));
        if (members.length === 0) {
          return null;
        }
        return (
          <Section id={group} key={group} title={t(`groups.${group}`)}>
            <ul className="grid gap-4 sm:grid-cols-2">
              {members.map((partner) => {
                const logo = mediaUrl(partner.logo_path);
                const name = partner.shown;
                return (
                  <li
                    className="border-line py-space-4 grid content-start gap-3 border-t"
                    key={partner.slug}
                  >
                    {logo ? (
                      // biome-ignore lint/performance/noImgElement: a partner logo from the media bucket
                      <img
                        alt=""
                        className="h-16 w-40 object-contain"
                        height={64}
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
      {/* AUIB's own offices aren't partners (decisions §2): they support
          the Society, listed here and nowhere else. */}
      <Support
        className="border-line pt-space-4 border-t"
        locale={locale}
        logos
      />
      <Section id="work-with-us" title={t("workTitle")}>
        <p className="type-body">{t("work")}</p>
        <p className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <Link
            className="text-accent font-medium hover:underline"
            href="/partners/apply"
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
      {/* Second Chapter (decisions.md): kept by the Director of
          Partnerships; its collection's record is a Notion page. */}
      <Section id="second-chapter" title={t("secondChapter.title")}>
        <p className="type-body max-w-[60ch]">{t("secondChapter.body")}</p>
      </Section>
    </div>
  );
};

export default PartnersPage;
