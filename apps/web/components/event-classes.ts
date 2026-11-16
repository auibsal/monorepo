import type { Locale } from "@repo/internationalization";
import { getTranslations } from "next-intl/server";
import { events } from "@/lib/data";

/**
 * Who can come, in words, in the page's language (decisions.md, Events:
 * Access): "Everyone", "Members only", or the classes ticked.
 */
export const classesText = async (
  classes: readonly string[],
  locale: Locale,
  mode: "list" | "only"
) => {
  const t = await getTranslations({
    locale,
    namespace: "web.events.goodToKnow.who",
  });
  return events.classesLabel(classes, {
    everyone: t("everyone"),
    locale: locale === "ar" ? "ar" : "en",
    names: {
      associate: t("classes.associate"),
      guest: t("classes.guest"),
      honorary: t("classes.honorary"),
      member: t("classes.member"),
    },
    only: mode === "only" ? (name) => t("only", { classes: name }) : undefined,
  });
};
