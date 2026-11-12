"use client";

import { Input } from "@repo/brand/components/ui/input";
import { Label } from "@repo/brand/components/ui/label";
import { Link } from "@repo/internationalization/navigation";
import { useDeferredValue, useState } from "react";

export interface LibraryItem {
  readonly code: string;
  readonly href: string;
  readonly keeper: string | null;
  readonly reader: string;
  readonly status: string;
  readonly summary: string;
  readonly title: string;
}

interface LibraryListProps {
  readonly empty: string;
  readonly findLabel: string;
  readonly groups: readonly { key: string; title: string }[];
  readonly items: readonly LibraryItem[];
  readonly noMatch: string;
}

/**
 * The Library's documents grouped by who they are for (decisions.md),
 * each with its code, keeper, status and a two-line summary, and a find
 * line over titles, codes and summaries. The list is rendered on the
 * server first; finding only hides what doesn't match.
 */
export const LibraryList = ({
  empty,
  findLabel,
  groups,
  items,
  noMatch,
}: LibraryListProps) => {
  const [query, setQuery] = useState("");
  const wanted = useDeferredValue(query).trim().toLowerCase();
  const shown = wanted
    ? items.filter((item) =>
        [item.code, item.title, item.summary]
          .join(" ")
          .toLowerCase()
          .includes(wanted)
      )
    : items;

  if (items.length === 0) {
    return <p className="type-body">{empty}</p>;
  }
  return (
    <div className="grid gap-12">
      <div className="grid max-w-md gap-2">
        <Label htmlFor="library-find">{findLabel}</Label>
        <Input
          id="library-find"
          onChange={(event) => setQuery(event.target.value)}
          type="search"
          value={query}
        />
      </div>
      {shown.length === 0 ? (
        <p className="type-body" role="status">
          {noMatch}
        </p>
      ) : null}
      {groups.map((group) => {
        const docs = shown.filter((item) => item.reader === group.key);
        if (docs.length === 0) {
          return null;
        }
        return (
          <section
            aria-labelledby={`for-${group.key}`}
            className="grid gap-4"
            key={group.key}
          >
            <h2 className="type-heading" id={`for-${group.key}`}>
              {group.title}
            </h2>
            <ul className="grid gap-x-10 md:grid-cols-2">
              {docs.map((doc) => (
                <li
                  className="border-line py-space-4 grid content-start gap-2 border-t"
                  key={doc.code}
                >
                  <h3 className="type-subheading">
                    <Link className="hover:text-accent" href={doc.href}>
                      {doc.title}
                    </Link>
                  </h3>
                  <p className="type-caption">
                    {[doc.code, doc.keeper, doc.status]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {doc.summary ? (
                    <p className="type-body text-text-secondary line-clamp-2">
                      {doc.summary}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
};
