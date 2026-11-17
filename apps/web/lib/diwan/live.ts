"use client";

import { type QueryKey, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth/provider";

/** The zero id: topics with one room for everyone allowed. */
const EVERYONE = "00000000-0000-0000-0000-000000000000";

/** The private topics the database feeds (the live_where_shared migration). */
export const liveTopics = {
  checkIn: (eventId: string) => `sal:checkin:${eventId}`,
  desk: () => `sal:desk:${EVERYONE}`,
  me: (userId: string) => `sal:me:${userId}`,
  newsroom: () => `sal:newsroom:${EVERYONE}`,
  reading: (userId: string) => `sal:reading:${userId}`,
} as const;

/**
 * Live where people share a screen (decisions.md, The site): a private
 * Realtime channel, joined only when RLS lets this person receive it, that
 * says what changed (ids and counts) so the page fetches it again. The
 * public pages never subscribe; everywhere else refreshes on focus and
 * after each save.
 */
export const useLive = (topic: string | null, refresh: readonly QueryKey[]) => {
  const { supabase, user } = useAuth();
  const queryClient = useQueryClient();
  const keys = JSON.stringify(refresh);
  useEffect(() => {
    if (!(topic && user)) {
      return;
    }
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let live = true;
    supabase.realtime
      .setAuth()
      .then(() => {
        if (!live) {
          return;
        }
        channel = supabase
          .channel(topic, { config: { private: true } })
          .on("broadcast", { event: "*" }, () => {
            for (const key of JSON.parse(keys) as QueryKey[]) {
              queryClient.invalidateQueries({ queryKey: key });
            }
          })
          .subscribe();
      })
      .catch(() => undefined);
    return () => {
      live = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [keys, queryClient, supabase, topic, user]);
};
