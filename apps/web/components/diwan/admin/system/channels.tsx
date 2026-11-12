"use client";

import { Button } from "@repo/brand/components/ui/button";
import { Input } from "@repo/brand/components/ui/input";
import { formatNumber } from "@repo/internationalization/format";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useAuth } from "@/lib/auth/provider";
import { unwrap } from "@/lib/data";
import { useGrants } from "@/lib/diwan/queries";
import { hasPermissionAnywhere } from "@/lib/rbac";
import { DiwanSection, RowList } from "../../page";
import { SectionSpinner } from "../../states";
import {
  AddInPlace,
  AdminHeading,
  ConfirmAction,
  ErrorLine,
  Field,
  SaveButton,
  SelectInput,
} from "../kit";
import { TelegramBot } from "./telegram";

/** Where Hudhud posts, by purpose; the Diwan group's brief only there. */
const PURPOSES = [
  "announcements",
  "events",
  "qirtas",
  "word",
  "brief",
] as const;
type Purpose = (typeof PURPOSES)[number];

/** A topic's number from a typed number or a t.me link to it. */
const TOPIC = /(\d+)\/?$/u;
const DIGITS = /^\d+$/u;

const groupsKey = ["admin", "telegram", "groups"];
const exemptKey = ["admin", "telegram", "exempt"];

export const Channels = () => {
  const t = useTranslations("diwan.admin.channels");
  const grants = useGrants();
  const settings = hasPermissionAnywhere(grants.data, "settings.manage");
  const members = hasPermissionAnywhere(grants.data, "members.manage");
  // The mailing list's counts (decisions.md, Channels and email): Media,
  // the Managing Editor and whoever runs the channels.
  const mailing =
    settings ||
    members ||
    hasPermissionAnywhere(grants.data, "content.manage") ||
    hasPermissionAnywhere(grants.data, "mailing.read");
  if (grants.isPending) {
    return <SectionSpinner />;
  }
  return (
    <div className="grid gap-10">
      <AdminHeading title={t("title")}>{t("lede")}</AdminHeading>
      {mailing ? <MailingCounts /> : null}
      {settings ? <TelegramBot /> : null}
      {settings ? <Groups /> : null}
      {members ? <Exempt /> : null}
    </div>
  );
};

interface Count {
  lang: string | null;
  readers: number;
  source: string | null;
  topic: string;
}

/**
 * The mailing list, as counts only: each topic's readers by language and
 * where they came from, those who stopped, and the addresses suppressed
 * after a bounce or complaint. No names here.
 */
const MailingCounts = () => {
  const t = useTranslations("diwan.admin.channels.mailing");
  const { supabase } = useAuth();
  const counts = useQuery({
    queryFn: async () =>
      (unwrap(await supabase.schema("content").rpc("mailing_counts")) ??
        []) as Count[],
    queryKey: ["admin", "mailing", "counts"],
  });
  if (!counts.data) {
    return counts.isPending ? <SectionSpinner /> : null;
  }
  const sum = (topic: string, lang?: string) =>
    counts.data
      .filter((c) => c.topic === topic && (!lang || c.lang === lang))
      .reduce((n, c) => n + c.readers, 0);
  const sources = (topic: string) =>
    [
      ...new Set(
        counts.data.filter((c) => c.topic === topic).map((c) => c.source ?? "")
      ),
    ]
      .filter(Boolean)
      .map((source) => ({
        n: counts.data
          .filter((c) => c.topic === topic && c.source === source)
          .reduce((m, c) => m + c.readers, 0),
        source,
      }));
  return (
    <DiwanSection id="mailing" title={t("title")}>
      <p className="type-body text-text-secondary max-w-prose">{t("lede")}</p>
      <RowList>
        {(["paper", "news"] as const).map((topic) => (
          <li className="grid gap-1" key={topic}>
            <span className="font-medium">
              {t(`topics.${topic}`)}: {formatNumber(sum(topic))}
            </span>
            <span className="text-text-secondary text-sm">
              {t("byLanguage", {
                ar: formatNumber(sum(topic, "ar")),
                en: formatNumber(sum(topic, "en")),
              })}
              {" · "}
              {sources(topic)
                .map(
                  (s) =>
                    `${t(`sources.${s.source as "member"}`)} ${formatNumber(s.n)}`
                )
                .join(" · ")}
            </span>
          </li>
        ))}
        <li className="text-text-secondary text-sm">
          {t("stopped", {
            stopped: formatNumber(sum("stopped")),
            suppressed: formatNumber(sum("suppressed")),
          })}
        </li>
      </RowList>
    </DiwanSection>
  );
};

interface Group {
  audience: string;
  chat_id: number;
  lang: string;
  title: string | null;
  topics: Record<string, number>;
}

const Groups = () => {
  const t = useTranslations("diwan.admin.channels");
  const { supabase } = useAuth();
  const list = useQuery({
    queryFn: async () =>
      (unwrap(
        await supabase
          .schema("core")
          .from("telegram_groups")
          .select("chat_id, title, lang, topics, audience")
          .order("registered_at")
      ) ?? []) as Group[],
    queryKey: groupsKey,
  });
  return (
    <DiwanSection id="groups" title={t("groups")}>
      <p className="type-body text-text-secondary">{t("groupsLede")}</p>
      {list.isPending ? <SectionSpinner /> : null}
      {list.data?.length === 0 ? (
        <p className="type-body">{t("noGroups")}</p>
      ) : null}
      <RowList>
        {(list.data ?? []).map((group) => (
          <li key={group.chat_id}>
            <GroupSettings group={group} />
          </li>
        ))}
      </RowList>
    </DiwanSection>
  );
};

const GroupSettings = ({ group }: { readonly group: Group }) => {
  const t = useTranslations("diwan.admin.channels");
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const [audience, setAudience] = useState(group.audience);
  const [lang, setLang] = useState(group.lang === "ar" ? "ar" : "en");
  const [topics, setTopics] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      PURPOSES.map((p) => [
        p,
        group.topics[p] === undefined ? "" : String(group.topics[p]),
      ])
    )
  );
  const save = useMutation({
    mutationFn: async () => {
      const chosen: Record<string, number> = {};
      for (const p of PURPOSES) {
        const typed = (topics[p] ?? "").trim();
        const match = TOPIC.exec(typed);
        if (match?.[1]) {
          chosen[p] = Number(match[1]);
        } else if (typed === "0" || DIGITS.test(typed)) {
          chosen[p] = Number(typed);
        }
      }
      unwrap(
        await supabase
          .schema("core")
          .from("telegram_groups")
          .update({ audience, lang, topics: chosen })
          .eq("chat_id", group.chat_id)
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: groupsKey }),
  });
  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate();
      }}
    >
      <p className="type-body font-medium">{group.title ?? group.chat_id}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("audience")}>
          {(id) => (
            <SelectInput
              id={id}
              onChange={(e) => setAudience(e.target.value)}
              value={audience}
            >
              <option value="members">{t("audiences.members")}</option>
              <option value="staff">{t("audiences.staff")}</option>
            </SelectInput>
          )}
        </Field>
        <Field hint={t("langHint")} label={t("lang")}>
          {(id) => (
            <SelectInput
              id={id}
              onChange={(e) => setLang(e.target.value)}
              value={lang}
            >
              <option value="en">{t("langs.en")}</option>
              <option value="ar">{t("langs.ar")}</option>
            </SelectInput>
          )}
        </Field>
      </div>
      <fieldset className="grid gap-3">
        <legend className="mb-2 text-sm font-medium">{t("topics")}</legend>
        <p className="type-caption">{t("topicsHint")}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {PURPOSES.map((p: Purpose) => (
            <Field key={p} label={t(`purposes.${p}`)}>
              {(id) => (
                <Input
                  dir="ltr"
                  id={id}
                  onChange={(e) =>
                    setTopics((all) => ({ ...all, [p]: e.target.value }))
                  }
                  value={topics[p] ?? ""}
                />
              )}
            </Field>
          ))}
        </div>
      </fieldset>
      <SaveButton pending={save.isPending} quiet success={save.isSuccess} />
      <ErrorLine error={save.error} />
    </form>
  );
};

const Exempt = () => {
  const t = useTranslations("diwan.admin.channels");
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const list = useQuery({
    queryFn: async () =>
      unwrap(
        await supabase
          .schema("core")
          .from("telegram_exempt")
          .select("telegram_id, label")
          .order("label")
      ) ?? [],
    queryKey: exemptKey,
  });
  const remove = useMutation({
    mutationFn: async (id: number) =>
      unwrap(
        await supabase
          .schema("core")
          .from("telegram_exempt")
          .delete()
          .eq("telegram_id", id)
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: exemptKey }),
  });
  return (
    <DiwanSection id="exempt" title={t("exempt")}>
      <p className="type-body text-text-secondary">{t("exemptLede")}</p>
      <RowList>
        {(list.data ?? []).map((row) => (
          <li
            className="flex flex-wrap items-center gap-3"
            key={row.telegram_id}
          >
            <span className="type-body grow">{row.label}</span>
            <span className="type-caption" dir="ltr">
              {row.telegram_id}
            </span>
            <ConfirmAction
              confirmLabel={t("remove")}
              description={t("removeConfirm")}
              disabled={remove.isPending}
              onConfirm={() => remove.mutate(row.telegram_id)}
            >
              {t("remove")}
            </ConfirmAction>
          </li>
        ))}
      </RowList>
      <ErrorLine error={remove.error} />
      <AddInPlace label={t("add")}>
        {(close) => (
          <NewExempt
            onDone={() => {
              queryClient.invalidateQueries({ queryKey: exemptKey });
              close();
            }}
          />
        )}
      </AddInPlace>
    </DiwanSection>
  );
};

const NewExempt = ({ onDone }: { readonly onDone: () => void }) => {
  const t = useTranslations("diwan.admin.channels");
  const { supabase } = useAuth();
  const [label, setLabel] = useState("");
  const [id, setId] = useState("");
  const add = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase
          .schema("core")
          .from("telegram_exempt")
          .insert({ label: label.trim(), telegram_id: Number(id.trim()) })
      ),
    onSuccess: onDone,
  });
  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        add.mutate();
      }}
    >
      <Field hint={t("labelHint")} label={t("label")}>
        {(fieldId) => (
          <Input
            id={fieldId}
            maxLength={120}
            onChange={(e) => setLabel(e.target.value)}
            value={label}
          />
        )}
      </Field>
      <Field hint={t("telegramIdHint")} label={t("telegramId")}>
        {(fieldId) => (
          <Input
            dir="ltr"
            id={fieldId}
            inputMode="numeric"
            onChange={(e) => setId(e.target.value)}
            value={id}
          />
        )}
      </Field>
      <Button
        className="justify-self-start"
        disabled={!(label.trim() && DIGITS.test(id.trim())) || add.isPending}
        type="submit"
      >
        {t("add")}
      </Button>
      <ErrorLine error={add.error} />
    </form>
  );
};
