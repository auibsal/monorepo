import { buttonVariants } from "@repo/design-system/components/ui/button";
import { localizedPath } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader, RuledList, Section } from "@/components/section";
import { type LocaleParams, sectionMetadata } from "@/lib/page";

export const generateMetadata = sectionMetadata("web.join", "/join");

const STEPS = ["register", "commonRoom", "twoThings"] as const;
const TIERS = ["member", "voting", "fellow", "honorary", "alumni"] as const;

const JoinPage = async ({ params }: LocaleParams) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web.join" });
  const cta = (
    <div className="grid gap-3">
      <a
        className={buttonVariants({ className: "justify-self-start" })}
        href={localizedPath(locale, "/sign-up")}
      >
        {t("cta")}
      </a>
      <p className="type-caption text-text-secondary">{t("ctaHint")}</p>
    </div>
  );

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-20 px-4 py-16 sm:py-24">
      <PageHeader lede={t("lede")} title={t("title")}>
        {cta}
      </PageHeader>

      <RuledList
        columns={3}
        items={STEPS.map((key) => ({
          body: t(`steps.${key}.body`),
          key,
          title: t(`steps.${key}.title`),
        }))}
        level="h2"
        numbered
      />

      <Section id="tiers" title={t("tiersTitle")}>
        <div className="overflow-x-auto">
          <table className="w-full text-start">
            <thead>
              <tr className="border-text border-b">
                <th className="type-label py-2 pe-4 text-start" scope="col">
                  {t("tiersYou")}
                </th>
                <th className="type-label py-2 pe-4 text-start" scope="col">
                  {t("tiersIf")}
                </th>
                <th className="type-label py-2 text-start" scope="col">
                  {t("tiersCan")}
                </th>
              </tr>
            </thead>
            <tbody>
              {TIERS.map((key) => (
                <tr className="border-line border-b align-top" key={key}>
                  <th
                    className="py-4 pe-4 text-start font-normal text-xl"
                    scope="row"
                  >
                    {t(`tiers.${key}.name`)}
                  </th>
                  <td className="py-4 pe-4 text-text-secondary">
                    {t(`tiers.${key}.if`)}
                  </td>
                  <td className="py-4 text-text-secondary">
                    {t(`tiers.${key}.can`)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Not at AUIB (owner, Oct 31, 2026): a guest's membership, by
            invitation, or a partner's, by applying. */}
        <p className="type-body max-w-[60ch] text-text-secondary">
          {t("others")}{" "}
          <Link className="link" href="/partners">
            {t("othersLink")}
          </Link>
        </p>
      </Section>

      <Section id="first-month" title={t("firstMonthTitle")}>
        <p className="type-lede max-w-[60ch]">{t("firstMonth")}</p>
      </Section>
      {cta}
    </div>
  );
};

export default JoinPage;
