import type { Locale } from "@repo/internationalization";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { Nameplate } from "@/components/qirtas/nameplate";

/**
 * The paper is printed on paper: every page of it on `paper`, under one
 * nameplate that stays the same from page to page, ending with the
 * colophon (decisions.md, Qirtas: on Qirtas's pages, not the site footer).
 */
const PaperLayout = async ({
  children,
  params,
}: {
  readonly children: ReactNode;
  readonly params: Promise<{ locale: string }>;
}) => {
  const { locale } = await params;
  const t = await getTranslations({
    locale: locale as Locale,
    namespace: "web.journal",
  });
  return (
    <div className="bg-surface-reading h-full">
      <div className="mx-auto w-full max-w-6xl px-4 pt-10 print:hidden">
        <Nameplate locale={locale as Locale} />
      </div>
      {children}
      <p className="type-caption text-text-secondary mx-auto w-full max-w-6xl px-4 pb-10">
        {t("colophon")}
      </p>
    </div>
  );
};

export default PaperLayout;
