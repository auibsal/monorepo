import { buttonVariants } from "@repo/brand/components/ui/button";
import { localizedPath } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader, RuledList, Section } from "@/components/section";
import { type LocaleParams, sectionMetadata } from "@/lib/page";

export const generateMetadata = sectionMetadata("web.join", "/join");

/*
 * Join (decisions.md, The site): one sentence and Sign up, three steps,
 * what membership gives (a line each), the Typewriter Tour's line and one
 * line to the other ways in.
 */

const STEPS = ["register", "commonRoom", "twoThings"] as const;
/** What membership gives (the design review C5, Nov 4, 2026). */
const GIVES = ["card", "record", "vote"] as const;

const JoinPage = async ({ params }: LocaleParams) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web.join" });
  const cta = (
    <div className="grid gap-3">
      <a
        className={buttonVariants({ className: "justify-self-start" })}
        href={localizedPath(locale, "/sign-up")}
      >
        {t("cta")}
      </a>
      <p className="type-caption text-text-secondary">{t("ctaHint")}</p>
    </div>
  );

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-20 px-4 py-16 sm:py-24">
      <PageHeader lede={t("lede")} title={t("title")}>
        {cta}
      </PageHeader>

      <RuledList
        columns={3}
        items={STEPS.map((key) => ({
          body: t(`steps.${key}.body`),
          key,
          title: t(`steps.${key}.title`),
        }))}
        level="h2"
        numbered
      />

      <Section id="what-you-get" title={t("gives.title")}>
        <RuledList
          items={GIVES.map((key) => ({
            body: t(`gives.${key}.body`),
            key,
            title: t(`gives.${key}.title`),
          }))}
        />
      </Section>

      <div className="grid gap-3">
        {/* The Typewriter Tour belongs to membership (decisions.md). */}
        <p className="type-body">
          <Link className="link" href="/join/typewriter-tour">
            {t("tourLine")}
          </Link>
        </p>
        <p className="type-body">
          <Link className="link" href="/join/other-ways">
            {t("otherWaysLine")}
          </Link>
        </p>
      </div>
    </div>
  );
};

export default JoinPage;
