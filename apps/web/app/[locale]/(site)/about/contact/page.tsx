import { project } from "@repo/config";
import { Link } from "@repo/internationalization/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { RemovalForm } from "@/components/removal-form";
import { PageHeader, Section } from "@/components/section";
import { type LocaleParams, sectionMetadata } from "@/lib/page";

export const generateMetadata = sectionMetadata(
  "web.contact",
  "/about/contact"
);

const { mailboxes } = project;

/**
 * Each topic and where it goes (decisions.md, The site: Contact; Channels
 * and email: role addresses and answer times). A topic answered by a form
 * links to it instead of an address.
 */
const TOPICS = [
  { email: mailboxes.hello, key: "question" },
  { email: mailboxes.press, key: "press" },
  { email: mailboxes.letters, key: "letter" },
  { email: mailboxes.nextstop, key: "nextStop" },
  { email: mailboxes.accessibility, key: "accessibility" },
  { email: mailboxes.privacy, key: "privacy" },
  { href: "#photo", key: "removal" },
  { href: "/about/contact/concern", key: "concern" },
  { href: "/partners/apply", key: "partnership" },
] as const;

/**
 * Contact: one page that routes by topic to the right role address, with
 * the answer time; the photo and video removal form below.
 */
const ContactPage = async ({ params }: LocaleParams) => {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "web.contact" });

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-20 px-4 py-16 sm:py-24">
      <PageHeader lede={t("lede")} title={t("title")} />
      <ul className="border-line grid border-b">
        {TOPICS.map((topic) => (
          <li
            className="border-line grid gap-1 border-t py-4 sm:grid-cols-[16rem_minmax(0,1fr)_12rem] sm:items-baseline sm:gap-6"
            key={topic.key}
          >
            <p className="type-body font-medium">
              {t(`topics.${topic.key}.title`)}
            </p>
            <p className="type-body">
              {"email" in topic ? (
                <a
                  className="link break-all"
                  dir="ltr"
                  href={`mailto:${topic.email}`}
                >
                  {topic.email}
                </a>
              ) : (
                <Link className="link" href={topic.href}>
                  {t(`topics.${topic.key}.action`)}
                </Link>
              )}
            </p>
            <p className="type-caption">{t(`topics.${topic.key}.time`)}</p>
          </li>
        ))}
      </ul>
      <Section id="photo" title={t("photoTitle")}>
        <p className="type-body">{t("photo")}</p>
        {/* The one removal form (MEM-02, decisions §13): on Contact. */}
        <RemovalForm />
      </Section>
    </div>
  );
};

export default ContactPage;
