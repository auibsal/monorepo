import { MAX_GUESSES } from "@repo/sal-data/games";
import { Composer, InlineKeyboard } from "grammy";
import type { BotContext } from "../context";
import type { Lang } from "../copy";
import { db } from "../db";
import { wordPage } from "../links";
import {
  board,
  finished,
  type Round,
  readGuess,
  shareGrid,
  solved,
  today,
} from "../word";

/**
 * The daily word in a private chat. A play starts with /word (or the Play
 * button in the group); while it is open, a five-letter message is a guess.
 * Plays are kept for a week (sal-telegram-tidy).
 */
export const word = new Composer<BotContext>();
const dm = word.chatType("private");

interface Play {
  guesses: string[];
  lang: Lang;
}

const loadPlay = async (telegramId: number, round: Round, lang: Lang) => {
  const { data } = await db()
    .schema("core")
    .from("telegram_word_plays")
    .select("guesses, lang")
    .eq("telegram_id", telegramId)
    .eq("day", round.day)
    .eq("lang", lang)
    .maybeSingle();
  return data as Play | null;
};

/** The open play today, in whichever language it was started. */
const openPlay = async (telegramId: number) => {
  const { data } = await db()
    .schema("core")
    .from("telegram_word_plays")
    .select("guesses, lang, day")
    .eq("telegram_id", telegramId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) {
    return null;
  }
  const lang = data.lang as Lang;
  const round = today(lang);
  if (data.day !== round.day || finished(round.answer, data.guesses)) {
    return null;
  }
  return { play: { guesses: data.guesses, lang } as Play, round };
};

const status = (ctx: BotContext, round: Round, play: Play) => {
  const { t } = ctx;
  const n = String(round.number);
  const lines = [t.wordIntro(n)];
  if (play.guesses.length) {
    lines.push(
      "",
      `<pre>${board(round.answer, play.guesses, play.lang)}</pre>`
    );
  }
  if (solved(round.answer, play.guesses)) {
    lines.push(
      "",
      t.wordWon(String(play.guesses.length)),
      "",
      `<pre>${t.wordShare(n, String(play.guesses.length))}\n${shareGrid(round.answer, play.guesses)}</pre>`,
      t.wordNext
    );
  } else if (play.guesses.length >= MAX_GUESSES) {
    lines.push(
      "",
      t.wordLost(round.answer.join("")),
      "",
      `<pre>${t.wordShare(n, "X")}\n${shareGrid(round.answer, play.guesses)}</pre>`,
      t.wordNext
    );
  } else {
    lines.push(
      "",
      t.wordLegend,
      t.wordLeft(String(MAX_GUESSES - play.guesses.length))
    );
  }
  return lines.join("\n");
};

const keyboard = (ctx: BotContext, lang: Lang) =>
  new InlineKeyboard().url(ctx.t.buttons.site, wordPage(lang));

/** /word, /word ar, /word en: start or show today's word. */
export const startWord = async (ctx: BotContext, wanted?: string) => {
  if (!ctx.from) {
    return;
  }
  await ctx.account();
  const lang: Lang = wanted === "ar" || wanted === "en" ? wanted : ctx.lang;
  const round = today(lang);
  let play = await loadPlay(ctx.from.id, round, lang);
  if (!play) {
    await db()
      .schema("core")
      .from("telegram_word_plays")
      .upsert(
        { day: round.day, guesses: [], lang, telegram_id: ctx.from.id },
        { ignoreDuplicates: true, onConflict: "telegram_id,day,lang" }
      );
    play = { guesses: [], lang };
  }
  const text = finished(round.answer, play.guesses)
    ? `${status(ctx, round, play)}\n\n${ctx.t.wordDone}`
    : `${status(ctx, round, play)}\n${lang === "ar" ? ctx.t.wordInEnglish : ctx.t.wordInArabic}`;
  await ctx.reply(text, { reply_markup: keyboard(ctx, lang) });
};

dm.command("word", (ctx) => startWord(ctx, ctx.match.trim().toLowerCase()));

dm.callbackQuery("word", async (ctx) => {
  await ctx.answerCallbackQuery();
  await startWord(ctx);
});

// A plain message while a play is open is a guess.
dm.on("message:text", async (ctx, next) => {
  if (ctx.msg.text.startsWith("/")) {
    return next();
  }
  const open = await openPlay(ctx.from.id);
  if (!open) {
    return next();
  }
  await ctx.account();
  const { play, round } = open;
  const letters = readGuess(ctx.msg.text, play.lang);
  if (!letters) {
    await ctx.reply(
      play.lang === "ar" ? ctx.t.wordInvalidArabic : ctx.t.wordInvalidLatin
    );
    return;
  }
  const guesses = [...play.guesses, letters.join("")];
  await db()
    .schema("core")
    .from("telegram_word_plays")
    .update({ guesses })
    .eq("telegram_id", ctx.from.id)
    .eq("day", round.day)
    .eq("lang", play.lang);
  await ctx.reply(status(ctx, round, { guesses, lang: play.lang }), {
    reply_markup: finished(round.answer, guesses)
      ? keyboard(ctx, play.lang)
      : undefined,
  });
});
