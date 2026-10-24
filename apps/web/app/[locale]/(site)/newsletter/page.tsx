import type { Locale } from "@repo/internationalization";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { NewsletterSignup } from "@/components/newsletter/signup";
import { localizedMetadata } from "@/lib/metadata";

interface NewsletterProps {
  readonly params: Promise<{ locale: Locale }>;
}

export const generateMetadata = async ({
  params,
}: NewsletterProps): Promise<Metadata> => {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "web.newsletter" });
  return localizedMetadata(locale, "/newsletter", {
    description: t("lede"),
    title: t("title"),
  });
};

/** The Month in Waraq: the public monthly email. */
const NewsletterPage = async ({ params }: NewsletterProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web.newsletter" });
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
    </div>
  );
};

export default NewsletterPage;
