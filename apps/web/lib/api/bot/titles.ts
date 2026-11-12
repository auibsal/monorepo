import "server-only";

import type { Api } from "grammy";
import { GrammyError } from "grammy";
import { db, type Group, groups } from "./db";

/** Telegram's limit on an admin's custom title. */
const TITLE_MAX = 16;

interface Holder {
  telegram_id: number;
  title_ar: string;
  title_en: string;
}

interface Given {
  chat_id: number;
  ended_at: string | null;
  telegram_id: number;
  title: string;
}

/** The Diwan group lets a former role holder go 7 days after (decisions.md). */
const GRACE_MS = 7 * 24 * 60 * 60 * 1000;

/** Words a cut title doesn't end on ("Director of" → "Director"). */
const DANGLING = /\s+(?:of|the|and|for|to|in|at|on)$/iu;

/**
 * A seat's title as Telegram allows it: 16 characters at most, cut at a
 * word when it is longer ("Director of Partnerships" → "Director").
 */
export const shortTitle = (title: string) => {
  const clean = title.replace(/\s+/gu, " ").trim();
  if (clean.length <= TITLE_MAX) {
    return clean;
  }
  const cut = clean.slice(0, TITLE_MAX + 1);
  const space = cut.lastIndexOf(" ");
  let short = (
    space > 0 ? cut.slice(0, space) : clean.slice(0, TITLE_MAX)
  ).trim();
  while (DANGLING.test(short)) {
    short = short.replace(DANGLING, "");
  }
  return short;
};

const titles = () => db().schema("core").from("telegram_titles");

/** Ignores Telegram's "not there" and "nothing changed" answers. */
const quietly = async (call: Promise<unknown>) => {
  try {
    await call;
    return true;
  } catch (error) {
    if (error instanceof GrammyError && error.error_code === 400) {
      return false;
    }
    throw error;
  }
};

/** Linked role holders, and (members' group only) the exempt list, tagged
 * "Student Life" (decisions.md); its labels may hold names, so they are
 * never shown. The Faculty Advisor holds a role and carries that tag. */
const holders = async () => {
  const [roles, exempt] = await Promise.all([
    db().schema("core").rpc("telegram_role_titles"),
    db().schema("core").from("telegram_exempt").select("telegram_id"),
  ]);
  if (roles.error ?? exempt.error) {
    throw roles.error ?? exempt.error;
  }
  return {
    exempt: (exempt.data ?? []).map((e) => ({
      telegram_id: Number(e.telegram_id),
      title_ar: "شؤون الطلبة",
      title_en: "Student Life",
    })),
    roles: (roles.data ?? []) as Holder[],
  };
};

/**
 * Gives one person their tag in a group they are in. Only ordinary members
 * carry tags: the group's admins (added by hand, decisions.md) keep the
 * titles the officers give them.
 */
const give = async (
  api: Api,
  group: Group,
  holder: Holder,
  before: Given | undefined
) => {
  const title = shortTitle(
    group.lang === "ar" ? holder.title_ar : holder.title_en
  );
  if (before && before.title === title && !before.ended_at) {
    return false;
  }
  const standing = await api
    .getChatMember(group.chat_id, holder.telegram_id)
    .catch(() => null);
  if (standing?.status !== "member") {
    return false;
  }
  if (
    !(await quietly(
      api.setChatMemberTag(group.chat_id, holder.telegram_id, title)
    ))
  ) {
    return false;
  }
  await titles().upsert({
    chat_id: group.chat_id,
    ended_at: null,
    set_at: new Date().toISOString(),
    telegram_id: holder.telegram_id,
    title,
  });
  return true;
};

/**
 * The last role has ended: the tag comes off at once; in the Diwan group
 * the person is let go 7 days later (a ban lifted at once, so they can come
 * back with a new role).
 */
const takeBack = async (api: Api, group: Group, given: Given) => {
  if (!given.ended_at) {
    await quietly(api.setChatMemberTag(group.chat_id, given.telegram_id, ""));
    if (group.audience === "staff") {
      await titles()
        .update({ ended_at: new Date().toISOString() })
        .eq("chat_id", group.chat_id)
        .eq("telegram_id", given.telegram_id);
      return true;
    }
  } else if (Date.now() - Date.parse(given.ended_at) < GRACE_MS) {
    return false;
  } else {
    await quietly(api.banChatMember(group.chat_id, given.telegram_id));
    await quietly(
      api.unbanChatMember(group.chat_id, given.telegram_id, {
        only_if_banned: true,
      })
    );
  }
  await titles()
    .delete()
    .eq("chat_id", group.chat_id)
    .eq("telegram_id", given.telegram_id);
  return true;
};

/**
 * Every run of the Telegram cron: each linked role holder carries their
 * seat as their member tag in each connected group they are in (the
 * exempt list its label, in the members' group), and loses it when their
 * last role ends; the Diwan group lets them go 7 days later. Only those
 * Hudhud tagged are ever changed.
 */
export const runTitles = async (api: Api) => {
  const [all, people, { data: given, error }] = await Promise.all([
    groups(),
    holders(),
    titles().select("chat_id, telegram_id, title, ended_at"),
  ]);
  if (error) {
    throw error;
  }
  // Each group in turn, each person in a group at once (a few dozen at most).
  const perGroup = all.map(async (group) => {
    const tagged =
      group.audience === "staff"
        ? people.roles
        : [...people.roles, ...people.exempt];
    const ids = new Set(tagged.map((h) => Number(h.telegram_id)));
    const here = (given ?? []).filter(
      (g) => Number(g.chat_id) === group.chat_id
    ) as Given[];
    const ended = here.filter((g) => !ids.has(Number(g.telegram_id)));
    const out = await Promise.all(ended.map((g) => takeBack(api, group, g)));
    const done = await Promise.all(
      tagged.map((holder) =>
        give(
          api,
          group,
          holder,
          here.find((g) => Number(g.telegram_id) === Number(holder.telegram_id))
        )
      )
    );
    return out.filter(Boolean).length + done.filter(Boolean).length;
  });
  const counts = await Promise.all(perGroup);
  return counts.reduce((sum, n) => sum + n, 0);
};

/**
 * Each connected group gets one join-request link Hudhud made, kept with
 * the group so the site and the bot can offer it. Hudhud lets members (or
 * role holders, in the Diwan group) in at once; others wait for an admin.
 */
export const ensureInviteLinks = async (api: Api) => {
  const { data, error } = await db()
    .schema("core")
    .from("telegram_groups")
    .select("chat_id, audience")
    .is("invite_link", null);
  if (error) {
    throw error;
  }
  const made = await Promise.all(
    (data ?? []).map(async (row) => {
      const link = await api
        .createChatInviteLink(Number(row.chat_id), {
          creates_join_request: true,
          name: "Hudhud",
        })
        .catch(() => null);
      if (!link) {
        return false;
      }
      await db()
        .schema("core")
        .from("telegram_groups")
        .update({ invite_link: link.invite_link })
        .eq("chat_id", row.chat_id);
      return true;
    })
  );
  return made.filter(Boolean).length;
};

/** The groups a linked account may join, with their links. */
export const joinLinks = async (telegramId: number) => {
  const { data: account } = await db()
    .schema("core")
    .from("telegram_accounts")
    .select("user_id")
    .eq("telegram_id", telegramId)
    .maybeSingle();
  if (!account) {
    return [];
  }
  const { data, error } = await db()
    .schema("core")
    .rpc("telegram_join_links_for", { member: account.user_id });
  if (error) {
    throw error;
  }
  return (data ?? []) as { audience: string; invite_link: string }[];
};
