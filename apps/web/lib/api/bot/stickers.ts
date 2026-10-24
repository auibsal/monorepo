import { project } from "@repo/config";
import type { BotContext } from "./context";

/**
 * Hudhud's stickers after a reply (brand/mascot/stickers): 02 for a place
 * booked, 05 for nothing new, 06 for work sent, 07 for an error. Only ever
 * after the text, at most one per reply, and only in a private chat, so
 * never in a group unprompted.
 *
 * The bot reads the set named in config (t.me/addstickers/auibsal) once per
 * instance and picks each sticker by the emoji paired with it in
 * brand/mascot/README.md, or else by its place in the set (01–12). If the
 * set can't be read, nothing extra is sent.
 */
const PICKS = {
  asleep: { emoji: "😴", index: 4 },
  sent: { emoji: "✉", index: 5 },
  sorry: { emoji: "😓", index: 6 },
  youreIn: { emoji: "🎉", index: 1 },
} as const;

export type Sticker = keyof typeof PICKS;

export interface StickerSet {
  stickers: { emoji?: string; file_id: string }[];
}

/** Reads a sticker set by name (the Bot API's getStickerSet). */
export type LoadSet = (name: string) => Promise<StickerSet>;

// Telegram may store an emoji with or without the variation selector.
const bare = (emoji = "") => emoji.replace(/️/g, "");

/** Each sticker's file_id in the set, by its emoji or its place. */
export const pickStickers = (set: StickerSet) =>
  Object.fromEntries(
    Object.entries(PICKS).map(([name, pick]) => [
      name,
      set.stickers.find((s) => bare(s.emoji) === pick.emoji)?.file_id ??
        set.stickers[pick.index]?.file_id ??
        null,
    ])
  ) as Record<Sticker, string | null>;

let cached: Promise<Record<Sticker, string | null>> | undefined;

export const stickerId = async (sticker: Sticker, load: LoadSet) => {
  const name = project.telegram.stickerSet;
  if (!name) {
    return null;
  }
  cached ??= load(name)
    .then(pickStickers)
    .catch(() => {
      cached = undefined;
      return {} as Record<Sticker, string | null>;
    });
  return (await cached)[sticker] ?? null;
};

/** Forget the set (tests, or after the set changes). */
export const resetStickers = () => {
  cached = undefined;
};

export const followWithSticker = async (ctx: BotContext, sticker: Sticker) => {
  if (ctx.chat?.type !== "private") {
    return;
  }
  try {
    const id = await stickerId(sticker, (name) => ctx.api.getStickerSet(name));
    if (id) {
      await ctx.replyWithSticker(id);
    }
  } catch {
    // A sticker is a flourish: the reply has already been sent.
  }
};
