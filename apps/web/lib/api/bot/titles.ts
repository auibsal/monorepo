import "server-only";

import type { Api } from "grammy";
import { GrammyError } from "grammy";
import { db, type Group, groups } from "./db";

/** Telegram's limit on a member tag and an admin's custom title. */
const TITLE_MAX = 16;

interface Holder {
  council: boolean;
  officer: boolean;
  telegram_id: number;
  title_ar: string;
  title_en: string;
}

interface Given {
  admin: boolean;
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
      council: false,
      officer: false,
      telegram_id: Number(e.telegram_id),
      title_ar: "شؤون الطلبة",
      title_en: "Student Life",
    })),
    roles: (roles.data ?? []) as Holder[],
  };
};

/**
 * The rights Hudhud gives the admins it makes: every one but Remain
 * Anonymous and Add New Admins, so no admin it makes can make others.
 */
const ADMIN_RIGHTS = {
  can_change_info: true,
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
  can_restrict_members: true,
} as const;

/** Every right off: Telegram's way to make an admin a member again. */
const NO_RIGHTS = Object.fromEntries(
  Object.keys(ADMIN_RIGHTS).map((k) => [k, false])
);

/** Whether a holder is an admin here: the officers in both groups, every
 * Council seat in the Diwan group (decisions.md, Channels and email). */
export const adminHere = (group: Pick<Group, "audience">, holder: Holder) =>
  holder.officer || (group.audience === "staff" && holder.council);

const record = (group: Group, holder: Holder, title: string, admin: boolean) =>
  titles().upsert({
    admin,
    chat_id: group.chat_id,
    ended_at: null,
    set_at: new Date().toISOString(),
    telegram_id: holder.telegram_id,
    title,
  });

/**
 * Makes one person an admin with their seat as their title. The owner and
 * admins added by hand (whom Hudhud can't change) are left as they are.
 */
const promote = async (
  api: Api,
  group: Group,
  holder: Holder,
  title: string,
  before: Given | undefined
) => {
  const standing = await api
    .getChatMember(group.chat_id, holder.telegram_id)
    .catch(() => null);
  if (!standing || standing.status === "creator") {
    return false;
  }
  if (standing.status === "administrator") {
    if (!standing.can_be_edited) {
      return false;
    }
    if (before?.admin && before.title === title && !before.ended_at) {
      return false;
    }
  } else if (standing.status !== "member" && standing.status !== "restricted") {
    return false;
  }
  if (
    !(await quietly(
      api.promoteChatMember(group.chat_id, holder.telegram_id, ADMIN_RIGHTS)
    ))
  ) {
    return false;
  }
  await quietly(
    api.setChatAdministratorCustomTitle(
      group.chat_id,
      holder.telegram_id,
      title
    )
  );
  await record(group, holder, title, true);
  return true;
};

/** Takes back the rights Hudhud gave (only its own admins). */
const demote = (api: Api, group: Group, telegramId: number) =>
  quietly(api.promoteChatMember(group.chat_id, telegramId, NO_RIGHTS));

/**
 * Gives one person their place in a group they are in: an admin with their
 * seat as title (officers; the Council in the Diwan group), else their seat
 * as their member tag. Admins added by hand keep the titles officers gave.
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
  if (adminHere(group, holder)) {
    return promote(api, group, holder, title, before);
  }
  const demoted = before?.admin
    ? await demote(api, group, holder.telegram_id)
    : false;
  if (before && !before.admin && before.title === title && !before.ended_at) {
    return false;
  }
  const standing = await api
    .getChatMember(group.chat_id, holder.telegram_id)
    .catch(() => null);
  if (standing?.status !== "member") {
    return demoted;
  }
  if (
    !(await quietly(
      api.setChatMemberTag(group.chat_id, holder.telegram_id, title)
    ))
  ) {
    return demoted;
  }
  await record(group, holder, title, false);
  return true;
};

/**
 * The last role has ended: the tag comes off at once; in the Diwan group
 * the person is let go 7 days later (a ban lifted at once, so they can come
 * back with a new role).
 */
const takeBack = async (api: Api, group: Group, given: Given) => {
  if (!given.ended_at) {
    if (given.admin) {
      await demote(api, group, given.telegram_id);
    }
    await quietly(api.setChatMemberTag(group.chat_id, given.telegram_id, ""));
    if (group.audience === "staff") {
      await titles()
        .update({ admin: false, ended_at: new Date().toISOString() })
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
    titles().select("admin, chat_id, telegram_id, title, ended_at"),
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
