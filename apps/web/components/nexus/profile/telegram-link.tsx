"use client";

import { useAuth } from "@repo/auth/provider";
import { SalCard } from "@repo/design-system/components/sal/card";
import { Button } from "@repo/design-system/components/ui/button";
import { unwrap } from "@repo/sal-data";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { callApi } from "@/lib/nexus/api";

const key = ["profile", "telegram"];
const PENDING = "sal.telegram-login";

const base64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");

const randomString = () =>
  base64url(crypto.getRandomValues(new Uint8Array(32)));

/** PKCE (RFC 7636): a verifier kept here, its S256 challenge sent out. */
const pkce = async () => {
  const verifier = randomString();
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier)
  );
  return { challenge: base64url(new Uint8Array(digest)), verifier };
};

/** This page without its query or hash: the address Telegram returns to. */
const returnAddress = () =>
  `${window.location.origin}${window.location.pathname}`;

/**
 * Profile and privacy: linking Telegram to Hudhud, the Society's bot. With
 * Telegram's login set up (the API routes), Connect sends the member to Telegram
 * to confirm and back here, and the API routes link the account it verified.
 * Otherwise the Nexus makes a one-time code (15 minutes) and opens the bot
 * with it. Only links: signing in to the Nexus stays email only. Hidden
 * until the bot's username is set in Settings.
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
      const state = randomString();
      const { challenge, verifier } = await pkce();
      const { url } = await callApi<{ url: string | null }>(
        supabase,
        "/telegram/link",
        { codeChallenge: challenge, redirectUri: returnAddress(), state }
      );
      if (url) {
        sessionStorage.setItem(PENDING, JSON.stringify({ state, verifier }));
        window.location.assign(url);
        return null;
      }
      // Telegram's login isn't set up: the bot's one-time code instead.
      const code = unwrap(
        await supabase.schema("core").rpc("telegram_link_code")
      );
      return `https://t.me/${status.data?.bot}?start=link_${code}`;
    },
    onSuccess: setStartLink,
  });

  // Back from Telegram with ?code=…&state=…: tidy the address first, so a
  // reload or a second run of this effect doesn't try again, then finish.
  const finish = useMutation({
    mutationFn: async ({
      code,
      verifier,
    }: {
      code: string;
      verifier: string;
    }) => {
      await callApi(supabase, "/telegram/link", {
        code,
        codeVerifier: verifier,
        redirectUri: returnAddress(),
      });
    },
    onSuccess: refresh,
  });
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    if (!(state && (code || params.has("error")))) {
      return;
    }
    const saved = sessionStorage.getItem(PENDING);
    sessionStorage.removeItem(PENDING);
    window.history.replaceState(null, "", `${returnAddress()}#telegram`);
    const pending = saved
      ? (JSON.parse(saved) as { state?: string; verifier?: string })
      : null;
    if (code && pending?.verifier && pending.state === state) {
      finish.mutate({ code, verifier: pending.verifier });
    }
  }, [finish]);
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
  const failed =
    connect.isError || finish.isError || notify.isError || unlink.isError;

  return (
    <SalCard>
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
                disabled={connect.isPending || finish.isPending}
                onClick={() => connect.mutate()}
              >
                {finish.isPending ? t("linking") : t("connect")}
              </Button>
            )}
            {startLink ? null : (
              <p className="type-caption">{t("loginHint")}</p>
            )}
          </div>
        )}
        {failed ? (
          <p className="text-text" role="alert">
            {t("failed")}
          </p>
        ) : null}
      </div>
    </SalCard>
  );
};
