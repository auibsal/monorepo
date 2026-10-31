import type { Locale } from "@repo/internationalization";
import { journal, localized } from "@repo/sal-data";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { OwnWork } from "@/components/nexus/journal/pages";
import { PieceColumn } from "@/components/waraq/cards";
import { Nameplate } from "@/components/waraq/nameplate";
import { localizedMetadata } from "@/lib/metadata";
import { readPublished } from "@/lib/supabase";

interface AuthorProps {
  readonly params: Promise<{ locale: Locale; slug: string }>;
}

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
type Author = Awaited<ReturnType<typeof journal.authorPage>>;
type Kind = "member" | "partner" | "guest";

export const generateStaticParams = () => [];

const load = (slug: string): Promise<Author> =>
  SLUG.test(slug)
    ? readPublished(["journal"], (c) => journal.authorPage(c, slug), null)
    : Promise.resolve(null);

export const generateMetadata = async ({
  params,
}: AuthorProps): Promise<Metadata> => {
  const { locale, slug } = await params;
  const author = await load(slug);
  if (!author) {
    return {};
  }
  return {
    ...localizedMetadata(locale, `/qirtas/authors/${author.slug}`, {
      description: localized(author, "bio", locale),
      title: localized(author, "name", locale),
    }),
    // Public, unlike the members' pages around it.
    robots: { follow: true, index: true },
  };
};

/**
 * A person's author page, at their name (owner, Oct 31, 2026): who they are
 * to the Society (Member, Partner or Guest) and the roles they hold, their
 * published work, and, for them alone, their work in progress (what was
 * Your work in Membership). A pen name shows its published work only.
 */
const AuthorPage = async ({ params }: AuthorProps) => {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const author = await load(slug);
  if (!author) {
    notFound();
  }
  const t = await getTranslations({ locale, namespace: "web.journal" });
  const bio = localized(author, "bio", locale);
  const roles = (locale === "ar" ? author.roles_ar : author.roles_en) ?? [];
  const standing = [
    author.kind ? t(`authorKinds.${author.kind as Kind}`) : t("contributor"),
    ...roles,
  ].join(" · ");
  return (
    <main
      className="mx-auto grid w-full max-w-4xl flex-1 gap-10 px-4 pt-10 pb-20"
      id="main"
    >
      <Nameplate locale={locale} small />
      <header className="grid gap-3">
        <h1 className="type-display">{localized(author, "name", locale)}</h1>
        <p className="type-caption">{standing}</p>
        {bio ? <p className="type-lede">{bio}</p> : null}
      </header>
      <section aria-labelledby="work" className="grid gap-4">
        <h2 className="type-heading" id="work">
          {t("work")}
        </h2>
        {author.pieces.length > 0 ? (
          <PieceColumn locale={locale} pieces={author.pieces} />
        ) : (
          <p className="type-body text-text-secondary">{t("nothingYet")}</p>
        )}
      </section>
      <OwnWork slug={author.slug} />
    </main>
  );
};

export default AuthorPage;
