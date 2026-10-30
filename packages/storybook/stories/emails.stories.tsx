import { render } from "@react-email/components";
import {
  agreementReminder,
  type Built,
  callOpened,
  cronFailed,
  decision,
  type EventInfo,
  eventReminder,
  finalCheck,
  type Lang,
  newsletterConfirm,
  openingReply,
  pieceNote,
  piecePublished,
  type RemovalInfo,
  type RoleInfo,
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
import { Notice } from "@repo/email/templates/notice";
import type { Meta, StoryObj } from "@storybook/react";

/**
 * Every email the platform sends, rendered from the same @repo/email/copy
 * builders the API routes send with, in English and Arabic. Sample data only.
 */
const meta = {
  title: "SAL/Emails",
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const APP = "https://auibsal.org";
const WORK = "The paper and the pen";
const PIECE = "00000000-0000-4000-8000-000000000001";
const event: EventInfo = {
  starts_at: "2026-10-13T15:00:00Z",
  title_ar: "صفحات مفتوحة",
  title_en: "Open Pages",
  venue_ar: "مكتبة الجامعة",
  venue_en: "University Library",
};
const role: RoleInfo = {
  ends_at: "2027-05-13T20:59:59Z",
  name_ar: "مدير الفعاليات",
  name_en: "Director of Programs",
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
            className="h-[720px] w-full border border-line"
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
export const RemovalOverdue = email((l) =>
  removalRequested(l, removal, APP, true)
);
export const RemovalReceived = email((l) => removalReceived(l, removal.due_at));
export const RemovalRequested = email((l) => removalRequested(l, removal, APP));
export const ReturnedForFormatting = email((l) =>
  returnedForFormatting(l, WORK, "Please send it as one document.", APP)
);
export const RoleEnding = email((l) => roleEnding(l, role, APP));
export const OpeningReply = email((l) =>
  openingReply(
    l,
    {
      member: l === "ar" ? "اسم العضو" : "A member's name",
      note: null,
      title: l === "ar" ? "مصوّر" : "Photographer",
    },
    APP
  )
);
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
    callboard: "https://auibsal.org/get-involved",
    events: [{ ...event, url: "https://auibsal.org/events/sample" }],
    front: "https://auibsal.org/qirtas",
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
    stop: "https://auibsal.org/emails/stop?token=sample",
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
