import { render } from "@react-email/components";
import {
  accountDeleted,
  agreementReminder,
  applicationDecided,
  applicationReceived,
  applicationWaiting,
  auditionUpdate,
  type Built,
  callOpened,
  candidacyDecided,
  certificateIssued,
  cronFailed,
  decision,
  type EventInfo,
  electionStage,
  eventChanged,
  eventReminder,
  finalCheck,
  formLink,
  formSignedCopy,
  invitation,
  type Lang,
  newsletterConfirm,
  pieceNote,
  piecePublished,
  type RemovalInfo,
  type RoleInfo,
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
  serviceLetterWritten,
  shiftReminder,
  submissionReceived,
  sundayPaper,
  twoStepReset,
  verificationDecided,
  waitlistOffered,
  waitlistPromoted,
  welcome,
} from "@repo/email/copy";
import { Notice } from "@repo/email/templates/notice";
import type { Meta, StoryObj } from "@storybook/react";

/**
 * Every email the platform sends, rendered from the same @repo/email/copy
 * builders the API routes send with, in English and Arabic. Sample data only.
 */
const meta = {
  title: "Emails/Platform",
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const APP = "https://auibsal.org";
const WORK = "The paper and the pen";
const PIECE = "00000000-0000-4000-8000-000000000001";
const event: EventInfo = {
  slug: "writing-workshop",
  starts_at: "2026-10-13T15:00:00Z",
  title_ar: "صفحات مفتوحة",
  title_en: "Writing workshop",
  venue_ar: "مكتبة الجامعة",
  venue_en: "University Library",
};
const role: RoleInfo = {
  ends_at: "2027-05-13T20:59:59Z",
  name_ar: "قائد الفعالية",
  name_en: "Event Lead",
};
const removal: RemovalInfo = {
  content_url: "https://auibsal.org/qirtas/pieces/example",
  details: "Please remove the photo of me from this post.",
  due_at: "2026-10-09T15:00:00Z",
  requester_email: "member@auib.edu.iq",
  requester_name: "A Member",
};

const LANGS = ["en", "ar"] as const;

/** Each language in its own frame like a mail client: an email is only ever in one. */
const email = (make: (lang: Lang) => Built): Story => ({
  loaders: [
    async () => ({
      html: await Promise.all(
        LANGS.map((lang) => render(<Notice {...make(lang)} />))
      ),
    }),
  ],
  render: (_args, { loaded }) => (
    <div className="grid gap-6 md:grid-cols-2">
      {LANGS.map((lang, i) => (
        <figure className="grid gap-2" key={lang}>
          <figcaption className="type-caption">{make(lang).subject}</figcaption>
          <iframe
            className="border-line h-[720px] w-full border"
            sandbox="allow-popups allow-popups-to-escape-sandbox"
            srcDoc={(loaded.html as string[])[i]}
            title={make(lang).subject}
          />
        </figure>
      ))}
    </div>
  ),
});

export const AgreementReminder = email((l) => agreementReminder(l, WORK, APP));
export const CallOpened = email((l) =>
  callOpened(
    l,
    {
      closes_at: "2026-11-26T20:59:00Z",
      title_ar: "دعوة الإصدار",
      title_en: "The Edition call",
    },
    APP
  )
);
export const DecisionAccept = email((l) => decision(l, WORK, "accept", APP));
export const DecisionAcceptWithEdits = email((l) =>
  decision(l, WORK, "accept_with_edits", APP)
);
export const DecisionDecline = email((l) => decision(l, WORK, "decline", APP));
export const EventReminder = email((l) => eventReminder(l, event, APP));
export const EventReminderRemindMe = email((l) =>
  eventReminder(l, event, APP, false)
);
export const WaitlistOffered = email((l) =>
  waitlistOffered(l, event, APP, "2026-10-12T21:00:00Z")
);
export const VerificationApproved = email((l) =>
  verificationDecided(l, true, APP)
);
export const VerificationDeclined = email((l) =>
  verificationDecided(l, false, APP)
);
export const TwoStepResetByOfficer = email((l) =>
  twoStepReset(l, "officer", APP)
);
export const TwoStepResetWithCode = email((l) =>
  twoStepReset(l, "recovery_code", APP)
);
export const RecoveryAttempts = email((l) => recoveryAttempts(l, APP));
export const RemovalOverdue = email((l) =>
  removalRequested(l, removal, APP, true)
);
export const RemovalReceived = email((l) => removalReceived(l, removal.due_at));
export const RemovalRequested = email((l) => removalRequested(l, removal, APP));
export const ReturnedForFormatting = email((l) =>
  returnedForFormatting(l, WORK, "Please send it as one document.", APP)
);
export const RoleEnding = email((l) => roleEnding(l, role, APP));
export const RsvpConfirmed = email((l) => rsvpConfirmed(l, event, APP));
export const SubmissionReceived = email((l) =>
  submissionReceived(l, WORK, APP)
);
export const WaitlistPromoted = email((l) => waitlistPromoted(l, event, APP));
export const SubmissionReceivedNamed = email((l) =>
  submissionReceived(l, WORK, APP, "named")
);
export const FinalCheck = email((l) => finalCheck(l, WORK, PIECE, APP));
export const PieceNote = email((l) => pieceNote(l, WORK, PIECE, APP));
export const PiecePublished = email((l) =>
  piecePublished(l, WORK, "https://auibsal.org/qirtas/pieces/sample")
);
export const SundayPaper = email((l) =>
  sundayPaper(l, {
    events: [{ ...event, url: "https://auibsal.org/events/sample" }],
    front: "https://auibsal.org/qirtas",
    getInvolved: "https://auibsal.org/get-involved",
    pieces: [
      {
        desk_ar: "أخبار",
        desk_en: "News",
        title_ar: "عنوان تجريبي",
        title_en: "Sample headline",
        url: "https://auibsal.org/qirtas/pieces/sample",
      },
    ],
    places: [{ title_ar: "مصوّر", title_en: "Photographer" }],
  })
);
export const NewsletterConfirm = email((l) =>
  newsletterConfirm(l, "https://auibsal.org/newsletter/confirm?token=sample")
);
export const CronFailed = email((l) =>
  cronFailed(
    l,
    [{ failures: 2, job: "daily-notices", last_error: "Sample error" }],
    "2026-10-13T15:00:00Z"
  )
);

// ── Added in the email audit (Nov 4, 2026) ─────────────────────────────────

const PARTNER = { ar: "نادي الكتاب", en: "The Book Club" };
const election = {
  nominations_close_at: "2027-04-11T20:59:59Z",
  nominations_open_at: "2027-04-04T05:00:00Z",
  title_ar: "انتخابات المجلس 2027",
  title_en: "Council elections 2027",
  voting_closes_at: "2027-04-15T20:59:59Z",
  voting_opens_at: "2027-04-14T05:00:00Z",
};
const audition = {
  ends_at: "2027-01-20T15:00:00Z",
  location_ar: "المسرح",
  location_en: "The theater",
  prepare_ar: "مقطع قصير تحفظه",
  prepare_en: "A short piece you know by heart",
  production_ar: "قراءة مسرحية",
  production_en: "A staged reading",
  starts_at: "2027-01-20T13:00:00Z",
};

export const EventCanceled = email((l) =>
  eventChanged(l, event, "canceled", APP)
);
export const EventMoved = email((l) => eventChanged(l, event, "moved", APP));
export const ApplicationReceived = email((l) =>
  applicationReceived(l, PARTNER[l], APP)
);
export const ApplicationWaiting = email((l) =>
  applicationWaiting(l, PARTNER[l], APP)
);
export const ApplicationApproved = email((l) =>
  applicationDecided(l, PARTNER[l], true, APP)
);
export const ApplicationDeclined = email((l) =>
  applicationDecided(l, PARTNER[l], false, APP)
);
export const ElectionNotice = email((l) =>
  electionStage(l, election, "notice", APP)
);
export const ElectionVoting = email((l) =>
  electionStage(l, election, "voting", APP)
);
export const ElectionResults = email((l) =>
  electionStage(l, election, "published", APP)
);
export const CandidacyApproved = email((l) =>
  candidacyDecided(l, { title_ar: "الرئيس", title_en: "President" }, true, APP)
);
export const CertificateIssued = email((l) =>
  certificateIssued(
    l,
    l === "ar" ? "مدير الإعلام" : "Director of Media",
    PIECE,
    APP
  )
);
export const ServiceLetterWritten = email((l) =>
  serviceLetterWritten(
    l,
    l === "ar" ? "محرر الأخبار" : "News Editor",
    PIECE,
    APP
  )
);
export const FormSignedCopy = email((l) =>
  formSignedCopy(l, {
    answers: [
      {
        label: l === "ar" ? "عنوان الفعالية" : "Event title",
        value: l === "ar" ? "قراءة على ضفة النهر" : "A reading on the river",
      },
    ],
    code: "F-11",
    fingerprint:
      "9f2c4e0b7a1d3c5e8f6a2b4d6c8e0f1a3b5c7d9e1f2a4b6c8d0e2f4a6b8c0d2e",
    signedAt: "2026-11-09T15:00:00Z",
    signer: l === "ar" ? "سارة أحمد" : "Sara Ahmed",
    title: l === "ar" ? "مقترح فعالية" : "Event pitch",
    url: `${APP}/account/requests/${PIECE}`,
  })
);
export const FormLink = email((l) =>
  formLink(l, {
    code: "F-38",
    title: l === "ar" ? "موافقة ولي الأمر" : "Parent’s consent",
    url: `${APP}/forms/F-38?link=example`,
  })
);
export const RequestAcknowledged = email((l) =>
  requestUpdated(l, "f20", "acknowledged", PIECE, APP)
);
export const RequestClosed = email((l) =>
  requestUpdated(l, "f10", "closed", PIECE, APP)
);
export const RemovalDone = email((l) => removalDone(l, "removed", null));
export const ReplyTalking = email((l) =>
  replyUpdate(
    l,
    l === "ar" ? "مصوّر" : "Photographer",
    "talking",
    "2026-11-10T13:00:00Z",
    APP
  )
);
export const ReplyOffered = email((l) =>
  replyUpdate(l, l === "ar" ? "مصوّر" : "Photographer", "offered", null, APP)
);
export const AuditionBooked = email((l) =>
  auditionUpdate(l, audition, "signed_up", APP)
);
export const AuditionCast = email((l) =>
  auditionUpdate(l, audition, "cast", APP)
);
export const RoleAssigned = email((l) => roleAssigned(l, role, true, APP));
export const Welcome = email((l) => welcome(l, APP));
export const ShiftReminder = email((l) =>
  shiftReminder(
    l,
    {
      location_ar: "معرض الكتب",
      location_en: "The book fair",
      role_ar: "استقبال",
      role_en: "Welcome desk",
      starts_at: "2026-11-09T07:00:00Z",
    },
    APP
  )
);
export const TourInvitation = email((l) =>
  invitation(
    l,
    {
      first_name: l === "ar" ? "الاسم" : "Name",
      kind: "tour",
      pages: 1,
      station: l === "ar" ? "المكتبة" : "Library",
      words:
        l === "ar" ? "ست كلمات كتبها الكاتب" : "Six words the writer typed",
    },
    `${APP}/join`
  )
);
export const PlainInvitation = email((l) =>
  invitation(
    l,
    { first_name: null, kind: "plain", pages: 0, station: null, words: null },
    `${APP}/join`
  )
);
export const AccountDeleted = email((l) => accountDeleted(l));
export const RepliesDigest = email((l) =>
  repliesDigest(
    l,
    [
      {
        count: 2,
        role: l === "ar" ? "محرر الأخبار" : "News Editor",
      },
    ],
    APP
  )
);
