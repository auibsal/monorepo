import { render } from "@react-email/components";
import type { Built, Lang } from "@repo/email/copy";
import { samples } from "@repo/email/samples";
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

export const AgreementReminder = email(samples.AgreementReminder);
export const CallOpened = email(samples.CallOpened);
export const DecisionAccept = email(samples.DecisionAccept);
export const DecisionAcceptWithEdits = email(samples.DecisionAcceptWithEdits);
export const DecisionDecline = email(samples.DecisionDecline);
export const DecisionRevise = email(samples.DecisionRevise);
export const RevisionResent = email(samples.RevisionResent);
export const EventReminder = email(samples.EventReminder);
export const EventReminderRemindMe = email(samples.EventReminderRemindMe);
export const WaitlistOffered = email(samples.WaitlistOffered);
export const VerificationApproved = email(samples.VerificationApproved);
export const VerificationDeclined = email(samples.VerificationDeclined);
export const TwoStepResetByOfficer = email(samples.TwoStepResetByOfficer);
export const TwoStepResetWithCode = email(samples.TwoStepResetWithCode);
export const RecoveryAttempts = email(samples.RecoveryAttempts);
export const ConcernRaised = email(samples.ConcernRaised);
export const IncidentReported = email(samples.IncidentReported);
export const RemovalOverdue = email(samples.RemovalOverdue);
export const RemovalReceived = email(samples.RemovalReceived);
export const RemovalRequested = email(samples.RemovalRequested);
export const ReturnedForFormatting = email(samples.ReturnedForFormatting);
export const RoleEnding = email(samples.RoleEnding);
export const RsvpConfirmed = email(samples.RsvpConfirmed);
export const SubmissionReceived = email(samples.SubmissionReceived);
export const SubmissionInReading = email(samples.SubmissionInReading);
export const WaitlistPromoted = email(samples.WaitlistPromoted);
export const SubmissionReceivedNamed = email(samples.SubmissionReceivedNamed);
export const FinalCheck = email(samples.FinalCheck);
export const MembershipRemoved = email(samples.MembershipRemoved);
export const ParentAccount = email(samples.ParentAccount);
export const PieceNote = email(samples.PieceNote);
export const PiecePublished = email(samples.PiecePublished);
export const SundayPaper = email(samples.SundayPaper);
export const NewsletterConfirm = email(samples.NewsletterConfirm);
export const CronFailed = email(samples.CronFailed);
export const EventCanceled = email(samples.EventCanceled);
export const EventMoved = email(samples.EventMoved);
export const ApplicationReceived = email(samples.ApplicationReceived);
export const ApplicationApproved = email(samples.ApplicationApproved);
export const ApplicationDeclined = email(samples.ApplicationDeclined);
export const ElectionNotice = email(samples.ElectionNotice);
export const ElectionVoting = email(samples.ElectionVoting);
export const ElectionResults = email(samples.ElectionResults);
export const CandidacyApproved = email(samples.CandidacyApproved);
export const CertificateIssued = email(samples.CertificateIssued);
export const ServiceLetterWritten = email(samples.ServiceLetterWritten);
export const FormSignedCopy = email(samples.FormSignedCopy);
export const FormLink = email(samples.FormLink);
export const RequestAcknowledged = email(samples.RequestAcknowledged);
export const RequestClosed = email(samples.RequestClosed);
export const RemovalDone = email(samples.RemovalDone);
export const ReplyTalking = email(samples.ReplyTalking);
export const ReplyOffered = email(samples.ReplyOffered);
export const AuditionBooked = email(samples.AuditionBooked);
export const AuditionCast = email(samples.AuditionCast);
export const RoleAssigned = email(samples.RoleAssigned);
export const Welcome = email(samples.Welcome);
export const ShiftReminder = email(samples.ShiftReminder);
export const TourInvitation = email(samples.TourInvitation);
export const PlainInvitation = email(samples.PlainInvitation);
export const AccountDeleted = email(samples.AccountDeleted);
export const StaffDigest = email(samples.StaffDigest);
