"use client";

import { useAuth } from "@repo/auth/provider";
import { hasPermissionAnywhere } from "@repo/rbac";
import { content } from "@repo/sal-data";
import { useQuery } from "@tanstack/react-query";
import { useGrants } from "./queries";

/**
 * The team's Notion workspace (docs/platform/notion.md). Its addresses are
 * public settings; Notion itself decides who may open them, so these hooks
 * only choose whom to show the links to.
 */

const NOTION_URL = /^https:\/\/(app\.notion\.com|www\.notion\.so)\//;

export const isNotionUrl = (value: unknown): value is string =>
  typeof value === "string" && NOTION_URL.test(value);

const useSetting = (key: string, enabled: boolean) => {
  const { supabase } = useAuth();
  return useQuery({
    enabled,
    queryFn: () => content.publicSetting(supabase, key),
    queryKey: ["setting", key],
    staleTime: 3_600_000,
  });
};

/** Start here, for anyone who holds a role. */
export const useTeamWorkspace = () => {
  const grants = useGrants();
  const officer = (grants.data ?? []).length > 0;
  const home = useSetting("notion.home_url", officer);
  return officer && isNotionUrl(home.data) ? home.data : null;
};

interface HandbookSetting {
  home?: unknown;
  pages?: Record<string, unknown>;
}

/**
 * The officer handbook in Notion, for people who may read the internal
 * library: its first page, and each page by its old Nexus slug (so links to
 * /handbook?page=… still land on the right page).
 */
export const useNotionHandbook = () => {
  const grants = useGrants();
  const reader =
    hasPermissionAnywhere(grants.data, "library.read") ||
    hasPermissionAnywhere(grants.data, "governance.manage");
  const setting = useSetting("notion.handbook", reader);
  const value = (setting.data ?? null) as HandbookSetting | null;
  const home = isNotionUrl(value?.home) ? value.home : null;
  return {
    home: reader ? home : null,
    isPending: grants.isPending || (reader && setting.isPending),
    pageFor: (slug: string | null) => {
      const page = slug ? value?.pages?.[slug] : null;
      return isNotionUrl(page) ? page : home;
    },
    reader,
  };
};
