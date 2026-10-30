"use client";

import { useAuth } from "@repo/auth/provider";
import { adminModules, modulePaths } from "@repo/rbac";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { PathLine } from "@/components/frame/path-line";
import { SkeletonRows } from "@/components/frame/skeleton";
import { RouteParams } from "@/lib/nexus/use-query-param";
import { EmptyLine } from "./states";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface Lookup {
  /** The column that holds the readable name (slug). */
  readonly column: string;
  readonly schema: string;
  readonly table: string;
}

/**
 * A page's own address values for the client components inside it: server
 * pages can't render a client context's Provider themselves.
 */
export const RouteParamsProvider = ({
  children,
  value,
}: {
  readonly children: ReactNode;
  readonly value: Readonly<Record<string, string>>;
}) => <RouteParams.Provider value={value}>{children}</RouteParams.Provider>;

/** The Diwan section a list address belongs to: /qirtas?tab=games → Qirtas. */
const sectionOf = (back: string) => {
  const path = back.split("?")[0] ?? back;
  return adminModules
    .map((module) => module.key)
    .filter((key) => key !== "overview")
    .sort((a, b) => modulePaths[b].length - modulePaths[a].length)
    .find(
      (key) =>
        path === modulePaths[key] || path.startsWith(`${modulePaths[key]}/`)
    );
};

/** Where the record sits, above its page: its section, as a link back. */
const Where = ({ back }: { readonly back: string }) => {
  const t = useTranslations("nexus.admin.nav");
  const section = sectionOf(back);
  return section ? (
    <PathLine items={[{ href: back, label: t(section) }]} />
  ) : null;
};

/**
 * A page addressed by a readable name (/diwan/events/salon-2026-12-01):
 * finds the record's id under the reader's own permissions (RLS decides)
 * and hands it to the page as `id`. An id in the address works as well, so
 * links made before a record had its name still open.
 */
export const RecordRef = ({
  back,
  children,
  lookup,
  value,
}: {
  /** The list "not found" sends the reader back to. */
  readonly back: string;
  readonly children: ReactNode;
  readonly lookup?: Lookup;
  readonly value: string;
}) => {
  const t = useTranslations("common");
  const { supabase } = useAuth();
  const direct = UUID.test(value) || !lookup;
  const found = useQuery({
    enabled: !direct,
    queryFn: async () => {
      if (!lookup) {
        return null;
      }
      const { data } = await supabase
        // biome-ignore lint/suspicious/noExplicitAny: the lookup names its own schema and table.
        .schema(lookup.schema as any)
        .from(lookup.table)
        .select("id")
        .eq(lookup.column, value)
        .maybeSingle();
      return (data as { id: string } | null)?.id ?? null;
    },
    queryKey: ["record-ref", lookup?.schema, lookup?.table, value],
  });
  if (direct) {
    return (
      <RouteParams.Provider value={{ id: value }}>
        <div className="grid gap-4">
          <Where back={back} />
          {children}
        </div>
      </RouteParams.Provider>
    );
  }
  if (found.isPending) {
    return <SkeletonRows />;
  }
  if (!found.data) {
    return (
      <EmptyLine action={{ href: back, label: t("backToList") }}>
        {t("notFoundHere")}
      </EmptyLine>
    );
  }
  return (
    <RouteParams.Provider value={{ id: found.data }}>
      <div className="grid gap-4">
        <Where back={back} />
        {children}
      </div>
    </RouteParams.Provider>
  );
};
