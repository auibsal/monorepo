"use client";

import { hasSessionCookie } from "@repo/auth/session-cookie";
import { type Locale, localizedPath } from "@repo/internationalization";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

/**
 * The Supabase client, loaded only when a signed-in reader needs it: the
 * program pages are prefetched from every page's footer, and a static
 * import would send the client to everyone (the performance budget).
 */
const supabase = async () =>
  (await import("@/lib/nexus/supabase")).getSupabase();

interface Book {
  readonly author: string;
  readonly id: string;
  readonly title: string;
}

/**
 * Voting on Book Circle's ballot (the design review A33, decision D12):
 * the page is the same for everyone and cached; after the first render a
 * signed-in reader sees their vote and may give or change it while the
 * ballot is open. The database decides who votes (members only) and
 * keeps each vote to its voter.
 */
export const BookVote = ({
  ballotId,
  books,
  closesAt,
  path,
}: {
  readonly ballotId: string;
  readonly books: readonly Book[];
  readonly closesAt: string;
  readonly path: string;
}) => {
  const t = useTranslations("web.programs.page.vote");
  const locale = useLocale() as Locale;
  const [signedIn, setSignedIn] = useState(false);
  const [mine, setMine] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<"members" | "failed" | null>(null);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    setClosed(Date.parse(closesAt) <= Date.now());
    if (!hasSessionCookie(document.cookie)) {
      return;
    }
    setSignedIn(true);
    let live = true;
    supabase()
      .then((client) =>
        client
          .schema("programmes")
          .from("book_votes")
          .select("choice_id")
          .eq("ballot_id", ballotId)
          .maybeSingle()
      )
      .then(({ data }) => {
        if (live) {
          setMine(data?.choice_id ?? null);
        }
      });
    return () => {
      live = false;
    };
  }, [ballotId, closesAt]);

  const vote = async (choiceId: string) => {
    setBusy(true);
    setProblem(null);
    const table = (await supabase()).schema("programmes").from("book_votes");
    const { error } = mine
      ? await table.update({ choice_id: choiceId }).eq("ballot_id", ballotId)
      : await table.insert({ ballot_id: ballotId, choice_id: choiceId });
    setBusy(false);
    if (error) {
      setProblem(error.code === "42501" ? "members" : "failed");
      return;
    }
    setMine(choiceId);
  };

  return (
    <div className="grid gap-4">
      <ol className="grid gap-x-10 sm:grid-cols-3">
        {books.map((book) => (
          <li
            className="grid content-start gap-2 border-line border-t py-space-4"
            key={book.id}
          >
            <span className="type-heading">{book.title}</span>
            {book.author ? (
              <span className="type-caption text-text-secondary">
                {book.author}
              </span>
            ) : null}
            {signedIn && !closed && mine === book.id ? (
              <span className="type-caption text-accent">{t("yours")}</span>
            ) : null}
            {signedIn && !closed && mine !== book.id ? (
              <button
                className="link type-caption justify-self-start"
                disabled={busy}
                onClick={() => vote(book.id)}
                type="button"
              >
                {mine ? t("change") : t("cast")}
              </button>
            ) : null}
          </li>
        ))}
      </ol>
      {closed ? <p className="type-body">{t("closed")}</p> : null}
      {signedIn || closed ? null : (
        <p>
          <a
            className="link"
            href={`${localizedPath(locale, "/sign-in")}?next=${encodeURIComponent(path)}`}
          >
            {t("signIn")}
          </a>
        </p>
      )}
      {problem ? (
        <p className="type-body text-accent" role="alert">
          {t(problem === "members" ? "membersOnly" : "failed")}
        </p>
      ) : null}
    </div>
  );
};
