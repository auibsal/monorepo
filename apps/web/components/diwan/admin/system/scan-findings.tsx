"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth/provider";
import { unwrap } from "@/lib/data";
import { RowList } from "../../page";

interface Hit {
  found: string;
  id: string;
  kind: "personal_data" | "retired_name" | "term";
  title: string;
  url: string;
}

/**
 * What the weekly scan of Notion's documents found (decisions.md, Where
 * things live): retired names, the terms to check
 * (docs/platform/terms-to-check.md) and personal data, each on the
 * document it is in, for that document's keeper and the web lead (RLS).
 * Fixed in Notion, a finding goes at the next scan. Nothing shows when
 * the list is empty.
 */
export const ScanFindings = () => {
  const t = useTranslations("diwan.admin.overview.scan");
  const { supabase } = useAuth();
  const hits = useQuery({
    queryFn: async () =>
      (unwrap(
        await supabase
          .schema("core")
          .from("document_scan_hits")
          .select("id, title, url, kind, found")
          .order("title")
          .limit(100)
      ) ?? []) as Hit[],
    queryKey: ["admin", "scan-findings"],
  });
  if (!hits.data?.length) {
    return null;
  }
  return (
    <div className="grid gap-3">
      <p className="type-body">{t("lede")}</p>
      <RowList>
        {hits.data.map((h) => (
          <li className="grid gap-1" key={h.id}>
            <a
              className="link"
              href={h.url}
              rel="noopener noreferrer"
              target="_blank"
            >
              {h.title}
            </a>
            <span className="type-caption">
              {t(`kinds.${h.kind}`)}: {h.found}
            </span>
          </li>
        ))}
      </RowList>
    </div>
  );
};
