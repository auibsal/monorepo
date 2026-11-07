import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";
import { project } from "@repo/config";
import type { AdminClient } from "@repo/database/admin";
import { EmailQuotaError, sendEmail } from "@repo/email";
import {
  accountDeleted,
  agreementReminder,
  applicationDecided,
  applicationReceived,
  applicationWaiting,
  auditionUpdate,
  type Built,
  type Lang as CopyLang,
  callOpened,
  candidacyDecided,
  certificateIssued,
  contactField,
  cronFailed,
  type Decision,
  decision,
  deskNames,
  electionStage,
  eventChanged,
  eventReminder,
  type FailedJob,
  finalCheck,
  invitationBroadcast,
  invitationContact,
  newsletterConfirm,
  partnerInvitation,
  personalEmailConfirm,
  pieceNote,
  piecePublished,
  recoveryAttempts,
  removalDone,
  removalReceived,
  removalRequested,
  repliesDigest,
  replyUpdate,
  requestUpdated,
  returnedForFormatting,
  roleAssigned,
  roleEnding,
  rsvpConfirmed,
  shiftReminder,
  submissionReceived,
  sundayPaper,
  twoStepReset,
  verificationDecided,
  waitlistPromoted,
  welcome,
} from "@repo/email/copy";
import {
  Notice,
  type NoticeFooterLine,
  noticeText,
} from "@repo/email/templates/notice";
import { journal } from "@repo/sal-data";
import { revalidateTag } from "next/cache";
import {
  type BroadcastContact,
  BroadcastPending,
  cleanUpSegments,
  pullUnsubscribes,
  runBroadcast,
} from "@/lib/api/broadcast";
import { inviteStopToken, stopToken } from "@/lib/api/email-stop";
import {
  INVITATION_FOOTER,
  invitationSigner,
} from "@/lib/api/invitation-letter";
import { api, origin, site } from "@/lib/api/urls";
import { type CacheTag, cacheTags } from "@/lib/supabase";
import type { Sticker } from "./bot/stickers";
import { pushToUser } from "./push";
import { telegramToUser } from "./telegram";
import {
  expireWalletPass,
  renumberWalletPass,
  walletConfigured,
} from "./wallet";

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
/** Also in private.queue_revalidation(): a row past it no longer counts as waiting. */
export const MAX_ATTEMPTS = 5;

type Lang = CopyLang;
interface OutboxRow {
  attempts: number;
  id: number;
  kind: string;
  payload: Record<string, unknown>;
}

// English pages have no language prefix; other languages do ("/ar").
/** The kind of invitation email: a class, a partner's team or guest, or the Society's guest. */
const invitationKind = (
  kind: string,
  hasPartner: boolean
): "team" | "guest" | "society" | "associate" | "honorary" => {
  if (kind === "associate" || kind === "honorary") {
    return kind;
  }
  if (!hasPartner) {
    return "society";
  }
  return kind === "team" ? "team" : "guest";
};

const prefix = (lang: string) =>
  lang === project.locale.default ? "" : `/${lang}`;

/** A stored language, as one the emails are written in. */
const langOf = (value: unknown): Lang => (value === "ar" ? "ar" : "en");

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
const current = new AsyncLocalStorage<{
  admin: AdminClient;
  kind: string;
  row: number;
}>();

/** The push version of a notice: its heading and first line, in their language. */
const pushNotice = (built: Built, lang: Lang, row: number | undefined) => {
  const block = built.blocks.find((b) => b.lang === lang) ?? built.blocks[0];
  return {
    body: block?.paragraphs[0] ?? "",
    lang,
    tag: row === undefined ? undefined : `outbox-${row}`,
    title: block?.heading ?? built.subject,
    url: block?.action?.href ?? site(lang, "/account"),
  };
};

/**
 * Why an email came, said in its footer:
 * - `service`: something the member did or that concerns them (bookings,
 *   their work, their roles); they choose their emails on Notices;
 * - `optional`: an email they may stop (the Sunday Paper, reminders of
 *   what they booked), with a one-click stop link and header;
 * - `officer`: their role's work;
 * - `direct`: to an address with no account behind it (an invitation, a
 *   confirmation, a removal request): nothing to manage.
 */
type Category = "direct" | "officer" | "optional" | "service";

const FOOTER_LINES: Record<
  Exclude<Category, "direct">,
  Record<Lang, { link: string; text: string }>
> = {
  officer: {
    ar: { link: "الإشعارات", text: "وصلتك لأنك تحمل دورًا في الجمعية." },
    en: {
      link: "Notices",
      text: "You get this because you hold a role in the Society.",
    },
  },
  optional: {
    ar: { link: "أوقفها", text: "وصلتك لأنك اخترت هذه الرسائل." },
    en: {
      link: "Stop these",
      text: "You get this because you chose these emails.",
    },
  },
  service: {
    ar: {
      link: "الإشعارات",
      text: "وصلتك لأن لك حسابًا في الجمعية. تختار رسائلك في",
    },
    en: {
      link: "Notices",
      text: "You get this because you have an account with the Society. Choose your emails on",
    },
  },
};

const footerFor = (
  to: Recipient,
  category: Category
): { footer: NoticeFooterLine[]; headers?: Record<string, string> } => {
  if (category === "direct" || !to.userId) {
    return { footer: [] };
  }
  const line = FOOTER_LINES[category][to.lang];
  if (category === "optional") {
    const stop = stopLinks(to.lang, to.userId);
    return {
      footer: [{ href: stop.page, link: line.link, text: line.text }],
      headers: stop.headers,
    };
  }
  return {
    footer: [
      {
        href: site(to.lang, "/account/settings/notifications"),
        link: line.link,
        text: line.text,
      },
    ],
  };
};

interface SendOptions {
  /** Why it came (the footer); defaults to `service`. */
  readonly category?: Category;
  /** Footer and headers given whole (the public Sunday Paper list). */
  readonly footer?: NoticeFooterLine[];
  readonly headers?: Record<string, string>;
  readonly sticker?: Sticker;
}

const send = async (
  to: Recipient,
  built: Built,
  { category = "service", footer, headers, sticker }: SendOptions = {}
) => {
  const run = current.getStore();
  const row = run?.row;
  // Optional email turned off: Hudhud still brings the reminder, if they
  // keep notices on in Telegram (its own setting, /me).
  if (category === "optional" && to.optional === false) {
    if (run && to.userId) {
      await telegramToUser(
        run.admin,
        to.userId,
        pushNotice(built, to.lang, row),
        sticker
      );
    }
    return;
  }
  const made = footerFor(to, category);
  const lines = footer ?? made.footer;
  await sendEmail({
    headers: headers ?? made.headers,
    idempotencyKey: row === undefined ? undefined : `outbox-${row}-${to.email}`,
    react: Notice({
      blocks: built.blocks,
      footer: lines,
      preview: built.preview,
    }),
    // Replies reach a person, never a no-reply box.
    replyTo: project.supportEmail,
    subject: built.subject,
    tags: run
      ? [{ name: "kind", value: run.kind.replace(/[^\w-]/g, "_") }]
      : [],
    text: noticeText({ blocks: built.blocks, footer: lines }),
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

/** Holders of programs.manage for the program (or globally). */
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
  holders(admin, "programs.manage", { id: programmeId, type: "programme" });

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
    .select(
      "requester_name, requester_email, requester_lang, content_url, details, due_at, status, action_taken"
    )
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
 * What's on for the month ahead, and Get involved's open places. Null
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
    events: (events ?? []).map((e) => ({
      starts_at: e.starts_at,
      title_ar: e.title_ar ?? "",
      title_en: e.title_en,
      url: `${base}/events/${e.slug}`,
    })),
    front: `${base}/qirtas`,
    getInvolved: `${base}/get-involved`,
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
  // From /api/two-step/recover: the hour's tries ran out.
  "access.recovery_attempts": async (admin, payload) => {
    const to = await recipient(admin, payload.user_id);
    if (to) {
      await send(to, recoveryAttempts(to.lang, appUrl()));
    }
  },
  // ── Journeys added in the email audit (owner, Nov 4, 2026) ──────────
  "access.role_assigned": async (admin, payload) => {
    const [to, { data }] = await Promise.all([
      recipient(admin, payload.user_id),
      admin
        .schema("access")
        .from("role_assignments")
        .select(
          "ends_at, title_en, title_ar, role:roles(name_en, name_ar, requires_mfa)"
        )
        .eq("id", String(payload.assignment_id))
        .maybeSingle(),
    ]);
    if (to && data?.role) {
      await send(
        to,
        roleAssigned(
          to.lang,
          {
            ends_at: data.ends_at,
            name_ar: data.title_ar ?? data.role.name_ar,
            name_en: data.title_en ?? data.role.name_en,
          },
          data.role.requires_mfa,
          appUrl()
        ),
        { category: "officer" }
      );
    }
  },
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
        ),
        { category: "officer" }
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
  // Sent to the address the account had (it is gone by now).
  "account.deleted": async (_admin, payload) => {
    if (typeof payload.email === "string") {
      const lang = langOf(payload.lang);
      await send({ email: payload.email, lang }, accountDeleted(lang));
    }
  },
  "events.changed": async (admin, payload) => {
    const [to, event] = await Promise.all([
      recipient(admin, payload.user_id),
      eventInfo(admin, payload.event_id),
    ]);
    if (to && event) {
      await send(
        to,
        eventChanged(
          to.lang,
          event,
          payload.change === "cancelled" ? "cancelled" : "moved",
          appUrl()
        )
      );
    }
  },
  // The day before: to everyone booked, and to everyone who asked "Remind
  // me". A booked reminder is optional (notify_email; without it, Telegram
  // only); "Remind me" was asked for, so it always goes.
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
    if (!(to && event)) {
      return;
    }
    // Reminders of what they booked are optional; "Remind me" was asked for.
    await send(to, eventReminder(to.lang, event, appUrl(), booked), {
      category: booked ? "optional" : "service",
    });
  },
  "events.rsvp_confirmed": eventNotice(rsvpConfirmed),
  "events.waitlist_promoted": eventNotice(waitlistPromoted),
  "forms.updated": async (admin, payload) => {
    const [to, { data: request }] = await Promise.all([
      recipient(admin, payload.user_id),
      admin
        .schema("governance")
        .from("form_submissions")
        .select("id, form_key, status")
        .eq("id", String(payload.submission_id))
        .maybeSingle(),
    ]);
    const status = payload.status === "closed" ? "closed" : "acknowledged";
    if (to && request) {
      await send(
        to,
        requestUpdated(to.lang, request.form_key, status, request.id, appUrl())
      );
    }
  },
  "governance.candidacy_decided": async (admin, payload) => {
    const [to, { data }] = await Promise.all([
      recipient(admin, payload.user_id),
      admin
        .schema("governance")
        .from("candidates")
        .select("position:positions(title_en, title_ar)")
        .eq("id", String(payload.candidate_id))
        .maybeSingle(),
    ]);
    if (to && data?.position) {
      await send(
        to,
        candidacyDecided(
          to.lang,
          {
            title_ar: data.position.title_ar ?? "",
            title_en: data.position.title_en,
          },
          payload.approved === true,
          appUrl()
        )
      );
    }
  },
  "governance.election": async (admin, payload) => {
    const [to, { data: election }] = await Promise.all([
      recipient(admin, payload.user_id),
      admin
        .schema("governance")
        .from("elections")
        .select(
          "title_en, title_ar, nominations_open_at, nominations_close_at, voting_opens_at, voting_closes_at"
        )
        .eq("id", String(payload.election_id))
        .maybeSingle(),
    ]);
    const { stage } = payload;
    if (
      to &&
      election &&
      (stage === "notice" || stage === "voting" || stage === "published")
    ) {
      await send(
        to,
        electionStage(
          to.lang,
          { ...election, title_ar: election.title_ar ?? "" },
          stage,
          appUrl()
        )
      );
    }
  },
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
      await send(to, submissionReceived(to.lang, work, appUrl(), desk), {
        sticker: "sent",
      });
    }
  },
  "membership.certificate_issued": async (admin, payload) => {
    const [to, { data: certificate }] = await Promise.all([
      recipient(admin, payload.user_id),
      admin
        .schema("membership")
        .from("certificates")
        .select("id, kind, prize_category, citation_en, citation_ar, status")
        .eq("id", String(payload.certificate_id))
        .maybeSingle(),
    ]);
    if (
      to &&
      certificate?.status === "issued" &&
      certificate.kind === "prize"
    ) {
      const what =
        (to.lang === "ar"
          ? certificate.citation_ar
          : certificate.citation_en) ??
        certificate.citation_en ??
        "";
      await send(
        to,
        certificateIssued(to.lang, what, certificate.id, appUrl())
      );
    }
  },
  // The one-time invitation to join (owner, Nov 7, 2026), as one Broadcast
  // for each kind of invitation: each address's greeting, Tour line and
  // stop link are its contact properties. The President's go marked the
  // addresses sent (membership.send_invitations).
  "membership.invitations": async (admin, payload) => {
    await cleanUpSegments(admin);
    await pullUnsubscribes(admin);
    const { data: rows, error } = await admin
      .schema("membership")
      .from("invitations")
      .select("email, first_name, kind, station, words, quote_words, pages")
      .not("sent_at", "is", null)
      .is("joined_at", null);
    if (error) {
      throw error;
    }
    const lang: Lang = "en";
    const join = `${webUrl()}${prefix(lang)}/join`;
    const sentAt = String(payload.sent_at ?? "");
    // The President's letter, signed (an image: mail apps can't load the
    // signature face), from their address.
    const signer = await invitationSigner(admin, sentAt.slice(0, 10));
    const waiting: string[] = [];
    for (const kind of ["tour", "plain"] as const) {
      const contacts: BroadcastContact[] = (rows ?? [])
        .filter((row) => (row.kind === "plain" ? "plain" : "tour") === kind)
        .map((row) => {
          const token = inviteStopToken(row.email);
          return {
            email: row.email,
            firstName: row.first_name,
            properties: {
              ...invitationContact(lang, {
                first_name: row.first_name,
                kind,
                pages: row.pages,
                station: row.station,
                words: row.quote_words ? row.words : null,
              }),
              stop_url: `${webUrl()}${prefix(lang)}/emails/stop?invite=${token}`,
            },
          };
        });
      try {
        // biome-ignore lint/performance/noAwaitInLoops: one at a time
        await runBroadcast(admin, {
          built: invitationBroadcast(lang, kind, join, signer),
          contacts,
          // Made as a draft: whoever sends it opens it in Resend and sends.
          draft: true,
          footer: [
            {
              href: contactField("stop_url"),
              link: "Stop",
              text: INVITATION_FOOTER,
            },
          ],
          key: `invitation:${sentAt.slice(0, 19)}:${kind}`,
          kind: "invitation",
          lang,
        });
      } catch (failure) {
        if (!(failure instanceof BroadcastPending)) {
          throw failure;
        }
        waiting.push(failure.message);
      }
    }
    if (waiting.length > 0) {
      throw new BroadcastPending(waiting.join(" "));
    }
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
  "membership.welcome": async (admin, payload) => {
    const to = await recipient(admin, payload.user_id);
    if (to) {
      await send(to, welcome(to.lang, appUrl()));
    }
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
  "partners.application_decided": async (admin, payload) => {
    const [to, { data: partner }] = await Promise.all([
      recipient(admin, payload.user_id),
      admin
        .schema("governance")
        .from("partners")
        .select("name_en, name_ar")
        .eq("id", String(payload.partner_id))
        .maybeSingle(),
    ]);
    if (to && partner) {
      const name =
        to.lang === "ar"
          ? (partner.name_ar ?? partner.name_en)
          : partner.name_en;
      await send(
        to,
        applicationDecided(to.lang, name, payload.approved === true, appUrl())
      );
    }
  },
  // The applicant hears it arrived; Partnerships and the President, that
  // it waits.
  "partners.application_received": async (admin, payload) => {
    const { data: agreement } = await admin
      .schema("governance")
      .from("partner_agreements")
      .select("partner:partners(name_en, name_ar)")
      .eq("id", String(payload.agreement_id))
      .maybeSingle();
    if (!agreement?.partner) {
      return;
    }
    const { partner } = agreement;
    const nameIn = (lang: Lang) =>
      lang === "ar" ? (partner.name_ar ?? partner.name_en) : partner.name_en;
    const [to, managers, signers] = await Promise.all([
      recipient(admin, payload.user_id),
      holders(admin, "partners.manage"),
      holders(admin, "partners.sign"),
    ]);
    const officers = [...managers, ...signers].filter(
      (o, i, all) => all.findIndex((x) => x.email === o.email) === i
    );
    await Promise.all([
      ...(to
        ? [send(to, applicationReceived(to.lang, nameIn(to.lang), appUrl()))]
        : []),
      ...officers.map((o) =>
        send(o, applicationWaiting(o.lang, nameIn(o.lang), appUrl()), {
          category: "officer",
        })
      ),
    ]);
  },
  // An email invitation, from a partner or from the Society (Membership),
  // in the inviter's language: the link is the invitation (/invite/<code>).
  "partners.invitation": async (admin, payload) => {
    const { data: invitation } = await admin
      .schema("governance")
      .from("partner_invitations")
      .select(
        "email, code, kind, created_by, accepted_at, revoked_at, partner_id"
      )
      .eq("id", String(payload.invitation_id))
      .maybeSingle();
    if (!invitation?.email || invitation.accepted_at || invitation.revoked_at) {
      return;
    }
    const [{ data: partner }, { data: inviter }] = await Promise.all([
      invitation.partner_id
        ? admin
            .schema("governance")
            .from("partners")
            .select("name_en, name_ar")
            .eq("id", invitation.partner_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      admin
        .schema("core")
        .from("profiles")
        .select("locale")
        .eq("id", invitation.created_by ?? "")
        .maybeSingle(),
    ]);
    if (invitation.partner_id && !partner) {
      return;
    }
    const lang: Lang = inviter?.locale === "ar" ? "ar" : "en";
    let name: string | null = null;
    if (partner) {
      name =
        lang === "ar" ? (partner.name_ar ?? partner.name_en) : partner.name_en;
    }
    const kind = invitationKind(invitation.kind, Boolean(name));
    await send(
      { email: invitation.email, lang },
      partnerInvitation(
        lang,
        name ?? "",
        kind,
        `${webUrl()}${prefix(lang)}/invite/${invitation.code}`
      )
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
      admins.map((a) =>
        send(a, cronFailed(a.lang, jobs, day), { category: "officer" })
      )
    );
  },
  "programmes.audition_update": async (admin, payload) => {
    const [to, { data: audition }] = await Promise.all([
      recipient(admin, payload.user_id),
      admin
        .schema("programmes")
        .from("auditions")
        .select(
          "starts_at, ends_at, location_en, location_ar, prepare_en, prepare_ar, production:productions(title_en, title_ar)"
        )
        .eq("id", String(payload.audition_id))
        .maybeSingle(),
    ]);
    const { status } = payload;
    if (
      to &&
      audition?.production &&
      (status === "signed_up" ||
        status === "called_back" ||
        status === "cast" ||
        status === "not_cast")
    ) {
      await send(
        to,
        auditionUpdate(
          to.lang,
          {
            ...audition,
            production_ar: audition.production.title_ar ?? "",
            production_en: audition.production.title_en,
          },
          status,
          appUrl()
        )
      );
    }
  },
  "programmes.removal_done": async (admin, payload) => {
    const request = await removalInfo(admin, payload.request_id);
    if (
      request &&
      (request.status === "removed" ||
        request.status === "declined" ||
        request.status === "closed")
    ) {
      const lang = langOf(request.requester_lang);
      await send(
        { email: request.requester_email, lang },
        removalDone(lang, request.status, request.action_taken)
      );
    }
  },
  "programmes.removal_overdue": async (admin, payload) => {
    const [request, managers] = await Promise.all([
      removalInfo(admin, payload.request_id),
      programmeManagers(admin, payload.programme_id),
    ]);
    if (request) {
      await Promise.all(
        managers.map((m) =>
          send(m, removalRequested(m.lang, request, appUrl(), true), {
            category: "officer",
          })
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
        send(m, removalRequested(m.lang, request, appUrl()), {
          category: "officer",
        })
      ),
      // The requester has no account: their language is the request's.
      send(
        {
          email: request.requester_email,
          lang: langOf(request.requester_lang),
        },
        removalReceived(langOf(request.requester_lang), request.due_at)
      ),
    ]);
  },
  // One email a day to Membership, which runs every role's applications.
  "programmes.replies_digest": async (admin) => {
    const since = new Date(Date.now() - 86_400_000).toISOString();
    const { data: replies } = await admin
      .schema("programmes")
      .from("opening_replies")
      .select("user_id, note, opening:openings(title_en, title_ar)")
      .gt("created_at", since)
      .order("created_at");
    if (!replies?.length) {
      return;
    }
    const { data: people } = await admin
      .schema("core")
      .from("profiles")
      .select("id, full_name_en, full_name_ar")
      .in(
        "id",
        replies.map((r) => r.user_id)
      );
    const managers = await holders(admin, "members.manage");
    await Promise.all(
      managers.map((m) => {
        const lines = replies.map((r) => {
          const person = people?.find((p) => p.id === r.user_id);
          return {
            member:
              (m.lang === "ar" ? person?.full_name_ar : person?.full_name_en) ??
              person?.full_name_en ??
              "",
            note: r.note,
            role:
              (m.lang === "ar" ? r.opening?.title_ar : r.opening?.title_en) ??
              r.opening?.title_en ??
              "",
          };
        });
        return send(m, repliesDigest(m.lang, lines, appUrl()), {
          category: "officer",
        });
      })
    );
  },
  "programmes.reply_update": async (admin, payload) => {
    const [to, { data: reply }] = await Promise.all([
      recipient(admin, payload.user_id),
      admin
        .schema("programmes")
        .from("opening_replies")
        .select("status, talk_at, opening:openings(title_en, title_ar)")
        .eq("opening_id", String(payload.opening_id))
        .eq("user_id", String(payload.user_id))
        .maybeSingle(),
    ]);
    const status = reply?.status;
    if (
      to &&
      reply?.opening &&
      (status === "talking" || status === "offered" || status === "not_picked")
    ) {
      const role =
        (to.lang === "ar" ? reply.opening.title_ar : reply.opening.title_en) ??
        reply.opening.title_en ??
        "";
      await send(
        to,
        replyUpdate(to.lang, role, status, reply.talk_at, appUrl())
      );
    }
  },
  "programmes.shift_reminder": async (admin, payload) => {
    const [to, { data: shift }] = await Promise.all([
      recipient(admin, payload.user_id),
      admin
        .schema("programmes")
        .from("shifts")
        .select("role_en, role_ar, location_en, location_ar, starts_at")
        .eq("id", String(payload.shift_id))
        .maybeSingle(),
    ]);
    // Optional: without optional email, Telegram only (`send`).
    if (to && shift) {
      await send(
        to,
        shiftReminder(
          to.lang,
          { ...shift, role_ar: shift.role_ar ?? "", role_en: shift.role_en },
          appUrl()
        ),
        { category: "optional" }
      );
    }
  },
  revalidate: async (_admin, payload) => {
    await revalidate(payload.tags);
  },
  // The Sunday Paper (owner, Nov 7, 2026): one Broadcast in each language to
  // members who take optional email and the public list, with each
  // person's own stop link as a contact property.
  "sunday_paper.broadcast": async (admin, payload) => {
    await cleanUpSegments(admin);
    await pullUnsubscribes(admin);
    const { data: everyone, error } = await admin
      .schema("core")
      .rpc("sunday_paper_recipients");
    if (error) {
      throw error;
    }
    const month = String(payload.month ?? "");
    const waiting: string[] = [];
    for (const lang of ["en", "ar"] as const) {
      // biome-ignore lint/performance/noAwaitInLoops: one language at a time
      const paper = await paperContents(admin, lang, payload.since);
      if (!paper) {
        // Nothing to carry in this language this month.
        continue;
      }
      const contacts: BroadcastContact[] = (everyone ?? [])
        .filter((person) => person.lang === lang)
        .map((person) => ({
          email: person.email,
          properties: {
            stop_url: person.user_id
              ? stopLinks(lang, person.user_id).page
              : unsubscribeLinks(lang, person.token ?? "").page,
          },
        }));
      const line = FOOTER_LINES.optional[lang];
      try {
        await runBroadcast(admin, {
          built: sundayPaper(lang, paper),
          contacts,
          footer: [
            {
              href: contactField("stop_url"),
              link: line.link,
              text: line.text,
            },
          ],
          key: `sunday-paper:${month}:${lang}`,
          kind: "sunday_paper",
          lang,
        });
      } catch (failure) {
        if (!(failure instanceof BroadcastPending)) {
          throw failure;
        }
        waiting.push(failure.message);
      }
    }
    if (waiting.length > 0) {
      throw new BroadcastPending(waiting.join(" "));
    }
  },
  // The renumbering (decisions §10): a saved pass shows the new number.
  "wallet.renumber": async (_admin, payload) => {
    if (
      walletConfigured() &&
      typeof payload.code === "string" &&
      typeof payload.number === "number"
    ) {
      await renumberWalletPass(payload.code, payload.number);
    }
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

/**
 * Mail that can wait while the Society is on Resend's free plan (audit A1):
 * the welcome is part of the confirmation email now, and reminders and
 * digests have Hudhud or the account's own pages.
 */
export const NON_ESSENTIAL = new Set([
  "membership.welcome",
  "journal.call_opened",
  "journal.piece_note",
  "events.reminder",
  "programmes.shift_reminder",
  "programmes.replies_digest",
]);

const essentialOnly = async (admin: AdminClient) => {
  const { data } = await admin
    .schema("core")
    .from("settings")
    .select("value")
    .eq("key", "email.essential_only")
    .maybeSingle();
  // On unless the setting says otherwise.
  return data?.value !== false;
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
  // On Resend's free plan (100 emails a day) only the essential mail goes
  // (audit A1); the rest is set aside, marked so, until the plan is raised
  // and core.settings `email.essential_only` is turned off.
  const skipped =
    NON_ESSENTIAL.has(row.kind) && (await essentialOnly(admin))
      ? "skipped: essential mail only (Resend free plan)"
      : null;
  const handler =
    !skipped && Object.hasOwn(handlers, row.kind)
      ? handlers[row.kind]
      : undefined;
  try {
    if (handler) {
      await current.run({ admin, kind: row.kind, row: id }, () =>
        handler(admin, (row as OutboxRow).payload)
      );
    }
    await admin
      .schema("core")
      .from("outbox")
      .update({
        last_error: skipped ?? (handler ? null : "no handler"),
        processed_at: new Date().toISOString(),
      })
      .eq("id", id);
    return true;
  } catch (error) {
    const quota = error instanceof EmailQuotaError;
    // A Broadcast whose contact import is still running carries on at the
    // next drain, without spending a try.
    const pending = error instanceof BroadcastPending;
    await admin
      .schema("core")
      .from("outbox")
      .update({
        // A spent sending limit is not the row's fault: give the try back.
        ...(quota || pending ? { attempts: previousAttempts } : {}),
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
