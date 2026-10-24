import type { Locale } from "@repo/internationalization";
import { journal, localized } from "@repo/sal-data";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PieceColumn } from "@/components/waraq/cards";
import { Nameplate } from "@/components/waraq/nameplate";
import { localizedMetadata } from "@/lib/metadata";
import { readPublished } from "@/lib/supabase";

interface AuthorProps {
  readonly params: Promise<{ locale: Locale; slug: string }>;
}

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
type Author = Awaited<ReturnType<typeof journal.authorPage>>;

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
  return localizedMetadata(locale, `/qirtas/authors/${author.slug}`, {
    description: localized(author, "bio", locale),
    title: localized(author, "name", locale),
  });
};

/** A contributor's published work, with their bio (or under a pen name). */
const AuthorPage = async ({ params }: AuthorProps) => {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const author = await load(slug);
  if (!author || author.pieces.length === 0) {
    notFound();
  }
  const t = await getTranslations({ locale, namespace: "web.journal" });
  const bio = localized(author, "bio", locale);
  return (
    <div className="mx-auto grid w-full max-w-4xl gap-10 px-4 py-10">
      <Nameplate locale={locale} small />
      <header className="grid gap-3">
        <h1 className="type-display">{localized(author, "name", locale)}</h1>
        <p className="type-caption">{t("contributor")}</p>
        {bio ? <p className="type-lede">{bio}</p> : null}
      </header>
      <section aria-labelledby="work" className="grid gap-4">
        <h2 className="type-heading" id="work">
          {t("work")}
        </h2>
        <PieceColumn locale={locale} pieces={author.pieces} />
      </section>
    </div>
  );
};

export default AuthorPage;
