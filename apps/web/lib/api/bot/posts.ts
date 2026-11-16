import { type Api, GrammyError } from "grammy";
import type { Lang } from "./copy";
import { db, type Group } from "./db";
import { groupText } from "./features/group/common";
import { forClaim, QUEUED_ID } from "./queue";

/**
 * Hudhud's post log and the helpers every feed shares (decisions.md,
 * Hudhud): each post is claimed in core.telegram_posts before it is sent,
 * so overlapping runs never post twice. Kept apart from feeds.ts so the
 * staff feeds and the upkeep job import it without an import cycle.
 */

export type Kind =
  | "event"
  | "event_soon"
  | "piece"
  | "word"
  | "brief"
  | "event_summary"
  | "announcement"
  | "sunday_note"
  | "paper"
  | "description"
  | "stream"
  | "doors"
  | "vote_open"
  | "vote_closing"
  | "last_call"
  | "edition";

export const posts = () => db().schema("api").from("telegram_posts");

const claim = async (chatId: number, kind: Kind, ref: string) => {
  const { data } = await posts()
    .upsert(
      { chat_id: chatId, kind, ref },
      { ignoreDuplicates: true, onConflict: "chat_id,kind,ref" }
    )
    .select("ref");
  return Boolean(data?.length);
};

export const release = (chatId: number, kind: Kind, ref: string) =>
  posts().delete().eq("chat_id", chatId).eq("kind", kind).eq("ref", ref);

export const posted = async (chatId: number, kind: Kind, ref: string) => {
  const { data } = await posts()
    .select("message_id")
    .eq("chat_id", chatId)
    .eq("kind", kind)
    .eq("ref", ref)
    .maybeSingle();
  return data?.message_id ?? undefined;
};

/** Claims, sends and records one post. Returns whether it went out. */
export const once = async (
  group: Group,
  kind: Kind,
  ref: string,
  send: () => Promise<{ message_id: number } | null>
) => {
  if (!(await claim(group.chat_id, kind, ref))) {
    return false;
  }
  try {
    const message = await forClaim({ chat_id: group.chat_id, kind, ref }, send);
    if (!message) {
      await release(group.chat_id, kind, ref);
      return false;
    }
    if (message.message_id === QUEUED_ID) {
      // Queued: the sender records the id once Telegram has it.
      return true;
    }
    await posts()
      .update({ message_id: message.message_id })
      .eq("chat_id", group.chat_id)
      .eq("kind", kind)
      .eq("ref", ref);
    return true;
  } catch (error) {
    await release(group.chat_id, kind, ref);
    if (error instanceof GrammyError) {
      console.warn("Group post failed", group.chat_id, kind, error.description);
      return false;
    }
    throw error;
  }
};

export const copyFor = (group: Group, build: (lang: Lang) => string) =>
  groupText(group, (_t, lang) => build(lang));

/** Links in a group post: Arabic pages for Arabic groups, else English. */
export const linkLang = (group: Group): Lang =>
  group.lang === "ar" ? "ar" : "en";

export interface Run {
  api: Api;
  group: Group;
  now: Date;
  username: string;
}

const hourFormat = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  hourCycle: "h23",
  timeZone: "Asia/Baghdad",
});

export const baghdadHour = (date: Date) => Number(hourFormat.format(date));

const dateFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Baghdad",
});

/** The day in Baghdad, as yyyy-mm-dd. */
export const baghdadDate = (date: Date) => dateFormat.format(date);
