import { latestPieces } from "@repo/sal-data/journal";
import { escapeHtml, link } from "@repo/telegram";
import { Composer, InlineKeyboard } from "grammy";
import type { BotContext } from "../context";
import type { Lang } from "../copy";
import { anon } from "../db";
import { pick } from "../format";
import { piecePage, web } from "../links";
import { followWithSticker } from "../stickers";

/** What's new in Waraq: the latest public pieces, read on auibsal.org. */
export const waraq = new Composer<BotContext>();

export type Piece = NonNullable<
  Awaited<ReturnType<typeof latestPieces>>
>[number];

export const pieceAuthor = (lang: Lang, piece: Piece) => {
  const contributor = Array.isArray(piece.contributor)
    ? piece.contributor[0]
    : piece.contributor;
  return contributor
    ? pick(lang, contributor.name_en, contributor.name_ar)
    : "";
};

export const publicPieces = async (limit: number) =>
  ((await latestPieces(anon(), limit)) ?? []).filter(
    (piece) => !piece.members_only && piece.published_at
  );

const view = async (ctx: BotContext) => {
  await ctx.account();
  const pieces = await publicPieces(6);
  const keyboard = new InlineKeyboard();
  if (!pieces.length) {
    keyboard.url(ctx.t.buttons.waraq, web(ctx.lang, "/qirtas"));
    return { empty: true, keyboard, text: ctx.t.waraqNone };
  }
  const lines = pieces.map((piece) => {
    const author = pieceAuthor(ctx.lang, piece);
    const title = link(
      piecePage(ctx.lang, piece),
      pick(ctx.lang, piece.title_en, piece.title_ar)
    );
    return author ? `${title}\n${escapeHtml(ctx.t.by(author))}` : title;
  });
  keyboard.url(ctx.t.buttons.waraq, web(ctx.lang, "/qirtas"));
  return {
    empty: false,
    keyboard,
    text: [ctx.t.waraqTitle, "", lines.join("\n\n")].join("\n"),
  };
};

waraq.command("waraq", async (ctx) => {
  const { empty, keyboard, text } = await view(ctx);
  await ctx.reply(text, { reply_markup: keyboard });
  if (empty) {
    await followWithSticker(ctx, "asleep");
  }
});

waraq.chatType("private").callbackQuery("waraq", async (ctx) => {
  const { empty, keyboard, text } = await view(ctx);
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(text, { reply_markup: keyboard });
  if (empty) {
    await followWithSticker(ctx, "asleep");
  }
});
