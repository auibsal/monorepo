import type { Locale } from "@repo/internationalization";
import type { ReactNode } from "react";
import { Nameplate } from "@/components/qirtas/nameplate";

/**
 * The paper is printed on paper: every page of it on `paper`, under one
 * nameplate that stays the same from page to page (decisions.md).
 */
const PaperLayout = async ({
  children,
  params,
}: {
  readonly children: ReactNode;
  readonly params: Promise<{ locale: string }>;
}) => {
  const { locale } = await params;
  return (
    <div className="h-full bg-surface-reading">
      <div className="mx-auto w-full max-w-6xl px-4 pt-10 print:hidden">
        <Nameplate locale={locale as Locale} />
      </div>
      {children}
    </div>
  );
};

export default PaperLayout;
