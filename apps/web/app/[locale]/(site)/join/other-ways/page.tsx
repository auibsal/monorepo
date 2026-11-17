import { localizedPath } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader, Section } from "@/components/section";
import { type LocaleParams, sectionMetadata } from "@/lib/page";

export const generateMetadata = sectionMetadata(
  "web.join.otherWays",
  "/join/other-ways"
);

const TIERS = ["member", "voting", "associate", "honorary"] as const;

/**
 * The other ways in (decisions.md, Members): every class, then how
 * faculty, staff and alumni (one sign-up for everyone; the address says
 * which class), guests and partners join.
 */
const OtherWaysPage = async ({ params }: LocaleParams) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const tw = await getTranslations({ locale, namespace: "web.join.otherWays" });
  const t = await getTranslations({ locale, namespace: "web.join" });
  return (
    <div className="mx-auto grid w-full max-w-6xl gap-20 px-4 py-16 sm:py-24">
      <PageHeader lede={tw("lede")} title={tw("title")} />
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
                    className="py-4 pe-4 text-start text-xl font-normal"
                    scope="row"
                  >
                    {t(`tiers.${key}.name`)}
                  </th>
                  <td className="text-text-secondary py-4 pe-4">
                    {t(`tiers.${key}.if`)}
                  </td>
                  <td className="text-text-secondary py-4">
                    {t(`tiers.${key}.can`)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Not at AUIB (decisions.md): a guest's membership, by
            invitation, or a partner's, by applying. */}
        <p className="type-body text-text-secondary max-w-[60ch]">
          {t("others")}{" "}
          <Link className="link" href="/partners">
            {t("othersLink")}
          </Link>
        </p>
      </Section>

      <Section id="associate" title={t("associateRequest.title")}>
        <p className="type-body max-w-[60ch]">{t("associateRequest.lede")}</p>
        <p>
          <a className="link" href={localizedPath(locale, "/sign-up")}>
            {t("cta")}
          </a>
        </p>
      </Section>
    </div>
  );
};

export default OtherWaysPage;
