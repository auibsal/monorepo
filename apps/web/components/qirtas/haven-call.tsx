import type { Locale } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import { getTranslations } from "next-intl/server";

/**
 * Haven's call (decisions.md, Qirtas): Qirtas's pilot Edition, on dreams and
 * memories, taking Letters and Gallery through Write for Qirtas. No
 * deadline is given until the Editor-in-Chief sets the dates.
 */
export const HavenCall = async ({ locale }: { readonly locale: Locale }) => {
  const t = await getTranslations({ locale, namespace: "web.journal.haven" });
  return (
    <section
      aria-labelledby="haven-call"
      className="border-line grid gap-3 border-y py-8"
    >
      <h2 className="type-display" id="haven-call">
        {t("title")}
      </h2>
      <p className="type-body text-text-secondary">{t("dek")}</p>
      <p className="reading max-w-[60ch]">{t("call")}</p>
      <Link
        className="link justify-self-start font-medium"
        href="/qirtas/submit"
        // Write for Qirtas carries the editor: fetch it on the click, not
        // with the front page (the performance budget).
        prefetch={false}
      >
        {t("submit")}
      </Link>
    </section>
  );
};
