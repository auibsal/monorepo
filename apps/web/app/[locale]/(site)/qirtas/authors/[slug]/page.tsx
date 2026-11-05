import type { Locale } from "@repo/internationalization";
import { Link } from "@repo/internationalization/navigation";
import { journal, localized } from "@repo/sal-data";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { publishedRounds } from "@/components/qirtas/awards";
import { PieceColumn } from "@/components/qirtas/cards";
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
  return localizedMetadata(locale, `/qirtas/authors/${author.slug}`, {
    description: localized(author, "bio", locale),
    title: localized(author, "name", locale),
  });
};

/**
 * The Awards their published work was shortlisted for or won, as
 * `journal.award_results()` shows each round (from its days only).
 */
const recognition = async (slugs: ReadonlySet<string>) => {
  if (slugs.size === 0) {
    return [];
  }
  const rounds = await publishedRounds();
  const [awards, ...results] = await Promise.all([
    readPublished(["journal"], (c) => journal.awards(c), []),
    ...rounds.map((round) =>
      readPublished(["journal"], (c) => journal.awardResults(c, round.slug), [])
    ),
  ]);
  return rounds.flatMap((round, index) =>
    (results[index] ?? [])
      .filter((entry) => slugs.has(entry.piece_slug))
      .map((entry) => ({
        award: awards.find((a) => a.key === entry.award_key) ?? null,
        entry,
        round,
      }))
  );
};

/**
 * A person's author page, at their name (owner, Oct 31, 2026): who they are
 * to the Society (Member, Partner or Guest) and the roles they hold, their
 * published work, the Editions it appeared in and the Awards it was
 * shortlisted for or won (the design review C18, Nov 4, 2026). Work in
 * progress stays private, as drafts on /qirtas/write. A pen name shows
 * its published work only.
 */
const AuthorPage = async ({ params }: AuthorProps) => {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const author = await load(slug);
  if (!author) {
    notFound();
  }
  const t = await getTranslations({ locale, namespace: "web.journal" });
  const ta = await getTranslations({ locale, namespace: "web.awards" });
  const { editions } = author;
  const honors = await recognition(
    new Set(author.pieces.map((piece) => piece.slug))
  );
  const bio = localized(author, "bio", locale);
  const roles = (locale === "ar" ? author.roles_ar : author.roles_en) ?? [];
  const standing = [
    author.kind ? t(`authorKinds.${author.kind as Kind}`) : t("contributor"),
    ...roles,
  ].join(" · ");
  return (
    <div className="mx-auto grid w-full max-w-4xl gap-10 px-4 py-10">
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
      {editions.length > 0 ? (
        <section aria-labelledby="editions" className="grid gap-4">
          <h2 className="type-heading" id="editions">
            {t("authorEditions")}
          </h2>
          <ul className="grid border-line border-b">
            {editions.map((issue) => (
              <li className="border-line border-t py-3" key={issue.slug}>
                <Link className="link" href={`/qirtas/editions/${issue.slug}`}>
                  {localized(issue, "title", locale)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {honors.length > 0 ? (
        <section aria-labelledby="awards" className="grid gap-4">
          <h2 className="type-heading" id="awards">
            {ta("title")}
          </h2>
          <ul className="grid border-line border-b">
            {honors.map(({ award, entry, round }) => (
              <li
                className="grid gap-0.5 border-line border-t py-3"
                key={`${round.slug}-${entry.award_key}-${entry.piece_slug}`}
              >
                <span className="type-body">
                  {t(entry.won ? "authorWon" : "authorShortlisted", {
                    award: award ? localized(award, "name", locale) : "",
                    title: localized(entry, "title", locale),
                  })}
                </span>
                <Link
                  className="link type-caption"
                  href={`/qirtas/awards/${round.slug}`}
                >
                  {localized(round, "title", locale)}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
};

export default AuthorPage;
