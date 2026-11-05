import type { Locale } from "@repo/internationalization";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProductionsList } from "@/components/productions";
import { localizedMetadata } from "@/lib/metadata";

interface ListProps {
  readonly params: Promise<{ locale: Locale }>;
}

export const generateMetadata = async ({
  params,
}: ListProps): Promise<Metadata> => {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "web.productions" });
  return localizedMetadata(locale, "/company/productions", {
    description: t("asList"),
    title: t("title"),
  });
};

/** The Company's productions as a plain list (the playbill shelf's list). */
const ProductionsListPage = async ({ params }: ListProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ProductionsList locale={locale} />;
};

export default ProductionsListPage;
