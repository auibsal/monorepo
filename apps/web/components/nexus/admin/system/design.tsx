import { Icon } from "@repo/design-system/components/sal/icon";
import { useTranslations } from "next-intl";
import { DiwanPage } from "@/components/nexus/page";

/**
 * The design system (SAL-BRD-01) in the Diwan (owner, Nov 4, 2026): the
 * Storybook built from packages/brand into public/_design, framed here.
 * It is read-only; its files have their downloads inside it.
 */
const SOURCE = "/_design/index.html";

export const DesignSystem = () => {
  const t = useTranslations("nexus.admin.design");
  const tc = useTranslations("common");
  return (
    <DiwanPage
      actions={
        <a
          className="inline-flex items-center gap-1.5 text-sm underline underline-offset-4"
          href={SOURCE}
          rel="noopener"
          target="_blank"
        >
          {t("open")}
          <Icon
            className="size-3.5"
            label={tc("externalLink")}
            name="arrow-up-right"
          />
        </a>
      }
      lede={t("lede")}
      title={t("title")}
    >
      <iframe
        className="h-[80vh] min-h-[36rem] w-full border border-line"
        src={SOURCE}
        title={t("title")}
      />
    </DiwanPage>
  );
};
