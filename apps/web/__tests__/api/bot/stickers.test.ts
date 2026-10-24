// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@repo/config", () => ({
  project: { telegram: { stickerSet: "auibsal" } },
}));

import type { BotContext } from "@/lib/api/bot/context";
import {
  followWithSticker,
  pickStickers,
  resetStickers,
  type StickerSet,
} from "@/lib/api/bot/stickers";

// The twelve stickers in the order of brand/mascot/README.md.
const EMOJI = [
  "👋",
  "🎉",
  "📖",
  "🤔",
  "😴",
  "✉️",
  "😓",
  "🙏",
  "✍️",
  "😮",
  "🎟️",
  "❗",
];
const ordered: StickerSet = {
  stickers: EMOJI.map((emoji, i) => ({ emoji, file_id: `id-${i + 1}` })),
};

const context = (type: string, set: StickerSet = ordered) => {
  const replyWithSticker = vi.fn().mockResolvedValue(undefined);
  const getStickerSet = vi.fn().mockResolvedValue(set);
  return {
    ctx: {
      api: { getStickerSet },
      chat: { type },
      replyWithSticker,
    } as unknown as BotContext,
    getStickerSet,
    replyWithSticker,
  };
};

describe("Hudhud's stickers", () => {
  beforeEach(resetStickers);

  it("picks each sticker by its emoji, with or without the selector", () => {
    expect(pickStickers(ordered)).toEqual({
      asleep: "id-5",
      sent: "id-6",
      sorry: "id-7",
      youreIn: "id-2",
    });
  });

  it("falls back to the sticker's place when the emoji differs", () => {
    const plain = {
      stickers: ordered.stickers.map((s) => ({ ...s, emoji: "⭐" })),
    };
    expect(pickStickers(plain).youreIn).toBe("id-2");
  });

  it("follows a private reply with the sticker, reading the set once", async () => {
    const { ctx, getStickerSet, replyWithSticker } = context("private");
    await followWithSticker(ctx, "youreIn");
    await followWithSticker(ctx, "asleep");
    expect(replyWithSticker).toHaveBeenNthCalledWith(1, "id-2");
    expect(replyWithSticker).toHaveBeenNthCalledWith(2, "id-5");
    expect(getStickerSet).toHaveBeenCalledTimes(1);
    expect(getStickerSet).toHaveBeenCalledWith("auibsal");
  });

  it("never posts a sticker in a group", async () => {
    const { ctx, replyWithSticker } = context("supergroup");
    await followWithSticker(ctx, "youreIn");
    expect(replyWithSticker).not.toHaveBeenCalled();
  });

  it("sends nothing when the set can't be read", async () => {
    const { ctx, getStickerSet, replyWithSticker } = context("private");
    getStickerSet.mockRejectedValueOnce(new Error("Bad Request"));
    await followWithSticker(ctx, "sorry");
    expect(replyWithSticker).not.toHaveBeenCalled();
  });
});
