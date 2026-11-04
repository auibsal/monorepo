"use client";

import { useAuth } from "@repo/auth/provider";
import { Icon } from "@repo/design-system/components/sal/icon";
import { unwrap } from "@repo/sal-data";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

type NotionKind =
  | "event"
  | "news"
  | "programme"
  | "document"
  | "minutes"
  | "officer";

/**
 * A record's page in the team's Notion workspace (core.notion_links). Since
 * Nov 4, 2026 events, news, programs, documents and minutes are written
 * there and published here (publishing again replaces what is edited
 * here); officers are copied there, read-only, for the team's pages to link.
 */
export const NotionManaged = ({
  kind,
  recordId,
}: {
  kind: NotionKind;
  recordId: string | null;
}) => {
  const t = useTranslations("nexus.admin.notion");
  const tc = useTranslations("common");
  const { supabase } = useAuth();
  const link = useQuery({
    enabled: Boolean(recordId),
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("core")
          .from("notion_links")
          .select("notion_page_id")
          .eq("kind", kind)
          .eq("record_key", recordId ?? "")
          .maybeSingle()
      ),
    queryKey: ["notion-link", kind, recordId],
  });
  if (!link.data) {
    return null;
  }
  return (
    <p className="border-line border-t pt-space-4 text-sm" role="note">
      {t(kind === "officer" ? "mirror" : kind)}{" "}
      <a
        className="inline-flex items-center gap-1 underline underline-offset-4"
        href={`https://www.notion.so/${link.data.notion_page_id}`}
        rel="noopener"
        target="_blank"
      >
        {t("open")}
        <Icon
          className="size-3.5"
          label={tc("externalLink")}
          name="arrow-up-right"
        />
      </a>
    </p>
  );
};
