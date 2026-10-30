import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";
import { project } from "@repo/config";
import type { AdminClient } from "@repo/database/admin";
import { EmailQuotaError, sendEmail } from "@repo/email";
import {
  agreementReminder,
  type Built,
  type Lang as CopyLang,
  callOpened,
  cronFailed,
  type Decision,
  decision,
  deskNames,
  eventReminder,
  type FailedJob,
  finalCheck,
  newsletterConfirm,
  openingReply,
  personalEmailConfirm,
  pieceNote,
  piecePublished,
  removalReceived,
  removalRequested,
  returnedForFormatting,
  roleEnding,
  rsvpConfirmed,
  submissionReceived,
  sundayPaper,
  twoStepReset,
  verificationDecided,
  waitlistPromoted,
} from "@repo/email/copy";
import { Notice, noticeText } from "@repo/email/templates/notice";
import { journal } from "@repo/sal-data";
import { revalidateTag } from "next/cache";
import { stopToken } from "@/lib/api/email-stop";
import { api, origin, site } from "@/lib/api/urls";
import { type CacheTag, cacheTags } from "@/lib/supabase";
import type { Sticker } from "./bot/stickers";
import { pushToUser } from "./push";
import { telegramToUser } from "./telegram";
import { expireWalletPass, walletConfigured } from "./wallet";

/**
 * Processes core.outbox rows: the emails and site revalidation queued by
 * database triggers and the daily notices. Each row is claimed (attempts
 * is incremented) before work starts and marked processed when it is done;
 * a failure records the error and leaves the row for the next drain, up to
 * MAX_ATTEMPTS. When the email plan's daily limit is spent, the claim is
 * given back and the row waits for the limit to reset: it is delayed, not
 * lost. Each email carries an idempotency key, so a retried row never sends
 * the same email twice. Members who turned on phone notifications also get
 * the notice on their devices, after the email has gone.
 */
export const MAX_ATTEMPTS = 5;

type Lang = CopyLang;
interface OutboxRow {
  attempts: number;
  id: number;
  kind: string;
  payload: Record<string, unknown>;
}

// English pages have no language prefix; other languages do ("/ar").
const prefix = (lang: string) =>
  lang === project.locale.default ? "" : `/${lang}`;

// The email templates add /diwan and the language themselves.
const appUrl = origin;

interface Recipient {
  email: string;
  lang: Lang;
  /** Members: whether they take the optional emails (notify_email). */
  optional?: boolean;
  /** Set for members (push goes to their devices); unset for guests. */
  userId?: string;
}

const recipient = async (
  admin: AdminClient,
  userId: unknown
): Promise<Recipient | null> => {
  if (typeof userId !== "string") {
    return null;
  }
  const [{ data: user }, { data: profile }] = await Promise.all([
    admin.auth.admin.getUserById(userId),
    admin
      .schema("core")
      .from("profiles")
      .select("locale, notify_email")
      .eq("id", userId)
      .maybeSingle(),
  ]);
  const email = user?.user?.email;
  if (!email) {
    return null;
  }
  return {
    email,
    lang: profile?.locale === "ar" ? "ar" : "en",
    optional: profile?.notify_email ?? true,
    userId,
  };
};

/** The outbox row being processed: for idempotency keys and push. */
const current = new AsyncLocalStorage<{ admin: AdminClient; row: number }>();

/** The push version of a notice: its heading and first line, in their language. */
const pushNotice = (built: Built, lang: Lang, row: number | undefined) => {
  const block = built.blocks.find((b) => b.lang === lang) ?? built.blocks[0];
  return {
    body: block?.paragraphs[0] ?? "",
    lang,
    tag: row === undefined ? undefined : `outbox-${row}`,
    title: block?.heading ?? built.subject,
    url: block?.action?.href ?? site(lang, "/membership"),
  };
};

const send = async (
  to: Recipient,
  built: Built,
  headers?: Record<string, string>,
  sticker?: Sticker
) => {
  const run = current.getStore();
  const row = run?.row;
  await sendEmail({
    headers,
    idempotencyKey: row === undefined ? undefined : `outbox-${row}-${to.email}`,
    react: Notice({ blocks: built.blocks, preview: built.preview }),
    subject: built.subject,
    text: noticeText(built),
    to: to.email,
  });
  if (run && to.userId) {
    // Neither throws: email is the record.
    const notice = pushNotice(built, to.lang, row);
    await Promise.all([
      pushToUser(run.admin, to.userId, notice),
      telegramToUser(run.admin, to.userId, notice, sticker),
    ]);
  }
};

const eventInfo = async (admin: AdminClient, eventId: unknown) => {
  const { data } = await admin
    .schema("events")
    .from("events")
    .select("title_en, title_ar, starts_at, venue_en, venue_ar")
    .eq("id", String(eventId))
    .maybeSingle();
  return data;
};

/** Whether a submission is read blind (an Edition call) or by name. */
const submissionDesk = async (admin: AdminClient, submissionId: unknown) => {
  const { data } = await admin
    .schema("journal")
    .from("submissions")
    .select("call_id")
    .eq("id", String(submissionId))
    .maybeSingle();
  return data?.call_id ? "blind" : "named";
};

/** A piece's title in the author's language, and its author. */
const pieceInfo = async (admin: AdminClient, pieceId: unknown) => {
  const { data } = await admin
    .schema("journal")
    .from("pieces")
    .select(
      "id, slug, desk, title_en, title_ar, contributor:contributors!pieces_contributor_id_fkey(user_id)"
    )
    .eq("id", String(pieceId))
    .maybeSingle();
  return data;
};

const pieceTitle = (
  piece: { title_ar: string | null; title_en: string | null },
  lang: Lang
) =>
  (lang === "ar" ? piece.title_ar : piece.title_en) ??
  piece.title_en ??
  piece.title_ar ??
  "";

const webUrl = origin;

const submissionTitle = async (admin: AdminClient, submissionId: unknown) => {
  const { data } = await admin
    .schema("journal")
    .from("submissions")
    .select("title")
    .eq("id", String(submissionId))
    .maybeSingle();
  return data?.title ?? null;
};

/** Holders of programmes.manage for the program (or globally). */
/** Everyone holding a permission, globally or for one scope. */
const holders = async (
  admin: AdminClient,
  permission: string,
  scope?: { id: unknown; type: string }
): Promise<Recipient[]> => {
  const { data } = await admin.schema("access").rpc("permission_holders", {
    permission,
    scope_id: typeof scope?.id === "string" ? scope.id : undefined,
    scope_type: scope?.type ?? "global",
  });
  const found = await Promise.all(
    (data ?? []).map((h) => recipient(admin, h.user_id))
  );
  return found.filter((r): r is Recipient => r !== null);
};

const programmeManagers = (admin: AdminClient, programmeId: unknown) =>
  holders(admin, "programmes.manage", { id: programmeId, type: "programme" });

const isFailedJob = (x: unknown): x is FailedJob =>
  typeof x === "object" &&
  x !== null &&
  typeof (x as FailedJob).job === "string" &&
  typeof (x as FailedJob).failures === "number" &&
  typeof (x as FailedJob).last_error === "string";

const removalInfo = async (admin: AdminClient, requestId: unknown) => {
  const { data } = await admin
    .schema("programmes")
    .from("removal_requests")
    .select("requester_name, requester_email, content_url, details, due_at")
    .eq("id", String(requestId))
    .maybeSingle();
  return data;
};

/** Refreshes the public pages' cached reads (the site is this same app). */
const revalidate = (tags: unknown) => {
  if (!Array.isArray(tags)) {
    return;
  }
  for (const tag of tags) {
    if ((cacheTags as readonly unknown[]).includes(tag)) {
      revalidateTag(tag as CacheTag, "max");
    }
  }
};

/** A newsletter subscriber (no account), with their unsubscribe token. */
const subscriber = async (admin: AdminClient, id: unknown) => {
  const { data } = await admin
    .schema("content")
    .from("newsletter_subscribers")
    .select("email, lang, status, confirm_token, unsubscribe_token")
    .eq("id", String(id))
    .maybeSingle();
  return data;
};

const unsubscribeLinks = (lang: Lang, token: string) => {
  const page = `${webUrl()}${prefix(lang)}/sunday-paper/unsubscribe?token=${token}`;
  const oneClick = api(`/newsletter/unsubscribe?token=${token}`);
  return {
    headers: {
      "List-Unsubscribe": `<${oneClick}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
    page,
  };
};

/** A member's "stop these emails" page and one-click header. */
const stopLinks = (lang: Lang, userId: string) => {
  const token = stopToken(userId);
  return {
    headers: {
      "List-Unsubscribe": `<${api(`/email/stop?token=${token}`)}>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
    page: `${webUrl()}${prefix(lang)}/emails/stop?token=${token}`,
  };
};

/**
 * What the Sunday Paper carries (owner, Oct 29, 2026): the month's pieces,
 * What's on for the month ahead, and the Callboard's open places. Null
 * when there is nothing to send.
 */
const paperContents = async (
  admin: AdminClient,
  lang: Lang,
  sinceValue: unknown
) => {
  const now = new Date();
  const since =
    typeof sinceValue === "string"
      ? sinceValue
      : new Date(now.getTime() - 31 * 86_400_000).toISOString();
  const base = `${webUrl()}${prefix(lang)}`;
  const [{ data: pieces }, { data: events }, { data: places }] =
    await Promise.all([
      admin
        .schema("journal")
        .from("pieces")
        .select("slug, desk, title_en, title_ar, published_at")
        .eq("status", "published")
        .gt("published_at", since)
        .lte("published_at", now.toISOString())
        .order("published_at", { ascending: false })
        .limit(20),
      admin
        .schema("events")
        .from("events")
        .select("slug, title_en, title_ar, starts_at")
        .eq("status", "published")
        .eq("members_only", false)
        .gt("starts_at", now.toISOString())
        .lte(
          "starts_at",
          new Date(now.getTime() + 31 * 86_400_000).toISOString()
        )
        .order("starts_at")
        .limit(10),
      admin
        .schema("programmes")
        .from("openings")
        .select("title_en, title_ar")
        .eq("is_open", true)
        .or(`closes_at.is.null,closes_at.gt.${now.toISOString()}`)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);
  if ((pieces?.length ?? 0) + (events?.length ?? 0) === 0) {
    return null;
  }
  return {
    callboard: `${base}/get-involved`,
    events: (events ?? []).map((e) => ({
      starts_at: e.starts_at,
      title_ar: e.title_ar ?? "",
      title_en: e.title_en,
      url: `${base}/events/${e.slug}`,
    })),
    front: `${base}/qirtas`,
    pieces: (pieces ?? []).map((p) => {
      const desk = deskNames[p.desk as keyof typeof deskNames];
      return {
        desk_ar: desk?.ar ?? "",
        desk_en: desk?.en ?? "",
        title_ar: p.title_ar ?? "",
        title_en: p.title_en ?? "",
        url: `${base}/qirtas/${p.desk}/${p.slug}`,
      };
    }),
    places: (places ?? []).map((o) => ({
      title_ar: o.title_ar ?? "",
      title_en: o.title_en ?? "",
    })),
  };
};

type Handler = (
  admin: AdminClient,
  payload: Record<string, unknown>
) => Promise<void>;

const eventNotice =
  (make: typeof rsvpConfirmed): Handler =>
  async (admin, payload) => {
    const [to, event] = await Promise.all([
      recipient(admin, payload.user_id),
      eventInfo(admin, payload.event_id),
    ]);
    if (to && event) {
      await send(to, make(to.lang, event, appUrl()));
    }
  };

const handlers: Record<string, Handler> = {
  "access.role_ending": async (admin, payload) => {
    const to = await recipient(admin, payload.user_id);
    const { data } = await admin
      .schema("access")
      .from("role_assignments")
      .select("ends_at, title_en, title_ar, role:roles(name_en, name_ar)")
      .eq("id", String(payload.assignment_id))
      .maybeSingle();
    if (to && data?.ends_at && data.role) {
      await send(
        to,
        roleEnding(
          to.lang,
          {
            ends_at: data.ends_at,
            name_ar: data.title_ar ?? data.role.name_ar,
            name_en: data.title_en ?? data.role.name_en,
          },
          appUrl()
        )
      );
    }
  },
  // From access.two_step_resets: an officer, or a recovery code, cleared
  // someone's authenticator app.
  "access.two_step_reset": async (admin, payload) => {
    const to = await recipient(admin, payload.user_id);
    if (to) {
      await send(
        to,
        twoStepReset(
          to.lang,
          payload.via === "officer" ? "officer" : "recovery_code",
          appUrl()
        )
      );
    }
  },
  // The day before: to everyone booked, and to everyone who asked "Remind
  // me". A booked reminder is optional (notify_email); "Remind me" was
  // asked for, so it always goes.
  "events.reminder": async (admin, payload) => {
    const [to, event, { data: booking }] = await Promise.all([
      recipient(admin, payload.user_id),
      eventInfo(admin, payload.event_id),
      admin
        .schema("events")
        .from("rsvps")
        .select("status")
        .eq("event_id", String(payload.event_id))
        .eq("user_id", String(payload.user_id))
        .eq("status", "confirmed")
        .maybeSingle(),
    ]);
    const booked = Boolean(booking);
    if (!(to && event) || (booked && to.optional === false)) {
      return;
    }
    await send(to, eventReminder(to.lang, event, appUrl(), booked));
  },
  "events.rsvp_confirmed": eventNotice(rsvpConfirmed),
  "events.waitlist_promoted": eventNotice(waitlistPromoted),
  "journal.agreement_reminder": async (admin, payload) => {
    const [to, work] = await Promise.all([
      recipient(admin, payload.user_id),
      submissionTitle(admin, payload.submission_id),
    ]);
    if (to && work) {
      await send(to, agreementReminder(to.lang, work, appUrl()));
    }
  },
  "journal.call_opened": async (admin, payload) => {
    const [to, { data: call }] = await Promise.all([
      recipient(admin, payload.user_id),
      admin
        .schema("journal")
        .from("calls")
        .select("title_en, title_ar, closes_at")
        .eq("id", String(payload.call_id))
        .maybeSingle(),
    ]);
    if (to && call) {
      await send(to, callOpened(to.lang, call, appUrl()));
    }
  },
  "journal.decision": async (admin, payload) => {
    const [to, work] = await Promise.all([
      recipient(admin, payload.user_id),
      submissionTitle(admin, payload.submission_id),
    ]);
    const outcome = payload.decision as Decision;
    if (
      to &&
      work &&
      ["accept", "accept_with_edits", "decline"].includes(outcome)
    ) {
      await send(to, decision(to.lang, work, outcome, appUrl()));
    }
  },
  "journal.final_check": async (admin, payload) => {
    const [to, piece] = await Promise.all([
      recipient(admin, payload.user_id),
      pieceInfo(admin, payload.piece_id),
    ]);
    if (to && piece) {
      await send(
        to,
        finalCheck(to.lang, pieceTitle(piece, to.lang), piece.id, appUrl())
      );
    }
  },
  "journal.piece_note": async (admin, payload) => {
    const [to, piece] = await Promise.all([
      recipient(admin, payload.user_id),
      pieceInfo(admin, payload.piece_id),
    ]);
    if (to && piece) {
      await send(
        to,
        pieceNote(to.lang, pieceTitle(piece, to.lang), piece.id, appUrl())
      );
    }
  },
  "journal.piece_published": async (admin, payload) => {
    const piece = await pieceInfo(admin, payload.piece_id);
    // Staff pieces have no account behind the byline to thank.
    const to = await recipient(admin, piece?.contributor?.user_id);
    if (to && piece) {
      await send(
        to,
        piecePublished(
          to.lang,
          pieceTitle(piece, to.lang),
          `${webUrl()}${prefix(to.lang)}${journal.piecePath(piece)}`
        )
      );
    }
  },
  "journal.returned_for_formatting": async (admin, payload) => {
    const [to, work] = await Promise.all([
      recipient(admin, payload.user_id),
      submissionTitle(admin, payload.submission_id),
    ]);
    if (to && work) {
      await send(
        to,
        returnedForFormatting(
          to.lang,
          work,
          typeof payload.note === "string" ? payload.note : "",
          appUrl()
        )
      );
    }
  },
  "journal.submission_received": async (admin, payload) => {
    const [to, work, desk] = await Promise.all([
      recipient(admin, payload.user_id),
      submissionTitle(admin, payload.submission_id),
      submissionDesk(admin, payload.submission_id),
    ]);
    if (to && work) {
      await send(
        to,
        submissionReceived(to.lang, work, appUrl(), desk),
        undefined,
        "sent"
      );
    }
  },
  "journal.sunday_paper": async (admin, payload) => {
    const to = await recipient(admin, payload.user_id);
    if (!to) {
      return;
    }
    const paper = await paperContents(admin, to.lang, payload.since);
    if (!paper) {
      return;
    }
    const stop = stopLinks(to.lang, String(payload.user_id));
    await send(
      to,
      sundayPaper(to.lang, { ...paper, stop: stop.page }),
      stop.headers
    );
  },
  // The Council decided an account from outside AUIB
  // (membership.decide_verification).
  "membership.verification_decided": async (admin, payload) => {
    const to = await recipient(admin, payload.user_id);
    if (to) {
      await send(
        to,
        verificationDecided(to.lang, payload.approved === true, appUrl())
      );
    }
  },
  // From the wallet_passes triggers: a card was reset, a membership ended
  // or an account was deleted. Each pass is marked expired in Google
  // Wallet (a pass never saved is simply recorded as expired).
  "membership.wallet_expire": async (admin, payload) => {
    const codes = Array.isArray(payload.codes)
      ? payload.codes.filter((c): c is string => typeof c === "string")
      : [];
    if (codes.length === 0 || !walletConfigured()) {
      return;
    }
    await Promise.all(codes.map((code) => expireWalletPass(code)));
    await admin
      .schema("membership")
      .from("wallet_passes")
      .update({ state: "expired" })
      .in("code", codes);
  },
  "newsletter.confirm": async (admin, payload) => {
    const row = await subscriber(admin, payload.subscriber_id);
    if (!(row?.confirm_token && row.status === "pending")) {
      return;
    }
    const lang: Lang = row.lang === "ar" ? "ar" : "en";
    await send(
      { email: row.email, lang },
      newsletterConfirm(
        lang,
        `${webUrl()}${prefix(lang)}/sunday-paper/confirm?token=${row.confirm_token}`
      )
    );
  },
  // The Sunday Paper for the public list (subscribers without an account).
  "newsletter.monthly": async (admin, payload) => {
    const row = await subscriber(admin, payload.subscriber_id);
    if (row?.status !== "subscribed") {
      return;
    }
    const lang: Lang = row.lang === "ar" ? "ar" : "en";
    const paper = await paperContents(admin, lang, payload.since);
    if (!paper) {
      return;
    }
    const links = unsubscribeLinks(lang, row.unsubscribe_token);
    await send(
      { email: row.email, lang },
      sundayPaper(lang, { ...paper, stop: links.page }),
      links.headers
    );
  },
  // Only to the new address, never the sign-in one: the link proves the
  // member reads it.
  "personal_email.confirm": async (admin, payload) => {
    const [{ data: pending }, { data: profile }] = await Promise.all([
      admin
        .schema("core")
        .from("personal_email_requests")
        .select("email, token")
        .eq("user_id", String(payload.user_id))
        .maybeSingle(),
      admin
        .schema("core")
        .from("profiles")
        .select("locale")
        .eq("id", String(payload.user_id))
        .maybeSingle(),
    ]);
    if (!pending) {
      return;
    }
    const lang: Lang = profile?.locale === "ar" ? "ar" : "en";
    await send(
      { email: pending.email, lang },
      personalEmailConfirm(
        lang,
        `${webUrl()}${prefix(lang)}/personal-email/confirm?token=${pending.token}`
      )
    );
  },
  // From private.cron_health(): the day's failed pg_cron runs, to the
  // administrators.
  "platform.cron_failed": async (admin, payload) => {
    const jobs = Array.isArray(payload.jobs)
      ? payload.jobs.filter(isFailedJob)
      : [];
    if (jobs.length === 0) {
      return;
    }
    const day =
      typeof payload.day === "string"
        ? payload.day
        : new Date().toISOString().slice(0, 10);
    const admins = await holders(admin, "settings.manage");
    await Promise.all(
      admins.map((a) => send(a, cronFailed(a.lang, jobs, day)))
    );
  },
  "programmes.opening_reply": async (admin, payload) => {
    const [{ data: opening }, { data: reply }, { data: person }] =
      await Promise.all([
        admin
          .schema("programmes")
          .from("openings")
          .select("title_en, title_ar")
          .eq("id", String(payload.opening_id))
          .maybeSingle(),
        admin
          .schema("programmes")
          .from("opening_replies")
          .select("note")
          .eq("opening_id", String(payload.opening_id))
          .eq("user_id", String(payload.user_id))
          .maybeSingle(),
        admin
          .schema("core")
          .from("profiles")
          .select("full_name_en, full_name_ar")
          .eq("id", String(payload.user_id))
          .maybeSingle(),
      ]);
    if (!(opening && reply && person)) {
      return;
    }
    // Membership runs every role's applications (owner, Oct 30, 2026).
    const managers = await holders(admin, "members.manage");
    await Promise.all(
      managers.map((m) =>
        send(
          m,
          openingReply(
            m.lang,
            {
              member:
                m.lang === "ar"
                  ? (person.full_name_ar ?? person.full_name_en)
                  : person.full_name_en,
              note: reply.note,
              title: m.lang === "ar" ? opening.title_ar : opening.title_en,
            },
            appUrl()
          )
        )
      )
    );
  },
  "programmes.removal_overdue": async (admin, payload) => {
    const [request, managers] = await Promise.all([
      removalInfo(admin, payload.request_id),
      programmeManagers(admin, payload.programme_id),
    ]);
    if (request) {
      await Promise.all(
        managers.map((m) =>
          send(m, removalRequested(m.lang, request, appUrl(), true))
        )
      );
    }
  },
  "programmes.removal_requested": async (admin, payload) => {
    const [request, managers] = await Promise.all([
      removalInfo(admin, payload.request_id),
      programmeManagers(admin, payload.programme_id),
    ]);
    if (!request) {
      return;
    }
    await Promise.all([
      ...managers.map((m) =>
        send(m, removalRequested(m.lang, request, appUrl()))
      ),
      // The requester has no account; write in English with Arabic below.
      send(
        { email: request.requester_email, lang: "en" },
        removalReceived("en", request.due_at)
      ),
    ]);
  },
  revalidate: async (_admin, payload) => {
    await revalidate(payload.tags);
  },
};

/**
 * A row that waits for its day: decision letters go out on the call's
 * announced decisions day (payload.send_after), all at once.
 */
export const isDeferred = (payload: unknown, now = Date.now()) => {
  const after =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>).send_after
      : null;
  return typeof after === "string" && Date.parse(after) > now;
};

/** Claims and processes one row; true when it is done (or not ours to do). */
export const processRow = async (admin: AdminClient, id: number) => {
  const { data: row } = await admin
    .schema("core")
    .from("outbox")
    .select("id, kind, payload, attempts")
    .eq("id", id)
    .is("processed_at", null)
    .lt("attempts", MAX_ATTEMPTS)
    .maybeSingle();
  if (!row) {
    return true;
  }
  if (isDeferred(row.payload)) {
    // Not yet: left unclaimed for the drain on its day.
    return true;
  }
  const previousAttempts = row.attempts;
  const claimed = await admin
    .schema("core")
    .from("outbox")
    .update({ attempts: row.attempts + 1 })
    .eq("id", id)
    .eq("attempts", row.attempts)
    .select("id")
    .maybeSingle();
  if (!claimed.data) {
    // Someone else took it.
    return true;
  }
  const handler = Object.hasOwn(handlers, row.kind)
    ? handlers[row.kind]
    : undefined;
  try {
    if (handler) {
      await current.run({ admin, row: id }, () =>
        handler(admin, (row as OutboxRow).payload)
      );
    }
    await admin
      .schema("core")
      .from("outbox")
      .update({
        last_error: handler ? null : "no handler",
        processed_at: new Date().toISOString(),
      })
      .eq("id", id);
    return true;
  } catch (error) {
    const quota = error instanceof EmailQuotaError;
    await admin
      .schema("core")
      .from("outbox")
      .update({
        // A spent sending limit is not the row's fault: give the try back.
        ...(quota ? { attempts: previousAttempts } : {}),
        last_error: String(
          error instanceof Error ? error.message : error
        ).slice(0, 1000),
      })
      .eq("id", id);
    if (quota) {
      throw error;
    }
    return false;
  }
};

/** Pending rows older than two minutes (the trigger handles fresh ones). */
export const drain = async (admin: AdminClient, limit = 50) => {
  const { data: pending } = await admin
    .schema("core")
    .from("outbox")
    .select("id, payload")
    .is("processed_at", null)
    .lt("attempts", MAX_ATTEMPTS)
    .lt("created_at", new Date(Date.now() - 2 * 60 * 1000).toISOString())
    .order("created_at")
    .limit(limit * 10);
  // Letters held for their day stay behind without blocking the rest.
  const rows = (pending ?? [])
    .filter((row) => !isDeferred(row.payload))
    .slice(0, limit);
  let done = 0;
  for (const row of rows) {
    try {
      // One at a time: Resend's rate limit is per second.
      // biome-ignore lint/performance/noAwaitInLoops: sequential on purpose
      if (await processRow(admin, row.id)) {
        done += 1;
      }
    } catch (error) {
      if (error instanceof EmailQuotaError) {
        // The rest would fail the same way; they wait for the next drain.
        return { done, quotaReached: true, seen: rows.length };
      }
      throw error;
    }
  }
  return { done, quotaReached: false, seen: rows.length };
};
