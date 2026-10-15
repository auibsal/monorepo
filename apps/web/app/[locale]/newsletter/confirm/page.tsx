import type { Locale } from "@repo/internationalization";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { TokenAction } from "@/components/newsletter/token-action";

interface PageProps {
  readonly params: Promise<{ locale: Locale }>;
}

export const generateMetadata = async ({
  params,
}: PageProps): Promise<Metadata> => {
  const { locale } = await params;
  const t = await getTranslations({
    locale,
    namespace: "web.newsletter.confirm",
  });
  // An emailed link with a token: never indexed.
  return { robots: { follow: false, index: false }, title: t("title") };
};

const Page = async ({ params }: PageProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({
    locale,
    namespace: "web.newsletter.confirm",
  });
  return (
    <div className="mx-auto grid w-full max-w-3xl gap-6 px-4 py-16">
      <h1 className="type-display">{t("title")}</h1>
      <p className="type-lede">{t("lede")}</p>
      <Suspense fallback={null}>
        <TokenAction action="confirm" />
      </Suspense>
    </div>
  );
};

export default Page;
