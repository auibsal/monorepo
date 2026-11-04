import type { Locale } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { NewsletterSignup } from "@/components/newsletter/signup";
import { pastIssues } from "@/components/sunday-paper-issue";
import { localizedMetadata } from "@/lib/metadata";

interface NewsletterProps {
  readonly params: Promise<{ locale: Locale }>;
}

export const generateMetadata = async ({
  params,
}: NewsletterProps): Promise<Metadata> => {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "web.newsletter" });
  return localizedMetadata(locale, "/sunday-paper", {
    description: t("lede"),
    title: t("title"),
  });
};

/**
 * The Sunday Paper's public list: the monthly email on the first Sunday,
 * and its past issues (design review C17), each at /sunday-paper/<yyyy-mm>.
 */
const NewsletterPage = async ({ params }: NewsletterProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web.newsletter" });
  const issues = await pastIssues(locale);
  return (
    <div className="mx-auto grid w-full max-w-3xl gap-8 px-4 py-16">
      <header className="grid gap-3">
        <h1 className="type-display">{t("title")}</h1>
        <p className="type-lede">{t("lede")}</p>
      </header>
      <section className="grid gap-4 border-line border-t p-6">
        <NewsletterSignup />
      </section>
      <p className="type-body text-text-secondary">{t("members")}</p>
      {issues.length > 0 ? (
        <section aria-labelledby="past-issues" className="grid gap-4">
          <h2 className="type-heading" id="past-issues">
            {t("archive.title")}
          </h2>
          <ul className="grid border-line border-b">
            {issues.map((issue) => (
              <li className="border-line border-t" key={issue.key}>
                <Link
                  className="block py-3 hover:text-accent"
                  href={`/sunday-paper/${issue.key}`}
                >
                  {formatLongDate(issue.sunday, locale)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
};

export default NewsletterPage;
