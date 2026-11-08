"use client";

import { cn } from "@repo/brand/lib/utils";
import { diwanPath, localizedPath } from "@repo/internationalization/config";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { DiwanPage } from "@/components/diwan/page";
import { SectionSpinner } from "@/components/diwan/states";
import { Link, useRouter } from "@/lib/diwan/navigation";

/**
 * The design system (SAL-MED-02) as the Diwan's own page: the Diwan's
 * header and menu, its sections and entries listed here, and each entry
 * drawn in place, sized to its content, with no Storybook around it. The
 * stories come from packages/brand's build (`bun run build:site`), served
 * to staff at /diwan/media/design/kit by the API route.
 */
const KIT = "/media/design/kit";
const GROUPS = [
  "Guide",
  "Foundations",
  "Logos",
  "Components",
  "Emails",
  "Social",
  "Print",
] as const;
type Group = (typeof GROUPS)[number];
const STORY_LINK = /[?&]path=\/(?:docs|story)\/([\w-]+)/u;

interface Entry {
  id: string;
  name: string;
  title: string;
  type: "docs" | "story";
}

const isGroup = (value: string): value is Group =>
  (GROUPS as readonly string[]).includes(value);

const groupOf = (entry: Entry) => entry.title.split("/")[0] ?? "";

/** The entry's part within its section ("Sign-in" in "Emails/Sign-in"). */
const partOf = (entry: Entry) => entry.title.split("/").slice(1).join(" / ");

const labelOf = (entry: Entry) =>
  entry.type === "docs" ? partOf(entry) || entry.name : entry.name;

const useEntries = (kit: string) =>
  useQuery({
    queryFn: async () => {
      const response = await fetch(`${kit}/index.json`, {
        credentials: "same-origin",
      });
      if (!response.ok) {
        return [];
      }
      const index = (await response.json()) as {
        entries: Record<string, Entry>;
      };
      return Object.values(index.entries).filter((entry) =>
        isGroup(groupOf(entry))
      );
    },
    queryKey: ["admin", "design", "entries"],
    staleTime: Number.POSITIVE_INFINITY,
  });

/** The site's theme as the stories name it. */
const themeNow = () =>
  document.documentElement.dataset.theme === "dark" ? "ink" : "light";

/**
 * One entry, drawn by the design system's own renderer at this page's
 * width, as tall as it is, in the page's theme and direction.
 */
const Canvas = ({ entry, kit }: { entry: Entry; kit: string }) => {
  const frame = useRef<HTMLIFrameElement>(null);
  const router = useRouter();
  const locale = useLocale();
  const [height, setHeight] = useState(480);
  const [theme] = useState(themeNow);
  const direction = locale === "ar" ? "rtl" : "ltr";
  const src = `${kit}/iframe.html?id=${entry.id}&viewMode=${entry.type}&globals=theme:${theme};direction:${direction}`;

  useEffect(() => {
    const node = frame.current;
    if (!node) {
      return;
    }
    let sizes: ResizeObserver | null = null;
    const themes = new MutationObserver(() => {
      node.contentDocument?.documentElement.setAttribute(
        "data-theme",
        themeNow() === "ink" ? "dark" : "light"
      );
    });
    themes.observe(document.documentElement, {
      attributeFilter: ["data-theme"],
    });
    // A link from one entry to another stays on this page.
    const follow = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.("a");
      const id = link?.getAttribute("href")?.match(STORY_LINK)?.[1];
      if (id) {
        event.preventDefault();
        router.push(`/media/design/${id}`);
      }
    };
    const loaded = () => {
      const doc = node.contentDocument;
      if (!doc) {
        return;
      }
      doc.addEventListener("click", follow);
      sizes = new ResizeObserver(() =>
        setHeight(Math.max(240, doc.documentElement.scrollHeight))
      );
      sizes.observe(doc.body);
    };
    node.addEventListener("load", loaded);
    return () => {
      node.removeEventListener("load", loaded);
      node.contentDocument?.removeEventListener("click", follow);
      sizes?.disconnect();
      themes.disconnect();
    };
  }, [router]);

  return (
    <iframe
      className="block w-full border-0"
      ref={frame}
      // Served from this origin to staff: it runs the stories' scripts and
      // lets the brand kit's files download.
      sandbox="allow-downloads allow-same-origin allow-scripts"
      src={src}
      style={{ height }}
      title={labelOf(entry)}
    />
  );
};

export const DesignSystem = ({ entryId }: { entryId: string | null }) => {
  const t = useTranslations("diwan.admin.design");
  const locale = useLocale();
  const kit = localizedPath(locale, diwanPath(KIT));
  const entries = useEntries(kit);
  const all = entries.data ?? [];
  const entry = all.find((e) => e.id === entryId) ?? all[0];
  const group = entry ? groupOf(entry) : "Guide";
  const inGroup = all.filter((e) => groupOf(e) === group);
  // Parts of one entry each (the Guide's chapters) make one row of links;
  // parts with several entries (an email's kinds) are headed by their name.
  const single = inGroup.every(
    (e) => inGroup.filter((o) => partOf(o) === partOf(e)).length === 1
  );
  const parts = single ? [""] : [...new Set(inGroup.map(partOf))];
  const inPart = (part: string) =>
    single ? inGroup : inGroup.filter((e) => partOf(e) === part);
  const first = (g: Group) => all.find((e) => groupOf(e) === g);

  return (
    <DiwanPage lede={t("lede")} title={t("title")}>
      {entries.isPending ? <SectionSpinner /> : null}
      {entries.isPending || all.length > 0 ? null : (
        <p className="type-caption">{t("notBuilt")}</p>
      )}
      {entry ? (
        <div className="grid gap-8">
          <nav aria-label={t("sections")}>
            <ul className="border-line flex flex-wrap gap-x-6 gap-y-2 border-b pb-3">
              {GROUPS.map((g) => {
                const start = first(g);
                return start ? (
                  <li key={g}>
                    <Link
                      aria-current={g === group ? "page" : undefined}
                      className={cn(
                        "type-label",
                        g === group ? "text-accent" : "text-text-secondary"
                      )}
                      href={`/media/design/${start.id}`}
                    >
                      {t(`groups.${g}`)}
                    </Link>
                  </li>
                ) : null;
              })}
            </ul>
          </nav>
          {inGroup.length > 1 ? (
            <nav aria-label={t(`groups.${group as Group}`)}>
              <div className="grid gap-3">
                {parts.map((part) => (
                  <div className="grid gap-1" key={part || "_"}>
                    {part && parts.length > 1 ? (
                      <p className="type-caption text-text-secondary">{part}</p>
                    ) : null}
                    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                      {inPart(part).map((e) => (
                        <li key={e.id}>
                          <Link
                            aria-current={
                              e.id === entry.id ? "page" : undefined
                            }
                            className={cn(
                              "underline-offset-4",
                              e.id === entry.id
                                ? "text-text underline"
                                : "text-text-secondary hover:underline"
                            )}
                            href={`/media/design/${e.id}`}
                          >
                            {single || e.type === "docs" ? labelOf(e) : e.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </nav>
          ) : null}
          <Canvas entry={entry} key={entry.id} kit={kit} />
        </div>
      ) : null}
    </DiwanPage>
  );
};
