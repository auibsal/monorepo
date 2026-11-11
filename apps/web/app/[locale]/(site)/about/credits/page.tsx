import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader, Section } from "@/components/section";
import credits from "@/lib/credits.json";
import { type LocaleParams, sectionMetadata } from "@/lib/page";

export const generateMetadata = sectionMetadata(
  "web.credits",
  "/about/credits"
);

interface Credit {
  readonly license: string;
  readonly name: string;
  readonly url: string | null;
}

/** One credit per row: the name (linked where it has a home) and its license. */
const CreditList = ({ items }: { items: readonly Credit[] }) => (
  <ul className="border-line grid border-b" dir="ltr" lang="en">
    {items.map((item) => (
      <li
        className="border-line flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 border-t py-2"
        key={item.name}
      >
        {item.url ? (
          <a
            className="link type-body"
            href={item.url}
            rel="noopener"
            target="_blank"
          >
            {item.name}
          </a>
        ) : (
          <span className="type-body">{item.name}</span>
        )}
        <span className="type-caption">{item.license}</span>
      </li>
    ))}
  </ul>
);

/**
 * /about/credits (decisions.md, The site): the software, fonts and icons
 * the site uses, with their licenses, generated from the code
 * (`bun run credits`; CI checks it is current). The repository itself
 * stays private, all rights reserved to the Society.
 */
const CreditsPage = async ({ params }: LocaleParams) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web.credits" });
  return (
    <div className="mx-auto grid w-full max-w-4xl gap-16 px-4 py-16 sm:py-24">
      <PageHeader lede={t("lede")} title={t("title")} />
      <Section id="fonts" title={t("fonts")}>
        <CreditList items={credits.fonts} />
      </Section>
      <Section id="icons" title={t("icons")}>
        <CreditList items={credits.icons} />
      </Section>
      <Section id="software" title={t("software")}>
        <CreditList items={credits.software} />
      </Section>
      <p className="type-body max-w-[60ch]">{t("rights")}</p>
    </div>
  );
};

export default CreditsPage;
