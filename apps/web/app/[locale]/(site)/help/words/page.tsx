import type { Locale } from "@repo/internationalization";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/section";
import { localizedMetadata } from "@/lib/metadata";

interface PageProps {
  readonly params: Promise<{ locale: Locale }>;
}

interface Term {
  readonly meaning: string;
  readonly term: string;
}

export const generateMetadata = async ({
  params,
}: PageProps): Promise<Metadata> => {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "web.help" });
  return localizedMetadata(locale, "/help/words", {
    description: t("wordsLede"),
    title: t("words"),
  });
};

/** "Words we use" (decisions.md, The site): the Society's own terms. */
const WordsPage = async ({ params }: PageProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web.help" });
  const terms = t.raw("terms") as Term[];
  return (
    <div className="mx-auto grid w-full max-w-4xl gap-12 px-4 py-16">
      <PageHeader lede={t("wordsLede")} title={t("words")} />
      <dl className="border-line grid border-b">
        {terms.map((item) => (
          <div
            className="border-line grid gap-1 border-t py-4 sm:grid-cols-[14rem_minmax(0,1fr)] sm:gap-6"
            key={item.term}
          >
            <dt className="type-body font-medium">{item.term}</dt>
            <dd className="type-body text-text-secondary">{item.meaning}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
};

export default WordsPage;
