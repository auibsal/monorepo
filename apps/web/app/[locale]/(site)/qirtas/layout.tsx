import type { Locale } from "@repo/internationalization";
import type { ReactNode } from "react";
import { Paper } from "@/components/qirtas/paper";

/** Qirtas's pages: one paper, one nameplate (decisions.md, Qirtas). */
const PaperLayout = async ({
  children,
  params,
}: {
  readonly children: ReactNode;
  readonly params: Promise<{ locale: string }>;
}) => {
  const { locale } = await params;
  return <Paper locale={locale as Locale}>{children}</Paper>;
};

export default PaperLayout;
