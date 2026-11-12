"use client";

import { SalCard } from "@repo/brand/components/sal/card";
import { Icon } from "@repo/brand/components/sal/icon";
import { Input } from "@repo/brand/components/ui/input";
import type { Locale } from "@repo/internationalization";
import {
  formatClock,
  formatLongDate,
  formatNumber,
} from "@repo/internationalization/format";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { InlineConfirm } from "@/components/frame/inline-confirm";
import { useAuth } from "@/lib/auth/provider";
import { unwrap } from "@/lib/data";
import { callApi } from "@/lib/diwan/api";
import { SectionSpinner } from "../../states";
import { type Column, DataTable, ErrorLine, Field, SaveButton } from "../kit";

interface Status {
  catchUpSentAt: string | null;
  configured: boolean;
  home: string | null;
  invite?: { email: string; name: string; roles: string[]; user_id: string }[];
  inviteLink: string | null;
  listsError?: string;
  remove?: { email: string; name: string }[];
  state: {
    at: string;
    counts: Record<string, number>;
    problems: string[];
  } | null;
}

type Invite = NonNullable<Status["invite"]>[number];
type Remove = NonNullable<Status["remove"]>[number];

const STATUS_KEY = ["admin", "notion-status"];

const total = (counts: Record<string, number>, suffix: string) =>
  Object.entries(counts)
    .filter(([k]) => k.endsWith(suffix))
    .reduce((sum, [, n]) => sum + n, 0);

/**
 * The workspace's invite link (core.settings `notion.invite_link`): the
 * role email carries it, the only way into the team's Notion.
 */
const InviteLink = ({ saved }: { readonly saved: string | null }) => {
  const t = useTranslations("diwan.admin.settings.notion");
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  const [link, setLink] = useState(saved ?? "");
  useEffect(() => {
    setLink(saved ?? "");
  }, [saved]);
  const save = useMutation({
    mutationFn: async () => {
      const value = link.trim();
      unwrap(
        await supabase
          .schema("core")
          .from("settings")
          .update({ updated_by: user?.id ?? null, value })
          .eq("key", "notion.invite_link")
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: STATUS_KEY }),
  });
  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate();
      }}
    >
      <Field hint={t("inviteLinkHint")} label={t("inviteLink")}>
        {(id) => (
          <Input
            dir="ltr"
            id={id}
            inputMode="url"
            onChange={(event) => setLink(event.target.value)}
            pattern="https://.*"
            type="url"
            value={link}
          />
        )}
      </Field>
      <SaveButton pending={save.isPending} success={save.isSuccess} />
      <ErrorLine error={save.error} />
    </form>
  );
};

/**
 * For now, once: who to invite and who to remove, and the one button that
 * sends the invitation to everyone on the first list. After it is sent the
 * block goes away for good (`notion.catch_up_sent_at`); from then on the
 * invitation comes with each role.
 */
const CatchUp = ({ data }: { readonly data: Status }) => {
  const t = useTranslations("diwan.admin.settings.notion");
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const send = useMutation({
    mutationFn: () => callApi<{ sent: number }>(supabase, "/notion/invite", {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: STATUS_KEY }),
  });
  const inviteColumns: Column<Invite>[] = [
    { cell: (r) => r.name, header: t("columns.name"), key: "name" },
    { cell: (r) => r.email, header: t("columns.email"), key: "email" },
    {
      cell: (r) => r.roles.join(", "),
      header: t("columns.roles"),
      key: "roles",
    },
  ];
  const removeColumns: Column<Remove>[] = [
    { cell: (r) => r.name, header: t("columns.name"), key: "name" },
    { cell: (r) => r.email, header: t("columns.email"), key: "email" },
  ];
  const invite = data.invite ?? [];
  return (
    <section className="border-line grid gap-4 border-t pt-4">
      <h3 className="font-medium">{t("catchUpTitle")}</h3>
      <p className="type-caption">{t("catchUpHint")}</p>
      <section className="grid gap-2">
        <h4 className="font-medium">{t("inviteTitle")}</h4>
        <p className="type-caption">{t("inviteHint")}</p>
        <DataTable
          caption={t("inviteTitle")}
          columns={inviteColumns}
          empty={t("inviteEmpty")}
          rowKey={(r) => r.email}
          rows={invite}
        />
      </section>
      <section className="grid gap-2">
        <h4 className="font-medium">{t("removeTitle")}</h4>
        <p className="type-caption">{t("removeHint")}</p>
        <DataTable
          caption={t("removeTitle")}
          columns={removeColumns}
          empty={t("removeEmpty")}
          rowKey={(r) => r.email}
          rows={data.remove ?? []}
        />
      </section>
      {data.inviteLink ? null : (
        <p className="type-caption font-medium">{t("needsLink")}</p>
      )}
      <InlineConfirm
        confirm={t("sendConfirm")}
        disabled={!data.inviteLink || send.isPending}
        label={t("send", { count: formatNumber(invite.length) })}
        onConfirm={() => send.mutate()}
        question={t("sendAsk")}
      />
      <ErrorLine error={send.error} />
    </section>
  );
};

/**
 * The Desk's Connected panel: the team's Notion workspace. Whether the
 * connection is set up, what the last sync did, the invite link the role
 * email carries, and, until it is sent once, the catch-up block.
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
      {data ? <InviteLink saved={data.inviteLink} /> : null}
      {data && !data.catchUpSentAt && (data.invite || data.remove) ? (
        <CatchUp data={data} />
      ) : null}
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
