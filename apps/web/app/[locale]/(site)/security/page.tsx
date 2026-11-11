import { project } from "@repo/config";
import type { Locale } from "@repo/internationalization";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageHeader } from "@/components/section";
import { localizedMetadata } from "@/lib/metadata";

interface PageProps {
  readonly params: Promise<{ locale: Locale }>;
}

/** The disclosure policy's sections, in order. */
const SECTIONS = ["scope", "report", "ask", "promise", "safe", "out"] as const;

export const generateMetadata = async ({
  params,
}: PageProps): Promise<Metadata> => {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "web.policies" });
  return localizedMetadata(locale, "/security", {
    description: t("securityLede"),
    title: t("security"),
  });
};

/**
 * /security (decisions.md, The site): how to report a security problem
 * with auibsal.org, the policy security.txt points to. Its effective date
 * is at the top.
 */
const SecurityPage = async ({ params }: PageProps) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web.policies" });
  const address = project.mailboxes.security;
  return (
    <article className="mx-auto grid w-full max-w-4xl gap-10 px-4 py-16">
      <PageHeader lede={t("securityLede")} title={t("security")}>
        <p className="type-caption">{t("securityEffective")}</p>
      </PageHeader>
      <div className="grid max-w-3xl gap-8">
        {SECTIONS.map((key) => (
          <section className="grid gap-3" key={key}>
            <h2 className="type-heading">
              {t(`securitySections.${key}.title`)}
            </h2>
            <p className="type-body">
              {t(`securitySections.${key}.body`, { address })}
            </p>
          </section>
        ))}
      </div>
    </article>
  );
};

export default SecurityPage;
