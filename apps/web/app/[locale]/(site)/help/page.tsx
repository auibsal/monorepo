import type { Locale } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/section";
import { localizedMetadata } from "@/lib/metadata";

interface PageProps {
  readonly params: Promise<{ locale: Locale }>;
}

interface Question {
  readonly a: string;
  readonly q: string;
}

export const generateMetadata = async ({
  params,
}: PageProps): Promise<Metadata> => {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "web.help" });
  return localizedMetadata(locale, "/help", {
    description: t("lede"),
    title: t("title"),
  });
};

/**
 * Help (decisions.md, The site): the twenty most common questions, then
 * "Words we use" and "Report a problem".
 */
const HelpPage = async ({ params }: PageProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web.help" });
  const items = t.raw("items") as Question[];
  return (
    <div className="mx-auto grid w-full max-w-4xl gap-12 px-4 py-16">
      <PageHeader lede={t("lede")} title={t("title")}>
        <ul className="flex flex-wrap gap-x-6 gap-y-2">
          <li>
            <Link className="link" href="/help/words">
              {t("words")}
            </Link>
          </li>
          <li>
            <Link className="link" href="/help/report">
              {t("report")}
            </Link>
          </li>
          <li>
            <Link className="link" href="/about/contact">
              {t("contact")}
            </Link>
          </li>
        </ul>
      </PageHeader>
      <section aria-labelledby="questions" className="grid gap-4">
        <h2 className="type-heading" id="questions">
          {t("questions")}
        </h2>
        <ul className="border-line grid border-b">
          {items.map((item) => (
            <li className="border-line border-t" key={item.q}>
              <details className="group py-4">
                <summary className="type-body cursor-pointer font-medium">
                  {item.q}
                </summary>
                <p className="type-body text-text-secondary mt-3 max-w-[65ch]">
                  {item.a}
                </p>
              </details>
            </li>
          ))}
        </ul>
      </section>
      <p className="type-body">
        {t("reportLine")}{" "}
        <Link className="link" href="/help/report">
          {t("report")}
        </Link>
      </p>
    </div>
  );
};

export default HelpPage;
