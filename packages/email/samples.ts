import {
  accountDeleted,
  agreementReminder,
  applicationDecided,
  applicationReceived,
  associateRequestReceived,
  auditionUpdate,
  type Built,
  callOpened,
  candidacyDecided,
  candidacyReceived,
  certificateIssued,
  concernRaised,
  cronFailed,
  decision,
  type EventInfo,
  electionStage,
  eventChanged,
  eventReminder,
  finalCheck,
  formLink,
  formSignedCopy,
  incidentReported,
  invitation,
  type Lang,
  membershipRemoved,
  newsletterConfirm,
  notionInvite,
  parentAccount,
  pieceNote,
  piecePublished,
  type RemovalInfo,
  type RoleInfo,
  recoveryAttempts,
  removalDone,
  removalReceived,
  removalRequested,
  replyUpdate,
  requestUpdated,
  returnedForFormatting,
  revisionRequested,
  revisionResent,
  roleAssigned,
  roleEnding,
  rsvpConfirmed,
  serviceLetterWritten,
  shiftReminder,
  staffDigest,
  submissionInReading,
  submissionReceived,
  sundayPaper,
  twoStepReset,
  verificationDecided,
  waitlistOffered,
  waitlistPromoted,
  welcome,
} from "./copy";

/**
 * A sample of every email the platform sends, filled with sample data
 * only: the design system draws each (Emails/Platform), and staff mail
 * one to themselves in both languages from the design page
 * (/api/design/test-email).
 */

const APP = "https://auibsal.org";
// A placeholder for the workspace's invite link (core.settings).
const NOTION_INVITE = "https://www.notion.so/team/join";
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

export const samples = {
  AccountDeleted: (l) => accountDeleted(l),
  AgreementReminder: (l) => agreementReminder(l, WORK, APP),
  ApplicationApproved: (l) => applicationDecided(l, PARTNER[l], true, APP),
  ApplicationDeclined: (l) => applicationDecided(l, PARTNER[l], false, APP),
  ApplicationReceived: (l) => applicationReceived(l, PARTNER[l], APP),
  AssociateRequestReceived: (l) => associateRequestReceived(l),
  AuditionBooked: (l) => auditionUpdate(l, audition, "signed_up", APP),
  AuditionCast: (l) => auditionUpdate(l, audition, "cast", APP),
  CallOpened: (l) =>
    callOpened(
      l,
      {
        closes_at: "2026-11-26T20:59:00Z",
        title_ar: "دعوة الإصدار",
        title_en: "The Edition call",
      },
      APP
    ),
  CandidacyApproved: (l) =>
    candidacyDecided(
      l,
      { title_ar: "الرئيس", title_en: "President" },
      true,
      APP
    ),
  CandidacyReceived: (l) =>
    candidacyReceived(l, { title_ar: "الرئيس", title_en: "President" }, APP),
  CertificateIssued: (l) =>
    certificateIssued(
      l,
      l === "ar" ? "مدير الإعلام" : "Director of Media",
      PIECE,
      APP
    ),
  ConcernRaised: (l) => concernRaised(l, APP),
  CronFailed: (l) =>
    cronFailed(
      l,
      [{ failures: 2, job: "daily-notices", last_error: "Sample error" }],
      "2026-10-13T15:00:00Z"
    ),
  DecisionAccept: (l) => decision(l, WORK, "accept", APP),
  DecisionAcceptWithEdits: (l) => decision(l, WORK, "accept_with_edits", APP),
  DecisionDecline: (l) => decision(l, WORK, "decline", APP),
  DecisionRevise: (l) =>
    revisionRequested(
      l,
      WORK,
      l === "ar"
        ? "المقطع الأخير يكرر الأول؛ جرّب أن تنهي بصورة جديدة."
        : "The last stanza repeats the first; try ending on a new image.",
      APP
    ),
  ElectionNotice: (l) => electionStage(l, election, "notice", APP),
  ElectionResults: (l) => electionStage(l, election, "published", APP),
  ElectionVoting: (l) => electionStage(l, election, "voting", APP),
  EventCanceled: (l) => eventChanged(l, event, "canceled", APP),
  EventMoved: (l) => eventChanged(l, event, "moved", APP),
  EventReminder: (l) => eventReminder(l, event, APP),
  EventReminderRemindMe: (l) => eventReminder(l, event, APP, false),
  FinalCheck: (l) => finalCheck(l, WORK, PIECE, APP),
  FormLink: (l) =>
    formLink(l, {
      title: l === "ar" ? "موافقة ولي الأمر" : "Parent’s consent",
      url: `${APP}/consent/qalam?link=example`,
    }),
  FormSignedCopy: (l) =>
    formSignedCopy(l, {
      answers: [
        {
          label: l === "ar" ? "عنوان الفعالية" : "Event title",
          value: l === "ar" ? "قراءة على ضفة النهر" : "A reading on the river",
        },
      ],
      fingerprint:
        "9f2c4e0b7a1d3c5e8f6a2b4d6c8e0f1a3b5c7d9e1f2a4b6c8d0e2f4a6b8c0d2e",
      reference: "AGR-2026-0001",
      signedAt: "2026-11-09T15:00:00Z",
      signer: l === "ar" ? "سارة أحمد" : "Sara Ahmed",
      title: l === "ar" ? "مقترح فعالية" : "Event pitch",
      url: `${APP}/account/requests/${PIECE}`,
      verifyUrl: `${APP}/verify/a1b2c3d4e5`,
    }),
  IncidentReported: (l) =>
    incidentReported(
      l,
      {
        slug: "writing-workshop",
        title: l === "ar" ? "ورشة الكتابة" : "Writing workshop",
      },
      APP
    ),
  MembershipRemoved: (l) => membershipRemoved(l, APP),
  NewsletterConfirm: (l) =>
    newsletterConfirm(l, "https://auibsal.org/newsletter/confirm?token=sample"),
  NotionInvite: (l) => notionInvite(l, NOTION_INVITE),
  ParentAccount: (l) => parentAccount(l, false, APP),
  ParentAccountQalam: (l) => parentAccount(l, false, APP, true),
  PieceNote: (l) => pieceNote(l, WORK, PIECE, APP),
  PiecePublished: (l) =>
    piecePublished(l, WORK, "https://auibsal.org/qirtas/pieces/sample"),
  PlainInvitation: (l) =>
    invitation(
      l,
      { first_name: null, kind: "plain", pages: 0, station: null, words: null },
      `${APP}/join`
    ),
  RecoveryAttempts: (l) => recoveryAttempts(l, APP),
  RemovalDone: (l) => removalDone(l, "removed", null),
  RemovalOverdue: (l) => removalRequested(l, removal, APP, true),
  RemovalReceived: (l) => removalReceived(l, removal.due_at),
  RemovalRequested: (l) => removalRequested(l, removal, APP),
  ReplyOffered: (l) =>
    replyUpdate(l, l === "ar" ? "مصوّر" : "Photographer", "offered", null, APP),
  ReplyTalking: (l) =>
    replyUpdate(
      l,
      l === "ar" ? "مصوّر" : "Photographer",
      "talking",
      "2026-11-10T13:00:00Z",
      APP
    ),
  RequestAcknowledged: (l) =>
    requestUpdated(l, "charity-collection-count", "acknowledged", PIECE, APP),
  RequestClosed: (l) =>
    requestUpdated(l, "members-meeting-motion", "closed", PIECE, APP),
  ReturnedForFormatting: (l) =>
    returnedForFormatting(l, WORK, "Please send it as one document.", APP),
  RevisionResent: (l) => revisionResent(l, WORK, APP),
  RoleAssigned: (l) => roleAssigned(l, role, true, APP, NOTION_INVITE),
  RoleEnding: (l) => roleEnding(l, role, APP),
  RsvpConfirmed: (l) => rsvpConfirmed(l, event, APP),
  ServiceLetterWritten: (l) =>
    serviceLetterWritten(
      l,
      l === "ar" ? "محرر الأخبار" : "News Editor",
      PIECE,
      APP
    ),
  ShiftReminder: (l) =>
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
    ),
  StaffDigest: (l) =>
    staffDigest(
      l,
      [
        {
          items: [
            { meta: "2", title: l === "ar" ? "محرر الأخبار" : "News Editor" },
          ],
          title: l === "ar" ? "طلبات «شارك معنا»" : "Get involved applications",
        },
        {
          items: [{ title: PARTNER[l] }],
          title: l === "ar" ? "طلبات الشراكة" : "Partner applications",
        },
      ],
      APP
    ),
  SubmissionInReading: (l) => submissionInReading(l, WORK, APP, "SUB-2026-001"),
  SubmissionReceived: (l) =>
    submissionReceived(l, WORK, APP, "blind", "SUB-2026-001"),
  SubmissionReceivedNamed: (l) => submissionReceived(l, WORK, APP, "named"),
  SundayPaper: (l) =>
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
    }),
  TourInvitation: (l) =>
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
    ),
  TwoStepResetByOfficer: (l) => twoStepReset(l, "officer", APP),
  TwoStepResetWithCode: (l) => twoStepReset(l, "recovery_code", APP),
  VerificationApproved: (l) => verificationDecided(l, true, APP),
  VerificationDeclined: (l) => verificationDecided(l, false, APP),
  WaitlistOffered: (l) =>
    waitlistOffered(l, event, APP, "2026-10-12T21:00:00Z"),
  WaitlistPromoted: (l) => waitlistPromoted(l, event, APP),
  Welcome: (l) => welcome(l, APP),
} satisfies Record<string, (lang: Lang) => Built>;

export type SampleName = keyof typeof samples;
