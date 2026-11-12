import "server-only";

import type { Api } from "grammy";
import { GrammyError } from "grammy";
import { db, type Group, groups } from "./db";

/** Telegram's limit on an admin's custom title. */
const TITLE_MAX = 16;

interface Holder {
  council: boolean;
  telegram_id: number;
  title_ar: string;
  title_en: string;
}

interface Given {
  chat_id: number;
  council: boolean;
  telegram_id: number;
  title: string;
}

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

/**
 * What a Council seat may do as an admin: moderate (delete, restrict, pin,
 * topics, members' tags), invite, and run the group's live streams and
 * stories. Never the group's info or new admins: those stay with the
 * group's owner.
 */
const councilRights = {
  can_change_info: false,
  can_delete_messages: true,
  can_delete_stories: true,
  can_edit_stories: true,
  can_invite_users: true,
  can_manage_chat: true,
  can_manage_tags: true,
  can_manage_topics: true,
  can_manage_video_chats: true,
  can_pin_messages: true,
  can_post_stories: true,
  can_promote_members: false,
  can_restrict_members: true,
};

/** No rights at all: Telegram makes the admin a member again. */
const noRights = Object.fromEntries(
  Object.keys(councilRights).map((k) => [k, false])
) as Record<keyof typeof councilRights, false>;

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

const holders = async () => {
  const { data, error } = await db().schema("core").rpc("telegram_role_titles");
  if (error) {
    throw error;
  }
  return (data ?? []) as Holder[];
};

/** A Council seat: an admin with the seat as the admin title. */
const makeAdmin = async (api: Api, chatId: number, id: number, title: string) =>
  (await quietly(api.promoteChatMember(chatId, id, councilRights))) &&
  (await quietly(api.setChatAdministratorCustomTitle(chatId, id, title)));

/** Any other role: the seat as the member's tag, no admin rights. */
const makeTagged = async (
  api: Api,
  chatId: number,
  id: number,
  title: string,
  wasAdmin: boolean
) => {
  if (wasAdmin) {
    await quietly(api.promoteChatMember(chatId, id, noRights));
  }
  return quietly(api.setChatMemberTag(chatId, id, title));
};

/** Gives one role holder their seat in a group they are in. The group's
 * own admins (and its creator) are the owner's and are left alone. */
const give = async (
  api: Api,
  group: Group,
  holder: Holder,
  before: Given | undefined
) => {
  const title = shortTitle(
    group.lang === "ar" ? holder.title_ar : holder.title_en
  );
  if (before && before.title === title && before.council === holder.council) {
    return false;
  }
  const standing = await api
    .getChatMember(group.chat_id, holder.telegram_id)
    .catch(() => null);
  if (
    !standing ||
    ["left", "kicked", "creator"].includes(standing.status) ||
    (standing.status === "administrator" && !standing.can_be_edited)
  ) {
    return false;
  }
  const done = holder.council
    ? await makeAdmin(api, group.chat_id, holder.telegram_id, title)
    : await makeTagged(
        api,
        group.chat_id,
        holder.telegram_id,
        title,
        standing.status === "administrator"
      );
  if (!done) {
    return false;
  }
  await titles().upsert({
    chat_id: group.chat_id,
    council: holder.council,
    set_at: new Date().toISOString(),
    telegram_id: holder.telegram_id,
    title,
  });
  return true;
};

/** Takes the seat back when the role has ended; out of the Diwan group too. */
const takeBack = async (api: Api, group: Group, given: Given) => {
  await (given.council
    ? quietly(api.promoteChatMember(group.chat_id, given.telegram_id, noRights))
    : quietly(api.setChatMemberTag(group.chat_id, given.telegram_id, "")));
  if (group.audience === "staff") {
    // A ban lifted at once: out of the group, free to come back later.
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
};

/**
 * Every run of the Telegram cron: role holders carry their seat in each
 * connected group they are in (the Council as admins with the seat as
 * their title, everyone else as their member tag), and lose it (and their
 * place in the Diwan group) when the role ends. Only those Hudhud set are
 * ever changed.
 */
export const runTitles = async (api: Api) => {
  const [all, people, { data: given, error }] = await Promise.all([
    groups(),
    holders(),
    titles().select("chat_id, telegram_id, title, council"),
  ]);
  if (error) {
    throw error;
  }
  const byId = new Map(people.map((p) => [Number(p.telegram_id), p]));
  // Each group in turn, each person in a group at once (a few dozen at most).
  const perGroup = all.map(async (group) => {
    const here = (given ?? []).filter(
      (g) => Number(g.chat_id) === group.chat_id
    ) as Given[];
    const ended = here.filter((g) => !byId.has(Number(g.telegram_id)));
    await Promise.all(ended.map((g) => takeBack(api, group, g)));
    const done = await Promise.all(
      people.map((holder) =>
        give(
          api,
          group,
          holder,
          here.find((g) => Number(g.telegram_id) === Number(holder.telegram_id))
        )
      )
    );
    return ended.length + done.filter(Boolean).length;
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
