"use client";

import { useAuth } from "@repo/auth/provider";
import { Button } from "@repo/design-system/components/ui/button";
import { unwrap } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";

const key = ["profile", "telegram"];

/**
 * Profile and privacy: linking Telegram to Hudhud, the Society's bot. The
 * Nexus makes a one-time code (15 minutes) and opens the bot with it; the
 * bot redeems it. Hidden until the bot's username is set in Settings.
 */
export const TelegramLink = () => {
  const t = useTranslations("nexus.profile.telegram");
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  const [startLink, setStartLink] = useState<string | null>(null);

  const status = useQuery({
    enabled: Boolean(user),
    queryFn: async () => {
      const [setting, account] = await Promise.all([
        supabase
          .schema("core")
          .from("settings")
          .select("value")
          .eq("key", "telegram.bot_username")
          .maybeSingle(),
        supabase
          .schema("core")
          .from("telegram_accounts")
          .select("username, notify")
          .maybeSingle(),
      ]);
      const username = unwrap(setting)?.value;
      return {
        account: unwrap(account),
        bot: typeof username === "string" && username ? username : null,
      };
    },
    queryKey: key,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: key });

  const connect = useMutation({
    mutationFn: async () => {
      const code = unwrap(
        await supabase.schema("core").rpc("telegram_link_code")
      );
      return `https://t.me/${status.data?.bot}?start=link_${code}`;
    },
    onSuccess: setStartLink,
  });
  const notify = useMutation({
    mutationFn: async (on: boolean) =>
      unwrap(
        await supabase
          .schema("core")
          .from("telegram_accounts")
          .update({ notify: on })
          .eq("user_id", user?.id ?? "")
      ),
    onSuccess: refresh,
  });
  const unlink = useMutation({
    mutationFn: async () =>
      unwrap(
        await supabase
          .schema("core")
          .from("telegram_accounts")
          .delete()
          .eq("user_id", user?.id ?? "")
      ),
    onSuccess: async () => {
      setStartLink(null);
      await refresh();
    },
  });

  if (!status.data?.bot) {
    return null;
  }
  const { account } = status.data;
  const failed = connect.isError || notify.isError || unlink.isError;

  return (
    <div className="grid gap-3" id="telegram">
      <h2 className="type-subheading">{t("title")}</h2>
      <p className="type-body">{t("description")}</p>
      {account ? (
        <>
          <p className="type-caption">
            {account.username
              ? t("linkedAs", { username: account.username })
              : t("linked")}{" "}
            {account.notify ? t("noticesOn") : t("noticesOff")}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              disabled={notify.isPending}
              onClick={() => notify.mutate(!account.notify)}
              variant="outline"
            >
              {account.notify ? t("turnOff") : t("turnOn")}
            </Button>
            <Button
              disabled={unlink.isPending}
              onClick={() => unlink.mutate()}
              variant="outline"
            >
              {t("unlink")}
            </Button>
          </div>
        </>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          {startLink ? (
            <>
              <Button asChild>
                <a href={startLink} rel="noopener" target="_blank">
                  {t("open")}
                </a>
              </Button>
              <p className="type-caption">{t("codeHint")}</p>
            </>
          ) : (
            <Button
              disabled={connect.isPending}
              onClick={() => connect.mutate()}
            >
              {t("connect")}
            </Button>
          )}
        </div>
      )}
      {failed ? (
        <p className="text-title" role="alert">
          {t("failed")}
        </p>
      ) : null}
    </div>
  );
};
