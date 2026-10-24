// @vitest-environment node
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@repo/config", () => ({
  project: {
    telegram: {
      stickers: { asleep: "", sent: "", sorry: "", youreIn: "sticker-02" },
    },
  },
}));

import type { BotContext } from "@/lib/api/bot/context";
import { followWithSticker, stickerId } from "@/lib/api/bot/stickers";

const context = (type: string) => {
  const replyWithSticker = vi.fn().mockResolvedValue(undefined);
  return {
    ctx: { chat: { type }, replyWithSticker } as unknown as BotContext,
    replyWithSticker,
  };
};

describe("Hudhud's stickers", () => {
  it("sends nothing until the set's file_id is in config", async () => {
    expect(stickerId("asleep")).toBeNull();
    const { ctx, replyWithSticker } = context("private");
    await followWithSticker(ctx, "asleep");
    expect(replyWithSticker).not.toHaveBeenCalled();
  });

  it("follows a private reply with the configured sticker", async () => {
    const { ctx, replyWithSticker } = context("private");
    await followWithSticker(ctx, "youreIn");
    expect(replyWithSticker).toHaveBeenCalledWith("sticker-02");
  });

  it("never posts a sticker in a group", async () => {
    const { ctx, replyWithSticker } = context("supergroup");
    await followWithSticker(ctx, "youreIn");
    expect(replyWithSticker).not.toHaveBeenCalled();
  });
});
