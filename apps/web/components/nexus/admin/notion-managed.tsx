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
 * A record's page in the team's Notion workspace (core.notion_links), where
 * the team plans around it: events and news are written there (publishing
 * from Notion again replaces what is edited here); programs, documents,
 * minutes and officers are mirrored there for the team's own pages to link.
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
      {t(kind === "event" || kind === "news" ? kind : "mirror")}{" "}
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
