"use client";

import type { Locale } from "@repo/internationalization";
import { formatLongDate } from "@repo/internationalization/format";
import { Link } from "@repo/internationalization/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { hasSessionCookie } from "@/lib/auth/session-cookie";
import { draftPath } from "@/lib/data/qirtas-paths";

interface Draft {
  readonly category: string;
  readonly id: string;
  readonly path: string | null;
  readonly title: string;
  readonly updated_at: string;
}

/**
 * A signed-in person's two most recent drafts (decisions.md, Qirtas: the
 * Editions page). Read after the first render, and only with a session, so
 * the page stays the same for everyone and visitors load nothing; all
 * they have sent lives in Your account → Work.
 */
export const RecentDrafts = () => {
  const t = useTranslations("web.journal.drafts");
  const tc = useTranslations("web.journal");
  const locale = useLocale() as Locale;
  const [drafts, setDrafts] = useState<readonly Draft[]>([]);
  useEffect(() => {
    if (!hasSessionCookie(document.cookie)) {
      return;
    }
    let live = true;
    import("@/lib/auth/client").then(async ({ createClient }) => {
      const { data } = await createClient()
        .schema("journal")
        .from("submission_drafts")
        .select("id, category, title, updated_at, path:content->>path")
        .order("updated_at", { ascending: false })
        .limit(2);
      if (live) {
        setDrafts((data ?? []) as Draft[]);
      }
    });
    return () => {
      live = false;
    };
  }, []);
  if (drafts.length === 0) {
    return null;
  }
  return (
    <section aria-labelledby="drafts" className="grid gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2 className="type-heading" id="drafts">
          {t("title")}
        </h2>
        <Link className="link text-sm" href="/account/work">
          {t("all")}
        </Link>
      </div>
      <ul className="border-line divide-line grid divide-y border-y">
        {drafts.map((d) => (
          <li className="grid gap-1 py-3" key={d.id}>
            <Link
              className="font-medium underline underline-offset-4"
              href={`${d.path ?? draftPath(d.category)}/${d.id}`}
              prefetch={false}
            >
              {d.title || t("untitled")}
            </Link>
            <span className="type-caption">
              {t("line", {
                date: formatLongDate(d.updated_at, locale),
                type: tc(`categories.${d.category as "poetry"}`),
              })}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
};
