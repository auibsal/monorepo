import type { Api } from "grammy";
import { db } from "./db";

/**
 * A person's membership of the Society's Telegram groups, as Telegram
 * reports it (decisions.md, Where things live: "checked against the thing
 * itself"): kept in core.telegram_memberships, confirmed when Today asks,
 * on each approval and on every chat_member update, and cleared when they
 * leave or are removed. The checklist and Hudhud's removals read it.
 */

/** Telegram's statuses that mean the person is in the group. */
const IN_GROUP = new Set(["creator", "administrator", "member", "restricted"]);

/** No Telegram call holds a page or a webhook longer than this. */
export const TELEGRAM_TIMEOUT_MS = 4000;

type Status = "administrator" | "creator" | "member" | "restricted";

/**
 * A signal that gives up after the timeout, typed for grammY (which names
 * the abort-controller package's AbortSignal, the same object at runtime).
 */
export const telegramSignal = (ms = TELEGRAM_TIMEOUT_MS) =>
  AbortSignal.timeout(ms) as never;

const memberships = () => db().schema("api").from("telegram_memberships");

/** Records that someone is in a group (or, with `null`, that they left). */
export const recordMembership = async (
  chatId: number,
  telegramId: number,
  status: string | null
) => {
  if (status && IN_GROUP.has(status)) {
    await memberships().upsert(
      {
        chat_id: chatId,
        checked_at: new Date().toISOString(),
        status: status as Status,
        telegram_id: telegramId,
      },
      { onConflict: "chat_id,telegram_id" }
    );
    return true;
  }
  await memberships()
    .delete()
    .eq("chat_id", chatId)
    .eq("telegram_id", telegramId);
  return false;
};

/**
 * Asks Telegram whether someone is in a group, within the timeout, and
 * keeps the answer. A restricted person still in the group counts. When
 * Telegram doesn't answer in time, the record stays as it was and the
 * answer is `null`.
 */
export const confirmMembership = async (
  api: Api,
  chatId: number,
  telegramId: number
): Promise<boolean | null> => {
  try {
    const member = await api.getChatMember(
      chatId,
      telegramId,
      telegramSignal()
    );
    const inGroup = member.status === "restricted" ? member.is_member : true;
    return await recordMembership(
      chatId,
      telegramId,
      inGroup ? member.status : null
    );
  } catch {
    return null;
  }
};
