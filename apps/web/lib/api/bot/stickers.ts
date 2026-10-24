import { project } from "@repo/config";
import type { BotContext } from "./context";

/**
 * Hudhud's stickers after a reply (brand/mascot/stickers): 02 for a place
 * booked, 05 for nothing new, 06 for work sent, 07 for an error. Only ever
 * after the text, at most one per reply, and only in a private chat, so
 * never in a group unprompted. The file_ids come from config and stay empty
 * until the "Hudhud · SAL" set exists; an empty one sends nothing.
 */
export type Sticker = keyof typeof project.telegram.stickers;

export const stickerId = (sticker: Sticker) =>
  project.telegram.stickers[sticker] || null;

export const followWithSticker = async (ctx: BotContext, sticker: Sticker) => {
  const id = stickerId(sticker);
  if (!id || ctx.chat?.type !== "private") {
    return;
  }
  try {
    await ctx.replyWithSticker(id);
  } catch {
    // A sticker is a flourish: the reply has already been sent.
  }
};
