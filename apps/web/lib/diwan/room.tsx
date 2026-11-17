"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "@/lib/auth/provider";
import { useProfile } from "@/lib/diwan/queries";

/** The records with a room (private.can_edit_room). */
export type RoomKind = "announcement" | "event" | "minutes" | "piece";

interface Editor {
  readonly name: string;
  readonly section: string;
  readonly user: string;
}

interface Room {
  /** Others editing, by section. */
  readonly editors: readonly Editor[];
  readonly saved: () => void;
  /** Sections someone else saved since this person opened them. */
  readonly savedElsewhere: number;
  readonly track: (section: string | null) => void;
}

const RoomContext = createContext<Room | null>(null);

/**
 * A record's room (decisions.md, The site: Realtime where people share a
 * screen): a private channel, joined only by those who may edit the
 * record, carrying who is editing which section and that someone saved.
 */
export const RecordRoom = ({
  children,
  id,
  kind,
}: {
  readonly children: ReactNode;
  readonly id: string;
  readonly kind: RoomKind;
}) => {
  const { supabase, user } = useAuth();
  const profile = useProfile();
  const locale = useLocale();
  const queryClient = useQueryClient();
  const [editors, setEditors] = useState<Editor[]>([]);
  const [savedElsewhere, setSavedElsewhere] = useState(0);
  const channel = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const name =
    (locale === "ar" ? profile.data?.full_name_ar : null) ??
    profile.data?.full_name_en ??
    "";

  useEffect(() => {
    if (!user) {
      return;
    }
    let live = true;
    supabase.realtime
      .setAuth()
      .then(() => {
        if (!live) {
          return;
        }
        const room = supabase.channel(`sal:${kind}:${id}`, {
          config: { presence: { key: user.id }, private: true },
        });
        room
          .on("presence", { event: "sync" }, () => {
            const state = room.presenceState<Editor>();
            setEditors(
              Object.values(state)
                .flat()
                .filter((e) => e.user !== user.id && e.section)
            );
          })
          .on("broadcast", { event: "saved" }, () => {
            setSavedElsewhere((n) => n + 1);
            queryClient.invalidateQueries();
          })
          .subscribe();
        channel.current = room;
      })
      .catch(() => undefined);
    return () => {
      live = false;
      if (channel.current) {
        supabase.removeChannel(channel.current);
        channel.current = null;
      }
    };
  }, [id, kind, queryClient, supabase, user]);

  const track = useCallback(
    (section: string | null) => {
      const room = channel.current;
      if (!(room && user)) {
        return;
      }
      if (section) {
        room.track({ name, section, user: user.id });
      } else {
        room.untrack();
      }
    },
    [name, user]
  );
  const saved = useCallback(() => {
    channel.current?.send({
      event: "saved",
      payload: {},
      type: "broadcast",
    });
  }, []);
  const value = useMemo(
    () => ({ editors, saved, savedElsewhere, track }),
    [editors, saved, savedElsewhere, track]
  );
  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
};

/** The record's room, when the page has one. */
export const useRoom = () => useContext(RoomContext);
