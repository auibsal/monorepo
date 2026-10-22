"use client";

import { useAuth } from "@repo/auth/provider";
import type { Json } from "@repo/database";
import { SalCard } from "@repo/design-system/components/sal/card";
import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { unwrap } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { callApi } from "@/lib/api";
import { BilingualField, ErrorLine, Field, SaveButton } from "../kit";

const LEADING_AT = /^@/;

interface BotStatus {
  configured: boolean;
  connected?: boolean;
  lastError?: string | null;
  missing?: string[];
}

const asText = (value: Json | undefined) =>
  typeof value === "string" ? value : "";

/**
 * Settings: Hudhud, the Society's Telegram bot. Its username (members see
 * "Connect Telegram" once it is set), the house rules it shows with /rules,
 * and a one-time /setup code for connecting a group.
 */
export const TelegramBot = ({
  settings,
}: {
  settings: Record<string, Json>;
}) => {
  const t = useTranslations("nexus.admin.settings.telegram");
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  const [username, setUsername] = useState("");
  const [rules, setRules] = useState({ ar: "", en: "" });
  const [code, setCode] = useState<string | null>(null);
  useEffect(() => {
    setUsername(asText(settings["telegram.bot_username"]));
    setRules({
      ar: asText(settings["telegram.rules_ar"]),
      en: asText(settings["telegram.rules_en"]),
    });
  }, [settings]);

  const save = useMutation({
    mutationFn: async () => {
      const entries: Record<string, string> = {
        "telegram.bot_username": username.trim().replace(LEADING_AT, ""),
        "telegram.rules_ar": rules.ar.trim(),
        "telegram.rules_en": rules.en.trim(),
      };
      const results = await Promise.all(
        Object.entries(entries).map(([settingKey, value]) =>
          supabase
            .schema("core")
            .from("settings")
            .update({ updated_by: user?.id ?? null, value })
            .eq("key", settingKey)
        )
      );
      for (const result of results) {
        unwrap(result);
      }
    },
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["admin", "settings"] }),
  });
  const statusKey = ["admin", "telegram-status"];
  const status = useQuery({
    queryFn: () => callApi<BotStatus>(supabase, "/telegram/setup", {}),
    queryKey: statusKey,
  });
  const connect = useMutation({
    mutationFn: () =>
      callApi<BotStatus>(supabase, "/telegram/setup", { connect: true }),
    onSuccess: (data) => queryClient.setQueryData(statusKey, data),
  });
  let statusLine: string | null = null;
  if (status.data && !status.data.configured) {
    statusLine = t("notConfigured", {
      missing: (status.data.missing ?? []).join(", "),
    });
  } else if (status.data?.connected) {
    statusLine = t("connected");
  } else if (status.data) {
    statusLine = t("notConnected");
  }
  const groupCode = useMutation({
    mutationFn: async () =>
      unwrap(await supabase.schema("core").rpc("telegram_group_code")),
    onSuccess: setCode,
  });

  return (
    <SalCard>
      <h2 className="type-subheading">{t("title")}</h2>
      <p className="type-body">{t("lede")}</p>
      <div className="grid gap-2">
        <h3 className="type-body font-bold">{t("botTitle")}</h3>
        {statusLine ? (
          <p className="type-caption" role="status">
            {statusLine}
          </p>
        ) : null}
        {status.data?.lastError ? (
          <p className="type-caption" dir="ltr">
            {status.data.lastError}
          </p>
        ) : null}
        {status.data?.configured ? (
          <Button
            className="justify-self-start"
            disabled={connect.isPending}
            onClick={() => connect.mutate()}
            variant={status.data.connected ? "outline" : "default"}
          >
            {status.data.connected ? t("reconnect") : t("connect")}
          </Button>
        ) : null}
        <ErrorLine error={status.error ?? connect.error} />
      </div>
      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          save.mutate();
        }}
      >
        <Field hint={t("usernameHint")} label={t("username")}>
          {(id) => (
            <Input
              dir="ltr"
              id={id}
              maxLength={33}
              onChange={(event) => setUsername(event.target.value)}
              value={username}
            />
          )}
        </Field>
        <BilingualField
          label={t("rules")}
          maxLength={2000}
          multiline
          onChange={setRules}
          rows={4}
          value={rules}
        />
        <p className="type-caption">{t("rulesHint")}</p>
        <SaveButton pending={save.isPending} success={save.isSuccess} />
        <ErrorLine error={save.error} />
      </form>
      <div className="grid gap-2">
        <h3 className="type-body font-bold">{t("connectGroup")}</h3>
        <p className="type-caption">{t("connectHint")}</p>
        {code ? (
          <code className="type-code select-all" dir="ltr">
            /setup {code}
          </code>
        ) : null}
        <Button
          className="justify-self-start"
          disabled={groupCode.isPending}
          onClick={() => groupCode.mutate()}
          variant="outline"
        >
          {code ? t("newCode") : t("makeCode")}
        </Button>
        <ErrorLine error={groupCode.error} />
      </div>
    </SalCard>
  );
};
