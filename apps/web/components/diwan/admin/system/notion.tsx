"use client";

import { SalCard } from "@repo/brand/components/sal/card";
import { Icon } from "@repo/brand/components/sal/icon";
import type { Locale } from "@repo/internationalization";
import {
  formatClock,
  formatLongDate,
  formatNumber,
} from "@repo/internationalization/format";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth/provider";
import { unwrap } from "@/lib/data";
import { callApi } from "@/lib/diwan/api";
import { SectionSpinner } from "../../states";
import { type Column, DataTable, ErrorLine } from "../kit";

interface Status {
  configured: boolean;
  home: string | null;
  listsError?: string;
  remove?: { email: string; name: string }[];
  state: {
    at: string;
    counts: Record<string, number>;
    problems: string[];
  } | null;
}

type Remove = NonNullable<Status["remove"]>[number];

const STATUS_KEY = ["admin", "notion-status"];

const total = (counts: Record<string, number>, suffix: string) =>
  Object.entries(counts)
    .filter(([k]) => k.endsWith(suffix))
    .reduce((sum, [, n]) => sum + n, 0);

interface Invite {
  email: string;
  name_ar: string | null;
  name_en: string;
  roles: string[];
  user_id: string;
}

const INVITE_KEY = ["admin", "notion-to-invite"];

/**
 * Notion by named invitation (decisions.md, Notion): the role holders
 * not yet invited, by their AUIB email. The Secretary invites each in
 * Notion and marks it done here; whoever is in the workspace without a
 * role that opens it is listed to remove.
 */
const Invitations = ({ data }: { readonly data: Status }) => {
  const t = useTranslations("diwan.admin.settings.notion");
  const locale = useLocale();
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const list = useQuery({
    queryFn: async () =>
      (unwrap(await supabase.schema("core").rpc("notion_to_invite")) ??
        []) as Invite[],
    queryKey: INVITE_KEY,
  });
  const mark = useMutation({
    mutationFn: async (member: string) =>
      unwrap(
        await supabase.schema("core").rpc("mark_notion_invited", { member })
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: INVITE_KEY }),
  });
  const inviteColumns: Column<Invite>[] = [
    {
      cell: (r) => (locale === "ar" && r.name_ar) || r.name_en,
      header: t("columns.name"),
      key: "name",
    },
    {
      cell: (r) => <span dir="ltr">{r.email}</span>,
      header: t("columns.email"),
      key: "email",
    },
    {
      cell: (r) => r.roles.join(", "),
      header: t("columns.roles"),
      key: "roles",
    },
    {
      cell: (r) => (
        <button
          className="link"
          disabled={mark.isPending}
          onClick={() => mark.mutate(r.user_id)}
          type="button"
        >
          {t("markInvited")}
        </button>
      ),
      header: t("columns.done"),
      key: "done",
    },
  ];
  const removeColumns: Column<Remove>[] = [
    { cell: (r) => r.name, header: t("columns.name"), key: "name" },
    { cell: (r) => r.email, header: t("columns.email"), key: "email" },
  ];
  return (
    <section className="border-line grid gap-4 border-t pt-4">
      <section className="grid gap-2">
        <h3 className="font-medium">{t("inviteTitle")}</h3>
        <p className="type-caption">{t("inviteHint")}</p>
        <DataTable
          caption={t("inviteTitle")}
          columns={inviteColumns}
          empty={t("inviteEmpty")}
          rowKey={(r) => r.user_id}
          rows={list.data ?? []}
        />
        <ErrorLine error={mark.error ?? list.error} />
      </section>
      {data.remove ? (
        <section className="grid gap-2">
          <h3 className="font-medium">{t("removeTitle")}</h3>
          <p className="type-caption">{t("removeHint")}</p>
          <DataTable
            caption={t("removeTitle")}
            columns={removeColumns}
            empty={t("removeEmpty")}
            rowKey={(r) => r.email}
            rows={data.remove}
          />
        </section>
      ) : null}
    </section>
  );
};

/**
 * The Desk's Connected panel: the team's Notion workspace. Whether the
 * connection is set up, what the last sync did, and the named
 * invitations.
 */
export const NotionWorkspace = () => {
  const t = useTranslations("diwan.admin.settings.notion");
  const tc = useTranslations("common");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const status = useQuery({
    queryFn: () => callApi<Status>(supabase, "/notion/status", {}),
    queryKey: STATUS_KEY,
  });

  const { data } = status;
  const state = data?.state;

  return (
    <SalCard>
      <h2 className="type-subheading">{t("title")}</h2>
      <p className="type-body">{t("lede")}</p>
      {status.isPending ? <SectionSpinner /> : null}
      <ErrorLine error={status.error} />
      {data && !data.configured ? (
        <p className="type-body font-medium">{t("notConfigured")}</p>
      ) : null}
      {data?.configured && state ? (
        <div className="grid gap-1">
          <p className="type-body">
            {t("lastSync", {
              date: formatLongDate(state.at, locale),
              time: formatClock(state.at, locale),
            })}
          </p>
          <p className="type-caption">
            {t("counts", {
              created: formatNumber(total(state.counts, ".created")),
              published: formatNumber(
                total(state.counts, ".published") +
                  total(state.counts, ".republished")
              ),
              refused: formatNumber(state.counts["publish.refused"] ?? 0),
              updated: formatNumber(total(state.counts, ".updated")),
            })}
          </p>
          {state.problems.length > 0 ? (
            <details>
              <summary className="cursor-pointer text-sm underline underline-offset-4">
                {t("problems", { count: formatNumber(state.problems.length) })}
              </summary>
              <ul className="type-caption mt-2 grid gap-1" dir="ltr">
                {state.problems.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      ) : null}
      {data?.configured && !state ? (
        <p className="type-body">{t("noSyncYet")}</p>
      ) : null}
      {data?.listsError ? (
        <p className="type-caption">{t("listsError")}</p>
      ) : null}
      {data ? <Invitations data={data} /> : null}
      {data?.home ? (
        <a
          className="inline-flex items-center gap-1.5 justify-self-start underline underline-offset-4"
          href={data.home}
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
      ) : null}
    </SalCard>
  );
};
