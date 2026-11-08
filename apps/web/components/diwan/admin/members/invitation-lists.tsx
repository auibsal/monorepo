"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/brand/components/ui/button";
import { Textarea } from "@repo/brand/components/ui/textarea";
import {
  formatLongDate,
  formatNumber,
} from "@repo/internationalization/format";
import { hasPermission } from "@repo/rbac";
import { unwrap } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useId, useState } from "react";
import { callApi } from "@/lib/diwan/api";
import { useGrants } from "@/lib/diwan/queries";
import { ErrorLine } from "../kit";

const listsKey = ["admin", "membership", "invitation-lists"];
const DAY_MS = 86_400_000;

interface List {
  sent_at: string | null;
  source: string;
  tested_at: string | null;
  title_ar: string;
  title_en: string;
}

interface Counts {
  joined: number;
  sent: number;
  waiting: number;
}

/** Between an address and a name: a comma, a tab, a semicolon or spaces. */
const SEPARATOR = /[,\t;]+|\s+/u;

/**
 * Typed paper sign-ups, one person a line: the AUIB address, then the
 * first name if it was written.
 */
export const parseSignUps = (text: string) =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [email = "", ...rest] = line.split(SEPARATOR).filter(Boolean);
      return { email: email.toLowerCase(), first_name: rest.join(" ") };
    });

type Refresh = () => Promise<void>;

/** Typing in a page of sign-ups, and who is on the list so far. */
const SignUps = ({ list, refresh }: { list: List; refresh: Refresh }) => {
  const t = useTranslations("diwan.admin.invitations");
  const { supabase } = useAuth();
  const entryId = useId();
  const [text, setText] = useState("");
  const people = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("membership")
          .rpc("invitation_list", { list: list.source })
      ) ?? [],
    queryKey: [...listsKey, list.source, "people"],
  });
  const add = useMutation({
    mutationFn: async () => {
      const rows = parseSignUps(text);
      const added = unwrap(
        await supabase
          .schema("membership")
          .rpc("add_invitations", { list: list.source, people: rows })
      );
      return { added: Number(added ?? 0), typed: rows.length };
    },
    onSuccess: async () => {
      setText("");
      await refresh();
    },
  });
  const remove = useMutation({
    mutationFn: async (email: string) =>
      unwrap(
        await supabase
          .schema("membership")
          .rpc("remove_invitation", { address: email })
      ),
    onSuccess: refresh,
  });

  return (
    <>
      <label className="grid gap-2" htmlFor={entryId}>
        <span className="type-label">{t("enter")}</span>
        <span className="type-caption text-text-secondary">
          {t("enterHint")}
        </span>
        <Textarea
          dir="ltr"
          id={entryId}
          onChange={(event) => setText(event.target.value)}
          rows={6}
          value={text}
        />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          disabled={!text.trim() || add.isPending}
          onClick={() => add.mutate()}
          variant="outline"
        >
          {t("add")}
        </Button>
        {add.data ? (
          <p className="type-caption" role="status">
            {t("added", {
              added: formatNumber(add.data.added),
              typed: formatNumber(add.data.typed),
            })}
          </p>
        ) : null}
      </div>
      <ErrorLine error={add.error} />
      {(people.data ?? []).length > 0 ? (
        <ul className="divide-line grid divide-y">
          {(people.data ?? []).map((person) => (
            <li
              className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2"
              key={person.email}
            >
              <span className="type-body" dir="ltr">
                {person.email}
                {person.first_name ? ` · ${person.first_name}` : ""}
              </span>
              <span className="flex flex-wrap items-baseline gap-3">
                {person.has_account ? (
                  <span className="type-caption text-text-secondary">
                    {t("hasAccount")}
                  </span>
                ) : null}
                <button
                  className="link type-caption"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate(person.email)}
                  type="button"
                >
                  {t("remove")}
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      <ErrorLine error={remove.error ?? people.error} />
    </>
  );
};

/** The test to the President, then the President's go. */
const Sending = ({
  canSend,
  list,
  refresh,
  waiting,
}: {
  canSend: boolean;
  list: List;
  refresh: Refresh;
  waiting: number;
}) => {
  const t = useTranslations("diwan.admin.invitations");
  const locale = useLocale();
  const { supabase } = useAuth();
  const [confirming, setConfirming] = useState(false);
  const test = useMutation({
    mutationFn: () =>
      callApi<{ sent: string }>(supabase, "/invitations/test", {
        list: list.source,
      }),
    onSuccess: refresh,
  });
  const send = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase
          .schema("membership")
          .rpc("send_invitations", { list: list.source })
      ),
    onSuccess: async () => {
      setConfirming(false);
      await refresh();
    },
  });
  let testLine: string | null = null;
  if (test.data) {
    testLine = t("testSent", { email: test.data.sent });
  } else if (list.tested_at) {
    testLine = t("tested", {
      date: formatLongDate(new Date(list.tested_at), locale),
    });
  }

  return (
    <div className="border-line grid gap-3 border-t pt-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          disabled={test.isPending || waiting === 0}
          onClick={() => test.mutate()}
          variant="outline"
        >
          {t("test")}
        </Button>
        {testLine ? (
          <p className="type-caption" role="status">
            {testLine}
          </p>
        ) : null}
      </div>
      <ErrorLine error={test.error} />
      {canSend && list.tested_at && waiting > 0 && !confirming ? (
        <Button
          className="justify-self-start"
          onClick={() => setConfirming(true)}
        >
          {t("send", { count: formatNumber(waiting) })}
        </Button>
      ) : null}
      {canSend && confirming ? (
        <div className="grid gap-3">
          <p className="type-body font-medium">
            {t("confirm", { count: formatNumber(waiting) })}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button disabled={send.isPending} onClick={() => send.mutate()}>
              {t("sendNow")}
            </Button>
            <Button onClick={() => setConfirming(false)} variant="outline">
              {t("notYet")}
            </Button>
          </div>
        </div>
      ) : null}
      <p className="type-caption text-text-secondary">
        {canSend ? t("presidentNote") : t("president")}
      </p>
      {send.data === undefined ? null : (
        <p className="type-caption" role="status">
          {t("sending", { count: formatNumber(Number(send.data)) })}
        </p>
      )}
      <ErrorLine error={send.error} />
    </div>
  );
};

const ListCard = ({ canSend, list }: { canSend: boolean; list: List }) => {
  const t = useTranslations("diwan.admin.invitations");
  const locale = useLocale();
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const counts = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("membership")
          .rpc("invitations_waiting", { list: list.source })
      ) as Counts | null,
    queryKey: [...listsKey, list.source, "counts"],
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: listsKey });
  const headingId = `list-${list.source}`;

  return (
    <section
      aria-labelledby={headingId}
      className="border-line grid gap-4 border-t pt-6"
    >
      <h3 className="type-subheading" id={headingId}>
        {locale === "ar" ? list.title_ar : list.title_en}
      </h3>
      {counts.data ? (
        <p className="type-body">
          {t("status", {
            joined: formatNumber(counts.data.joined),
            sent: formatNumber(counts.data.sent),
            waiting: formatNumber(counts.data.waiting),
          })}
        </p>
      ) : null}
      {list.sent_at ? (
        <p className="type-caption text-text-secondary">
          {t("sentOn", {
            date: formatLongDate(new Date(list.sent_at), locale),
            deleted: formatLongDate(
              new Date(new Date(list.sent_at).getTime() + 30 * DAY_MS),
              locale
            ),
          })}
        </p>
      ) : (
        <>
          <SignUps list={list} refresh={refresh} />
          <Sending
            canSend={canSend}
            list={list}
            refresh={refresh}
            waiting={counts.data?.waiting ?? 0}
          />
        </>
      )}
    </section>
  );
};

/**
 * Membership → Invitations (decisions §2): each invitation list, newest
 * first. Staff type in a list's paper sign-ups (the fall club fair's), send
 * its test to the President, and the President alone says go. A list goes
 * once, as one Broadcast through the same invitation flow, and deletes
 * itself thirty days after its own send.
 */
export const InvitationLists = () => {
  const t = useTranslations("diwan.admin.invitations");
  const { supabase } = useAuth();
  const grants = useGrants();
  const lists = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("membership")
          .from("invitation_lists")
          .select("source, title_en, title_ar, tested_at, sent_at")
          .order("created_at", { ascending: false })
          .order("source", { ascending: true })
      ) ?? [],
    queryKey: listsKey,
  });
  const canSend =
    hasPermission(grants.data, "roles.assign") &&
    hasPermission(grants.data, "governance.manage");
  const open = (lists.data ?? []).filter((l) => !l.sent_at);
  const sent = (lists.data ?? []).filter((l) => l.sent_at);

  return (
    <div className="grid max-w-3xl gap-8">
      <header className="grid gap-2">
        <h2 className="type-heading">{t("title")}</h2>
        <p className="type-body text-text-secondary">{t("lede")}</p>
      </header>
      {[...open, ...sent].map((list) => (
        <ListCard canSend={canSend} key={list.source} list={list} />
      ))}
      <ErrorLine error={lists.error} />
    </div>
  );
};
