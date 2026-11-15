import type { Locale } from "@repo/internationalization";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { Nameplate } from "./nameplate";

/**
 * The paper is printed on paper: every page of Qirtas, the public pages
 * and the ones that take submissions alike, on `paper`, under one
 * nameplate that stays the same from page to page, ending with the
 * colophon (decisions.md, Qirtas).
 */
export const Paper = async ({
  children,
  locale,
}: {
  readonly children: ReactNode;
  readonly locale: Locale;
}) => {
  const t = await getTranslations({ locale, namespace: "web.journal" });
  return (
    <div className="bg-surface-reading h-full">
      <div className="mx-auto w-full max-w-6xl px-4 pt-10 print:hidden">
        <Nameplate locale={locale} />
      </div>
      {children}
      <p className="type-caption text-text-secondary mx-auto w-full max-w-6xl px-4 pb-10">
        {t("colophon")}
      </p>
    </div>
  );
};
