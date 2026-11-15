import type { Locale } from "@repo/internationalization";
import { redirect } from "@repo/internationalization/navigation";
import { setRequestLocale } from "next-intl/server";
import { loadCalls } from "@/components/qirtas/calls";
import { journal } from "@/lib/data";
import { roughlyNow } from "@/lib/this-year";

interface OpenProps {
  readonly params: Promise<{ locale: Locale }>;
}

/**
 * "Send your work" (decisions.md, Qirtas): the open Edition's page, at its
 * call. Exactly one call is open at a time (each Edition's opens the day
 * the previous one closes); between calls, the next to open; with none,
 * Editions.
 */
const OpenEdition = async ({ params }: OpenProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const [calls, now] = await Promise.all([loadCalls(), roughlyNow()]);
  const call = journal.openCallAt(calls, new Date(now));
  redirect({
    href: call
      ? `/qirtas/editions/${call.edition_slug}#send`
      : "/qirtas/editions",
    locale,
  });
};

export default OpenEdition;
