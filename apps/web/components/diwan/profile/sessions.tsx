"use client";

import { Button } from "@repo/brand/components/ui/button";
import type { Locale } from "@repo/internationalization";
import { formatDateTime } from "@repo/internationalization/format";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useAuth } from "@/lib/auth/provider";
import { unwrap } from "@/lib/data";
import { deviceName } from "@/lib/device";
import { DiwanSection, RowList } from "../page";

const KEY = ["my-sessions"];

/**
 * The devices signed in to the account, with "Sign out everywhere else"
 * (decisions.md, Members). A sign-in from a new kind of device also sends
 * an email (core.known_devices).
 */
export const Sessions = () => {
  const t = useTranslations("diwan.settings.sessions");
  const locale = useLocale() as Locale;
  const { supabase } = useAuth();
  const queryClient = useQueryClient();
  const sessions = useQuery({
    queryFn: async () =>
      unwrap(await supabase.schema("core").rpc("my_sessions")) ?? [],
    queryKey: KEY,
  });
  const others = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut({ scope: "others" });
      if (error) {
        throw error;
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
  const rows = sessions.data ?? [];
  return (
    <DiwanSection description={t("lede")} id="sessions" title={t("title")}>
      <RowList>
        {rows.map((session) => (
          <li className="grid gap-1" key={session.id}>
            <p className="font-medium">
              {deviceName(session.user_agent)}
              {session.current ? ` · ${t("this")}` : ""}
            </p>
            <p className="type-caption">
              {t("lastSeen", {
                when: formatDateTime(session.last_seen, locale),
              })}
            </p>
          </li>
        ))}
      </RowList>
      {rows.length > 1 ? (
        <Button
          className="justify-self-start"
          disabled={others.isPending}
          onClick={() => others.mutate()}
          variant="outline"
        >
          {t("signOutOthers")}
        </Button>
      ) : null}
      {others.isSuccess ? (
        <p className="type-body" role="status">
          {t("done")}
        </p>
      ) : null}
      {others.isError ? (
        <p className="type-body font-medium" role="alert">
          {t("failed")}
        </p>
      ) : null}
    </DiwanSection>
  );
};
