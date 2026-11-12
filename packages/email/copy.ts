import { diwanPath, localizedPath } from "@repo/internationalization";
import { formatClock, formatLongDate } from "@repo/internationalization/format";
import type {
  NoticeBlock,
  NoticeList,
  NoticeProps,
  NoticeSignoff,
} from "./templates/notice";

/**
 * The words of every platform email, in both languages. Each email goes
 * out in the member's language only (SAL-MED-02: one language per piece).
 * Arabic here is Modern Standard Arabic, written for the platform.
 */
export type Lang = "en" | "ar";

interface Copy {
  action?: { fallback?: boolean; href: string; label: string };
  heading: string;
  lists?: NoticeList[];
  paragraphs: string[];
  signoff?: NoticeSignoff;
}

export interface Built extends NoticeProps {
  subject: string;
}

/**
 * Builds the notice in the recipient's language only. The subject is the
 * heading; the preview line (what the inbox shows after it) is the first
 * sentence, so the two never repeat each other.
 */
const build = (lang: Lang, make: (l: Lang) => Copy): Built => {
  const copy = make(lang);
  const blocks: NoticeBlock[] = [{ lang, ...copy }];
  const preview = (copy.paragraphs[0] ?? copy.lists?.[0]?.title ?? "")
    .slice(0, 140)
    .trim();
  return {
    blocks,
    preview: preview || copy.heading,
    subject: copy.heading,
  };
};

const when = (iso: string, l: Lang) =>
  `${formatLongDate(iso, l)} · ${formatClock(iso, l)}`;

/** A member's own page on the site (Membership, Qirtas, …). */
const account = (base: string, l: Lang, path = "/account") => ({
  href: `${base}${localizedPath(l, path)}`,
  label: l === "ar" ? "افتح حسابك" : "Open your account",
});

/** A page in the Diwan, for officers. */
const diwan = (base: string, l: Lang, path = "") => ({
  href: `${base}${localizedPath(l, diwanPath(path || "/"))}`,
  label: l === "ar" ? "افتح الديوان" : "Open the Diwan",
});

export interface EventInfo {
  /** The event's address, for "Can't come? Cancel" (its page holds the booking). */
  slug?: string | null;
  starts_at: string;
  title_ar: string;
  title_en: string;
  venue_ar: string | null;
  venue_en: string | null;
}

const title = (e: EventInfo, l: Lang) => (l === "ar" ? e.title_ar : e.title_en);
const venue = (e: EventInfo, l: Lang) =>
  (l === "ar" ? e.venue_ar : e.venue_en) ??
  (l === "ar" ? e.venue_en : e.venue_ar);

const eventLines = (e: EventInfo, l: Lang) =>
  [when(e.starts_at, l), venue(e, l)].filter((x): x is string => Boolean(x));

/** Tickets and bookings live on My calendar. */
const MY_CALENDAR = "/account/calendar";

export const rsvpConfirmed = (lang: Lang, e: EventInfo, app: string) =>
  build(lang, (l) => ({
    action: account(app, l, MY_CALENDAR),
    heading:
      l === "ar"
        ? `حُجز مكانك: ${title(e, l)}`
        : `You're booked: ${title(e, l)}`,
    paragraphs: [
      ...eventLines(e, l),
      l === "ar"
        ? "تذكرتك في «تقويمي». وإن تغيّرت خططك فتنازل عن مكانك هناك ليأخذه غيرك."
        : "Your ticket is on My calendar. If your plans change, give your place back there so someone else can have it.",
    ],
  }));

/**
 * A released place held for the next on the waitlist (decisions.md,
 * Events): 12 hours, or until two hours before the start; the one button
 * claims it on the event's page.
 */
export const waitlistOffered = (
  lang: Lang,
  e: EventInfo,
  app: string,
  until: string
) =>
  build(lang, (l) => ({
    action: e.slug
      ? {
          href: `${app}${localizedPath(l, `/events/${e.slug}`)}`,
          label: l === "ar" ? "احجز المكان" : "Claim your place",
        }
      : account(app, l, MY_CALENDAR),
    heading:
      l === "ar"
        ? `مكان محجوز لك: ${title(e, l)}`
        : `A place is held for you: ${title(e, l)}`,
    paragraphs: [
      ...eventLines(e, l),
      l === "ar"
        ? `فرغ مكان وأنت التالي على قائمة الانتظار. نحفظه لك حتى ${when(until, l)}؛ وإن لم تحجزه حتى ذلك الحين ذهب إلى من بعدك.`
        : `A place opened up and you're next on the waiting list. It's held for you until ${when(until, l)}; if you don't claim it by then, it goes to the next person.`,
    ],
  }));

export const waitlistPromoted = (lang: Lang, e: EventInfo, app: string) =>
  build(lang, (l) => ({
    action: account(app, l, MY_CALENDAR),
    heading:
      l === "ar"
        ? `أصبح لك مكان: ${title(e, l)}`
        : `A place opened up: ${title(e, l)}`,
    paragraphs: [
      ...eventLines(e, l),
      l === "ar"
        ? "كنت على قائمة الانتظار، وقد حُجز لك مكان الآن. تذكرتك في «تقويمي»."
        : "You were on the waiting list and you now have a place. Your ticket is on My calendar.",
    ],
  }));

const REMINDER_CLOSE: Record<"booked" | "remindMe", Record<Lang, string>> = {
  booked: {
    ar: "إن لم تعد تستطيع الحضور، فألغِ حجزك ليأخذ مكانك غيرك.",
    en: "If you can no longer come, cancel so someone else can have your place.",
  },
  remindMe: {
    ar: "طلبت أن نذكّرك. لا حجز لهذه الفعالية: تعال فحسب.",
    en: "You asked us to remind you. There's no booking for this one: just come.",
  },
};

/** "Can't come? Cancel": the event's page, where the booking is canceled. */
const cancelAction = (app: string, l: Lang, e: EventInfo) =>
  e.slug
    ? {
        href: `${app}${localizedPath(l, `/events/${e.slug}`)}`,
        label:
          l === "ar" ? "لا تستطيع الحضور؟ ألغِ الحجز" : "Can’t come? Cancel",
      }
    : account(app, l, MY_CALENDAR);

/**
 * The day before (decisions.md, Events): one reminder to everyone booked,
 * whose one button is "Can't come? Cancel", and to everyone who asked
 * "Remind me" for an event without booking.
 */
export const eventReminder = (
  lang: Lang,
  e: EventInfo,
  app: string,
  booked = true
) =>
  build(lang, (l) => ({
    action: booked ? cancelAction(app, l, e) : account(app, l, MY_CALENDAR),
    heading: l === "ar" ? `غدًا: ${title(e, l)}` : `Tomorrow: ${title(e, l)}`,
    paragraphs: [
      ...eventLines(e, l),
      REMINDER_CLOSE[booked ? "booked" : "remindMe"][l],
    ],
  }));

/** Letters and Gallery are read blind; News, Video and Voices by name. */
export type DeskKind = "blind" | "named";

const RECEIVED: Record<DeskKind, Record<Lang, string[]>> = {
  blind: {
    ar: [
      "يُقرأ عملك قراءة عمياء: لا يرى القرّاء والمحررون اسمك حتى يُتَّخذ القرار.",
      "يسمع كل كاتب الجواب في اليوم المعلن، أيًا كان القرار. ويمكنك متابعة المراحل في صفحة الكتابة لقرطاس.",
    ],
    en: [
      "Your work is read blind: readers and editors never see your name until a decision is made.",
      "Every author hears by the announced date, either way. You can follow its progress on Write for Qirtas.",
    ],
  },
  named: {
    ar: [
      "سيقرؤه محرر القسم ويتواصل معك باسمك بشأن التحرير والتحقق من الوقائع.",
      "يمكنك متابعة المراحل في صفحة الكتابة لقرطاس.",
    ],
    en: [
      "The desk editor will read it and work with you by name on the edit and the facts.",
      "You can follow its progress on Write for Qirtas.",
    ],
  },
};

export const submissionReceived = (
  lang: Lang,
  work: string,
  app: string,
  desk: DeskKind = "blind",
  reference: string | null = null
) =>
  build(lang, (l) => ({
    action: account(app, l, "/qirtas/submit"),
    heading:
      l === "ar" ? `شكرًا، وصلنا ${work}` : `Thank you: we received ${work}`,
    paragraphs: [
      ...(reference
        ? [
            l === "ar"
              ? `رقم السجل: ${reference}.`
              : `Record number: ${reference}.`,
          ]
        : []),
      ...RECEIVED[desk][l],
    ],
  }));

/** In reading (decisions.md, Qirtas): it passed its check; readers have it. */
export const submissionInReading = (
  lang: Lang,
  work: string,
  app: string,
  reference: string | null = null
) =>
  build(lang, (l) => ({
    action: account(app, l, "/qirtas/submit"),
    heading: l === "ar" ? `قيد القراءة: ${work}` : `In reading: ${work}`,
    paragraphs: [
      l === "ar"
        ? "اجتاز عملك الفحص الأول، وهو الآن بين أيدي القرّاء. ستسمع منا حين يُتَّخذ القرار."
        : "Your work passed its first check and is now with the readers. You’ll hear from us when there’s a decision.",
      ...(reference
        ? [
            l === "ar"
              ? `رقم السجل: ${reference}.`
              : `Record number: ${reference}.`,
          ]
        : []),
    ],
  }));

export const returnedForFormatting = (
  lang: Lang,
  work: string,
  note: string,
  app: string
) =>
  build(lang, (l) => ({
    action: account(app, l, "/qirtas/submit"),
    heading:
      l === "ar"
        ? `تعديل واحد قبل القراءة: ${work}`
        : `One fix before reading: ${work}`,
    paragraphs: [
      ...(note ? [note] : []),
      l === "ar"
        ? "هذا تعديل واحد وفرصة واحدة قبل الموعد النهائي، ولا يُحسب ضد العمل. عدّله في صفحة عملك ثم احفظ."
        : "It is one specific fix, one chance, before the deadline, and it won't count against the piece. Revise it on its page and save.",
    ],
  }));

export type Decision = "accept" | "accept_with_edits" | "decline";

const ACCEPTED: Record<Exclude<Decision, "decline">, Record<Lang, string>> = {
  accept: {
    ar: "يسعدنا أن نخبرك بأن عملك قُبل.",
    en: "We are delighted to tell you the work is accepted.",
  },
  accept_with_edits: {
    ar: "أحبّ المحررون هذا العمل، ولديهم ما يودّون تطويره معك. قرار المراجعة لك.",
    en: "The editors love this work and have some things they would like to develop with you. The choice to revise is yours.",
  },
};

export const decision = (
  lang: Lang,
  work: string,
  outcome: Decision,
  app: string
) =>
  build(lang, (l) => {
    if (outcome === "decline") {
      return {
        action: account(app, l, "/qirtas/submit"),
        heading:
          l === "ar" ? `شكرًا لإرسالك ${work}` : `Thank you for sending ${work}`,
        paragraphs:
          l === "ar"
            ? [
                "لم يختر المحررون هذا العمل لقرطاس هذه المرة.",
                "هذا قرار يخص إصدارًا واحدًا، لا قيمة كتابتك. نرجو أن ترسل إلينا مجددًا.",
              ]
            : [
                "This time the editors have not selected it for Qirtas.",
                "It is a decision about one Edition, not the worth of the writing. Please submit again.",
              ],
      };
    }
    return {
      action: account(app, l, "/qirtas/submit"),
      heading:
        l === "ar" ? `قُبل ${work} في قرطاس` : `${work} is accepted for Qirtas`,
      paragraphs: [
        ACCEPTED[outcome][l],
        l === "ar"
          ? "خلال سبعة أيام: وقّع اتفاقية النشر وأكمل بياناتك ككاتب في صفحة عملك. توافق أنت على كل تغيير، وترى النص النهائي قبل نشره."
          : "Within 7 days, sign the Publication Agreement and complete your contributor details on your submission's page. You approve every change and see the final text before it is published.",
      ],
    };
  });

export const agreementReminder = (lang: Lang, work: string, app: string) =>
  build(lang, (l) => ({
    action: account(app, l, "/qirtas/submit"),
    heading:
      l === "ar"
        ? `بانتظار توقيعك: اتفاقية نشر ${work}`
        : `Waiting for your signature: ${work}`,
    paragraphs: [
      l === "ar"
        ? "قُبل عملك في قرطاس، ولا يمكن نشره قبل أن توقّع اتفاقية النشر في صفحة عملك."
        : "Your work is accepted for Qirtas, and it cannot be published until you sign the Publication Agreement on your submission's page.",
    ],
  }));

export interface CallInfo {
  closes_at: string;
  title_ar: string;
  title_en: string;
}

/**
 * A call closing in 2100 or later has no deadline yet (the Editor-in-Chief
 * sets the dates; the standing call never closes).
 */
const callHasDeadline = (closesAt: string) =>
  new Date(closesAt).getUTCFullYear() < 2100;

const callClosing = (closesAt: string, l: Lang) => {
  if (!callHasDeadline(closesAt)) {
    return l === "ar"
      ? "لم يُحدَّد موعد الإغلاق بعد. أرسل عملك من صفحة الكتابة لقرطاس."
      : "Its closing date is still to be set. Send yours from Write for Qirtas.";
  }
  return l === "ar"
    ? `تستقبل الدعوة الأعمال حتى ${formatLongDate(closesAt, l)}. أرسل عملك من صفحة الكتابة لقرطاس.`
    : `It takes work until ${formatLongDate(closesAt, l)}. Send yours from Write for Qirtas.`;
};

/** "Tell me when": a Qirtas call has opened. */
export const callOpened = (lang: Lang, call: CallInfo, app: string) =>
  build(lang, (l) => ({
    action: account(app, l, "/qirtas/submit"),
    heading:
      l === "ar"
        ? `فُتحت دعوة قرطاس: ${call.title_ar}`
        : `A Qirtas call is open: ${call.title_en}`,
    paragraphs: [
      callClosing(call.closes_at, l),
      l === "ar"
        ? "وصلتك هذه الرسالة لأنك طلبت أن نخبرك. يمكنك إيقافها من الصفحة نفسها."
        : "You asked us to tell you. You can stop these from the same page.",
    ],
  }));

const piecePath = (pieceId: string) => `/account/work/${pieceId}`;

/** Final check (72 hours): errors only, not new revisions. */
export const finalCheck = (
  lang: Lang,
  work: string,
  pieceId: string,
  app: string
) =>
  build(lang, (l) => ({
    action: account(app, l, piecePath(pieceId)),
    heading:
      l === "ar" ? `مراجعتك الأخيرة: ${work}` : `Your final check: ${work}`,
    paragraphs: [
      l === "ar"
        ? "راجع خلال 72 ساعة اسمك والعنوان وكل فاصل أسطر ونبذتك، ثم وافق على النص في صفحة عملك."
        : "Within 72 hours, check your name, the title, every line break and your bio, then approve the text on your piece's page.",
      l === "ar"
        ? "الأخطاء فقط، لا تعديلات جديدة."
        : "Errors only, not new revisions.",
    ],
  }));

/** The editor wrote on the piece (the edit letter and what follows). */
export const pieceNote = (
  lang: Lang,
  work: string,
  pieceId: string,
  app: string
) =>
  build(lang, (l) => ({
    action: account(app, l, piecePath(pieceId)),
    heading:
      l === "ar"
        ? `ملاحظة من المحرر: ${work}`
        : `A note from your editor: ${work}`,
    paragraphs: [
      l === "ar"
        ? "كتب المحرر إليك عن عملك. اقرأ الملاحظة وردّ عليها في صفحة عملك. الكلمة الأخيرة في كلماتك لك."
        : "Your editor wrote to you about the piece. Read the note and reply on the piece's page. The final word on the words is yours.",
    ],
  }));

/** Thank-you with the credit line, when the piece goes out. */
export const piecePublished = (lang: Lang, work: string, url: string) =>
  build(lang, (l) => ({
    action: {
      href: url,
      label: l === "ar" ? "اقرأه في قرطاس" : "Read it in Qirtas",
    },
    heading: l === "ar" ? `نُشر ${work}` : `${work} is published`,
    paragraphs: [
      l === "ar"
        ? "شكرًا لك. إن أعدت نشره في مكان آخر فاكتب: «نُشر أولًا في قرطاس»."
        : "Thank you. If you republish it anywhere, add: \u201cFirst published in Qirtas.\u201d",
    ],
  }));

/** Qirtas's sections, as the emails name them. */
export const deskNames = {
  gallery: { ar: "معرض", en: "Gallery" },
  games: { ar: "ألعاب", en: "Games" },
  letters: { ar: "آداب", en: "Letters" },
  news: { ar: "أخبار", en: "News" },
  video: { ar: "مرئيات", en: "Video" },
  voices: { ar: "آراء", en: "Voices" },
} as const;

export interface SundayItem {
  desk_ar: string;
  desk_en: string;
  title_ar: string;
  title_en: string;
  url: string;
}

/** The newsletter's double opt-in: nothing is sent until they confirm. */
export const newsletterConfirm = (lang: Lang, confirm: string) =>
  build(lang, (l) => ({
    action: {
      fallback: true,
      href: confirm,
      label: l === "ar" ? "أكّد اشتراكك" : "Confirm your subscription",
    },
    heading:
      l === "ar"
        ? "أكّد اشتراكك في «جريدة الأحد»"
        : "Confirm your subscription to the Sunday Paper",
    paragraphs: [
      l === "ar"
        ? "طلب أحدهم بهذا العنوان «جريدة الأحد»، رسالة قرطاس الشهرية من جمعية الفنون والآداب، في أول أحد من كل شهر. اضغط الزر للتأكيد."
        : "Someone asked for the Sunday Paper, the monthly email from Qirtas and the AUIB Society of Arts and Letters, sent on the first Sunday of each month, at this address. Press the button to confirm.",
      l === "ar"
        ? "إن لم تطلبه فتجاهل هذه الرسالة؛ لن نراسلك."
        : "If it was not you, ignore this email; we will not write again.",
    ],
  }));

/**
 * Someone's two-step sign-in was reset: by an officer, or with one of their
 * recovery codes. Sent either way, so a reset they didn't ask for is
 * noticed.
 */
const TWO_STEP_RESET = {
  officer: {
    ar: "أزال أحد المسؤولين في جمعية الفنون والآداب تطبيق المصادقة من حسابك. عند دخولك القادم إلى الديوان، اضبط تطبيق المصادقة من جديد واحفظ رموز الاسترداد الجديدة.",
    en: "An officer of the AUIB Society of Arts and Letters removed the authenticator app from your account. The next time you open the Diwan, set up your authenticator app again and save your new recovery codes.",
  },
  recovery_code: {
    ar: "استُخدم أحد رموز الاسترداد لإزالة تطبيق المصادقة من حسابك. اضبط تطبيق المصادقة من جديد عند دخولك القادم إلى الديوان.",
    en: "One of your recovery codes was used to remove the authenticator app from your account. Set up your authenticator app again the next time you open the Diwan.",
  },
} as const;

export const twoStepReset = (
  lang: Lang,
  via: keyof typeof TWO_STEP_RESET,
  app: string
) =>
  build(lang, (l) => ({
    action: diwan(app, l),
    heading:
      l === "ar"
        ? "أُعيد ضبط الخطوة الثانية لتسجيل دخولك"
        : "Your two-step sign-in was reset",
    paragraphs: [
      TWO_STEP_RESET[via][l],
      l === "ar"
        ? "إن لم تطلب ذلك، فردّ على هذه الرسالة فورًا وأخبر المجلس."
        : "If you didn't ask for this, reply to this email right away and tell the Council.",
    ],
  }));

/** Too many wrong recovery codes on the account within an hour. */
export const recoveryAttempts = (lang: Lang, app: string) =>
  build(lang, (l) => ({
    action: diwan(app, l),
    heading:
      l === "ar"
        ? "محاولات متكررة برموز الاسترداد"
        : "Several recovery codes were tried on your account",
    paragraphs: [
      l === "ar"
        ? "أُدخلت رموز استرداد خاطئة عدة مرات في حسابك خلال الساعة الماضية، فأوقفنا المحاولات لمدة ساعة."
        : "Wrong recovery codes were entered on your account several times in the last hour, so we have paused further tries for an hour.",
      l === "ar"
        ? "إن لم تكن أنت، فغيّر كلمة المرور الآن وردّ على هذه الرسالة."
        : "If this wasn’t you, change your password now and reply to this email.",
    ],
  }));

/**
 * The Council's answer to an account from outside AUIB: verified (the
 * member finishes setting up and is in), or not.
 */
export const verificationDecided = (
  lang: Lang,
  approved: boolean,
  app: string
) =>
  build(lang, (l) =>
    approved
      ? {
          action: account(app, l, "/account"),
          heading:
            l === "ar" ? "تم التحقق من حسابك" : "Your account is verified",
          paragraphs: [
            l === "ar"
              ? "راجعت الهيئة الإدارية لجمعية الفنون والآداب حسابك ووافقت عليه. أكمل إعداد حسابك، وستجد بطاقتك والفعاليات وكل ما في الجمعية في «حسابك»."
              : "The Council of the AUIB Society of Arts and Letters has checked and approved your account. Finish setting up, and your card, the events and everything else are in your account.",
          ],
        }
      : {
          heading:
            l === "ar"
              ? "تعذّر التحقق من حسابك"
              : "We couldn't verify your account",
          paragraphs: [
            l === "ar"
              ? "راجعت الهيئة الإدارية لجمعية الفنون والآداب طلبك ولم تتمكن من التحقق منه. يمكنك ما زلت قراءة قرطاس وحضور الفعاليات العامة."
              : "The Council of the AUIB Society of Arts and Letters looked at your request and couldn't verify it. You can still read Qirtas and come to public events.",
            l === "ar"
              ? "إن ظننت أن في الأمر خطأ، فردّ على هذه الرسالة وأخبرنا بصلتك بالجامعة الأمريكية في بغداد أو بالجمعية."
              : "If you think this is a mistake, reply to this email and tell us how you're connected to AUIB or the Society.",
          ],
        }
  );

/** A personal email's confirmation: sent to the new address only. */
export const personalEmailConfirm = (lang: Lang, confirm: string) =>
  build(lang, (l) => ({
    action: {
      fallback: true,
      href: confirm,
      label: l === "ar" ? "أكّد العنوان" : "Confirm the address",
    },
    heading: l === "ar" ? "أكّد بريدك الشخصي" : "Confirm your personal email",
    paragraphs: [
      l === "ar"
        ? "أضاف أحد أعضاء جمعية الفنون والآداب هذا العنوان بريدًا شخصيًا له، لتبقى الجمعية على صلة به بعد تخرجه. اضغط الزر للتأكيد؛ يعمل الرابط سبعة أيام."
        : "A member of the AUIB Society of Arts and Letters added this address as their personal email, so the Society can keep in touch after they graduate. Press the button to confirm; the link works for seven days.",
      l === "ar"
        ? "إن لم تكن أنت فتجاهل هذه الرسالة؛ لن يُستخدم العنوان."
        : "If it was not you, ignore this email; the address will not be used.",
    ],
  }));

const SOCIETY_AR = "جمعية الفنون والآداب في الجامعة الأمريكية";

/** A partner invitation's heading and first lines, by kind and language. */
type InvitationKind = "team" | "guest" | "society" | "associate" | "honorary";

const invitationLines = (
  l: Lang,
  kind: InvitationKind,
  partner: string
): { body: string; heading: string } => {
  // Joining by class (decisions §2): from the Director of Membership.
  if (kind === "associate") {
    return l === "ar"
      ? {
          body: `تدعوك ${SOCIETY_AR} لتكون عضوًا منتسبًا: تحضر الفعاليات وتكتب لقرطاس وتحمل بطاقة العضوية الحيّة. لا يصوّت العضو المنتسب ولا يشغل منصبًا.`,
          heading: "أنت مدعو عضوًا منتسبًا",
        }
      : {
          body: "The AUIB Society of Arts and Letters invites you to join as an Associate Member: you come to events, write for Qirtas and carry the live membership card. Associate Members don’t vote or hold office.",
          heading: "You are invited to join as an Associate Member",
        };
  }
  if (kind === "honorary") {
    return l === "ar"
      ? {
          body: `صوّت مجلس ${SOCIETY_AR} على دعوتك عضوًا فخريًا. تحضر الفعاليات وتكتب لقرطاس وتحمل بطاقة العضوية الحيّة.`,
          heading: "أنت مدعو عضوًا فخريًا",
        }
      : {
          body: "The Council of the AUIB Society of Arts and Letters has voted to invite you to join as an Honorary Member. You come to events, write for Qirtas and carry the live membership card.",
          heading: "You are invited to join as an Honorary Member",
        };
  }
  // The Society's own guest, invited by an event's lead.
  if (kind === "society") {
    return l === "ar"
      ? {
          body: `تدعوك ${SOCIETY_AR} لتكون ضيفها: تحجز مقاعد في الفعاليات وتحمل بطاقة الضيف الحيّة.`,
          heading: "أنت مدعو ضيفًا للجمعية",
        }
      : {
          body: "The AUIB Society of Arts and Letters invites you as its guest: you book places at events and carry a guest's live card.",
          heading: "You are invited as the Society's guest",
        };
  }
  if (kind === "team") {
    return l === "ar"
      ? {
          body: `${partner} شريك ل${SOCIETY_AR}، ويدعوك إلى فريقه على منصة الجمعية: ملف الشريك وضيوفه.`,
          heading: `انضم إلى فريق ${partner}`,
        }
      : {
          body: `${partner} is a partner of the AUIB Society of Arts and Letters and invites you to its team on the Society's platform: the partner's profile and its guests.`,
          heading: `Join ${partner}'s team`,
        };
  }
  return l === "ar"
    ? {
        body: `${partner} شريك ل${SOCIETY_AR}. بصفتك ضيفه تحجز مقاعد في الفعاليات وتكتب لقرطاس حين تُفتح دعوة لضيوف ${partner}.`,
        heading: `يدعوك ${partner} ضيفًا`,
      }
    : {
        body: `${partner} is a partner of the AUIB Society of Arts and Letters. As its guest you book places at events and write for Qirtas when a call is open to ${partner}.`,
        heading: `${partner} invites you as its guest`,
      };
};

/**
 * A partner's invitation (decisions.md): to join its team on the
 * platform, or to be its guest. The link is the invitation.
 */
export const partnerInvitation = (
  lang: Lang,
  partner: string,
  kind: InvitationKind,
  link: string
) =>
  build(lang, (l) => ({
    action: {
      fallback: true,
      href: link,
      label: l === "ar" ? "اقبل الدعوة" : "Accept the invitation",
    },
    heading: invitationLines(l, kind, partner).heading,
    paragraphs: [
      invitationLines(l, kind, partner).body,
      l === "ar"
        ? "اضغط الزر لإنشاء حسابك أو الدخول إليه؛ تعمل الدعوة أربعة عشر يومًا. إن لم تكن تتوقعها فتجاهل هذه الرسالة."
        : "Press the button to create your account or sign in; the invitation works for fourteen days. If you weren't expecting it, ignore this email.",
    ],
  }));

export interface MonthEvent {
  starts_at: string;
  title_ar: string;
  title_en: string;
  url: string;
}

export interface SocietyItem {
  title_ar: string;
  title_en: string;
  url: string;
}

export interface OpenPlace {
  title_ar: string;
  title_en: string;
}

const pick = (l: Lang, ar: string, en: string) =>
  l === "ar" ? ar || en : en || ar;

const PAPER_TITLES = {
  ar: {
    events: "فعاليات هذا الشهر",
    heading: "جريدة الأحد",
    lede: "ما نُشر في قرطاس هذا الشهر، وفعاليات الجمعية، والأماكن المفتوحة لمن يريد أن يشارك.",
    open: "افتح قرطاس",
    pieces: "جديد قرطاس",
    places: "أدوار مفتوحة في «شارك معنا»",
    society: "من الجمعية",
    write: "أرسل عملك إلى قرطاس",
    writeTitle: "اكتب لقرطاس",
  },
  en: {
    events: "Events this month",
    heading: "The Sunday Paper",
    lede: "This month in Qirtas, what's on at the Society, and the places open to anyone who wants to get involved.",
    open: "Open Qirtas",
    pieces: "New in Qirtas",
    places: "Open on Get involved",
    society: "From the Society",
    write: "Send your work to Qirtas",
    writeTitle: "Write for Qirtas",
  },
} as const;

/**
 * The Sunday Paper (decisions.md, Qirtas): sent by hand by the Managing
 * Editor, to members and to the public list alike: the editor's letter,
 * the month's pieces, "From the Society", Events, the open roles and a
 * call to write, each a list of links. The stop link is
 * in the footer and the List-Unsubscribe header.
 */
export const sundayPaper = (
  lang: Lang,
  paper: {
    getInvolved: string;
    events: MonthEvent[];
    front: string;
    /** The editor's letter, in this language (decisions.md, Qirtas). */
    letter?: string;
    places: OpenPlace[];
    pieces: SundayItem[];
    /** "From the Society": the notices sent this month (decisions §5). */
    society?: SocietyItem[];
    /** Write for Qirtas. */
    write?: string;
  }
) =>
  build(lang, (l) => {
    const titles = PAPER_TITLES[l];
    const lists: NoticeList[] = [
      {
        items: paper.pieces.map((i) => ({
          href: i.url,
          meta: l === "ar" ? i.desk_ar : i.desk_en,
          title: pick(l, i.title_ar, i.title_en),
        })),
        title: titles.pieces,
      },
      {
        items: (paper.society ?? []).map((a) => ({
          href: a.url,
          title: pick(l, a.title_ar, a.title_en),
        })),
        title: titles.society,
      },
      {
        items: paper.events.map((e) => ({
          href: e.url,
          meta: formatLongDate(e.starts_at, l),
          title: pick(l, e.title_ar, e.title_en),
        })),
        title: titles.events,
      },
      {
        items: paper.places.map((o) => ({
          href: paper.getInvolved,
          title: pick(l, o.title_ar, o.title_en),
        })),
        title: titles.places,
      },
      {
        items: paper.write ? [{ href: paper.write, title: titles.write }] : [],
        title: titles.writeTitle,
      },
    ];
    const letter = (paper.letter ?? "")
      .split(PARAGRAPH_BREAK)
      .map((p) => p.trim())
      .filter(Boolean);
    return {
      action: { href: paper.front, label: titles.open },
      heading: titles.heading,
      lists: lists.filter((list) => list.items.length > 0),
      paragraphs: letter.length > 0 ? letter : [titles.lede],
    };
  });

export interface RoleInfo {
  ends_at: string;
  name_ar: string;
  name_en: string;
}

export const roleEnding = (lang: Lang, role: RoleInfo, app: string) =>
  build(lang, (l) => ({
    action: account(app, l),
    heading:
      l === "ar"
        ? `ينتهي دورك قريبًا: ${role.name_ar}`
        : `Your role ends soon: ${role.name_en}`,
    paragraphs: [
      l === "ar"
        ? `ينتهي في ${formatLongDate(role.ends_at, l)}. سلّم ما لديك لمن يخلفك، وراجع المجلس إن كان يجب تمديده.`
        : `It ends on ${formatLongDate(role.ends_at, l)}. Hand over to your successor, and speak to the Council if it should be extended.`,
    ],
  }));

export interface RemovalInfo {
  content_url: string | null;
  details: string;
  due_at: string;
  requester_email: string;
  requester_name: string;
}

const removalHeading = {
  new: { ar: "طلب حذف جديد", en: "New removal request" },
  overdue: { ar: "طلب حذف تجاوز موعده", en: "A removal request is overdue" },
} as const;

export const removalRequested = (
  lang: Lang,
  r: RemovalInfo,
  app: string,
  overdue = false
) =>
  build(lang, (l) => ({
    action: diwan(app, l, "/media"),
    heading: removalHeading[overdue ? "overdue" : "new"][l],
    paragraphs: [
      l === "ar"
        ? `ما يشير إليه الطلب على الموقع مخفيّ الآن. قرّر قبل ${when(r.due_at, l)} (خلال يومَي عمل، MEM-02): احذفه من قنوات الجمعية أو ارفض الطلب مع ذكر السبب.`
        : `What the request points to on the site is hidden now. Decide by ${when(r.due_at, l)} (two business days, MEM-02): take it down from the Society’s channels or decline with a reason.`,
      `${r.requester_name} <${r.requester_email}>`,
      ...(r.content_url ? [r.content_url] : []),
      r.details,
    ],
  }));

export const removalReceived = (lang: Lang, dueAt: string) =>
  build(lang, (l) => ({
    heading: l === "ar" ? "وصلنا طلب الحذف" : "We have your removal request",
    paragraphs: [
      l === "ar"
        ? `أُخفي ما أشرت إليه على الموقع. وبحلول ${when(dueAt, l)} نحذفه من قنوات الجمعية أو نكتب إليك بالسبب.`
        : `What you pointed to on the site is hidden now. By ${when(dueAt, l)} we take it down from the Society’s channels or write to you with a reason.`,
    ],
  }));

/** The test notice sent from Profile and privacy (push only, no email). */
export interface FailedJob {
  failures: number;
  job: string;
  last_error: string;
}

/** To the administrators: the cron jobs that failed in the last day. */
export const cronFailed = (lang: Lang, jobs: FailedJob[], day: string) =>
  build(lang, (l) => ({
    heading:
      l === "ar"
        ? `أخفقت مهام مجدولة في ${formatLongDate(day, l)}`
        : `Scheduled jobs failed on ${formatLongDate(day, l)}`,
    paragraphs: [
      l === "ar"
        ? "أخفقت هذه المهام في قاعدة البيانات خلال اليوم الماضي. التفاصيل في Supabase تحت Integrations ثم Cron."
        : "These database jobs failed in the last day. The details are in Supabase under Integrations, then Cron.",
      ...jobs.map((j) =>
        l === "ar"
          ? `${j.job}: ${j.failures} ${j.failures === 1 ? "إخفاق" : "إخفاقات"}. ${j.last_error}`
          : `${j.job}: ${j.failures} ${j.failures === 1 ? "failure" : "failures"}. ${j.last_error}`
      ),
    ],
  }));

export const pushTest = (lang: Lang) =>
  lang === "ar"
    ? {
        body: "ستصلك هنا تذكيرات الفعاليات وأخبار قرطاس وقرارات النشر.",
        title: "الإشعارات تعمل",
      }
    : {
        body: "Event reminders, Qirtas news and decisions will arrive here.",
        title: "Notifications are on",
      };

// ── Journeys added in the email audit (decisions.md) ────────────────

/** An event that is canceled, or moved to another day, time or place. */
export const eventChanged = (
  lang: Lang,
  e: EventInfo,
  change: "canceled" | "moved",
  app: string
) =>
  build(lang, (l) =>
    change === "canceled"
      ? {
          action: account(app, l, MY_CALENDAR),
          heading:
            l === "ar" ? `أُلغيت: ${title(e, l)}` : `Canceled: ${title(e, l)}`,
          paragraphs: [
            l === "ar"
              ? `لن تُقام ${title(e, l)} في ${when(e.starts_at, l)}. ألغينا حجزك، ولا شيء عليك أن تفعله.`
              : `${title(e, l)} on ${when(e.starts_at, l)} won't take place. Your booking is canceled; there's nothing you need to do.`,
            l === "ar"
              ? "نأسف لذلك. ما يجري بعدها في «تقويمي» وفي صفحة «الفعاليات»."
              : "We're sorry. What's coming up next is on My calendar and Events.",
          ],
        }
      : {
          action: account(app, l, MY_CALENDAR),
          heading:
            l === "ar"
              ? `تغيّر موعد: ${title(e, l)}`
              : `Changed: ${title(e, l)}`,
          paragraphs: [
            l === "ar"
              ? "تغيّر يوم الفعالية أو وقتها أو مكانها. هذا موعدها الآن:"
              : "The day, time or place has changed. This is when and where it is now:",
            ...eventLines(e, l),
            l === "ar"
              ? "مكانك محفوظ. إن لم يعد الموعد يناسبك، فتنازل عنه في «تقويمي» ليأخذه غيرك."
              : "Your place is kept. If the new time doesn't suit you, give it back on My calendar so someone else can have it.",
          ],
        }
  );

/** The applicant: the application to partner has arrived. */
export const applicationReceived = (lang: Lang, partner: string, app: string) =>
  build(lang, (l) => ({
    action: account(app, l, "/partners/apply"),
    heading:
      l === "ar" ? `وصلنا طلب ${partner}` : `We have ${partner}'s application`,
    paragraphs: [
      l === "ar"
        ? "شكرًا لطلبك الشراكة مع جمعية الفنون والآداب. تقرأ «الشراكات» الطلب، ثم يصوّت عليه مجلس الجمعية في اجتماعه."
        : "Thank you for applying to partner with the AUIB Society of Arts and Letters. Partnerships reads the application, and the Society’s Council votes on it at its meeting.",
      l === "ar"
        ? "سنكتب إليك حين يُتّخذ القرار. ويمكنك رؤية الطلب في أي وقت من الرابط أدناه."
        : "We'll write to you when it's decided. You can see the application at any time from the link below.",
    ],
  }));

/** The applicant: the Council approved the partnership, or it is not taken forward. */
export const applicationDecided = (
  lang: Lang,
  partner: string,
  approved: boolean,
  app: string
) =>
  build(lang, (l) =>
    approved
      ? {
          action: {
            href: `${app}${localizedPath(l, "/partners/dashboard")}`,
            label:
              l === "ar" ? "افتح لوحة الشريك" : "Open the partner dashboard",
          },
          heading:
            l === "ar"
              ? `${partner} شريك للجمعية`
              : `${partner} is a partner of the Society`,
          paragraphs: [
            l === "ar"
              ? "وافق مجلس الجمعية على الشراكة. لوحة الشريك مفتوحة لك الآن: الملف والمذكرة، والفريق والضيوف."
              : "The Society’s Council has approved the partnership. Your partner dashboard is open: the profile and memorandum, and your team and guests.",
          ],
        }
      : {
          heading:
            l === "ar"
              ? `بشأن طلب ${partner}`
              : `About ${partner}'s application`,
          paragraphs: [
            l === "ar"
              ? "شكرًا لاهتمامك. لا تستطيع الجمعية المضيّ في هذه الشراكة الآن."
              : "Thank you for your interest. The Society can't take this partnership forward now.",
            l === "ar"
              ? "إن أردت الحديث في الأمر، فردّ على هذه الرسالة."
              : "If you'd like to talk about it, reply to this email.",
          ],
        }
  );

export interface ElectionInfo {
  nominations_close_at: string;
  nominations_open_at: string;
  title_ar: string;
  title_en: string;
  voting_closes_at: string;
  voting_opens_at: string;
}

const ELECTION_LINES: Record<
  "notice" | "voting" | "published",
  (l: Lang, e: ElectionInfo) => { heading: string; paragraphs: string[] }
> = {
  notice: (l, e) =>
    l === "ar"
      ? {
          heading: "إشعار انتخابات",
          paragraphs: [
            `الترشيح من ${when(e.nominations_open_at, l)} حتى ${when(e.nominations_close_at, l)}، والتصويت من ${when(e.voting_opens_at, l)} حتى ${when(e.voting_closes_at, l)}.`,
            "تترشّح لمقعد من صفحة «الجمعية» حين يُفتح الترشيح. ويصوّت من في سجل الناخبين اليوم.",
          ],
        }
      : {
          heading: "Election notice",
          paragraphs: [
            `Nominations run from ${when(e.nominations_open_at, l)} to ${when(e.nominations_close_at, l)}, and voting from ${when(e.voting_opens_at, l)} to ${when(e.voting_closes_at, l)}.`,
            "Stand for a seat from Society once nominations open. Everyone on today's register of voters votes.",
          ],
        },
  published: (l) =>
    l === "ar"
      ? {
          heading: "النتائج",
          paragraphs: [
            "نُشرت نتائج الانتخابات في صفحة «الجمعية». شكرًا لكل من ترشّح وصوّت.",
          ],
        }
      : {
          heading: "The results",
          paragraphs: [
            "The results are published on Society. Thank you to everyone who stood and voted.",
          ],
        },
  voting: (l, e) =>
    l === "ar"
      ? {
          heading: "بدأ التصويت",
          paragraphs: [
            `رتّب المرشحين في صفحة «الجمعية» حتى ${when(e.voting_closes_at, l)}. اقتراعك سرّي.`,
          ],
        }
      : {
          heading: "Voting is open",
          paragraphs: [
            `Rank the candidates on Society by ${when(e.voting_closes_at, l)}. Your ballot is secret.`,
          ],
        },
};

/** The notice to every member, voting open, and the results. */
export const electionStage = (
  lang: Lang,
  e: ElectionInfo,
  stage: "notice" | "voting" | "published",
  app: string
) =>
  build(lang, (l) => {
    const name = pick(l, e.title_ar, e.title_en);
    const lines = ELECTION_LINES[stage](l, e);
    return {
      action: account(app, l, "/account/elections"),
      heading: `${lines.heading}: ${name}`,
      paragraphs: lines.paragraphs,
    };
  });

const CANDIDACY: Record<
  "approved" | "declined",
  Record<Lang, [string, string]>
> = {
  approved: {
    ar: [
      "أنت مرشّح",
      "قبلت لجنة الانتخابات ترشّحك، ويظهر بيانك للناخبين في صفحة «الجمعية». بالتوفيق.",
    ],
    en: [
      "You're on the ballot",
      "The Elections Committee approved your nomination, and your statement is on Society for the voters. Good luck.",
    ],
  },
  declined: {
    ar: [
      "بشأن ترشّحك",
      "لم تقبل لجنة الانتخابات ترشّحك لهذا المقعد. إن كان لديك سؤال، فردّ على هذه الرسالة.",
    ],
    en: [
      "About your nomination",
      "The Elections Committee didn't approve your nomination for this seat. If you have a question, reply to this email.",
    ],
  },
};

/** A nominee: the Elections Committee's answer. */
export const candidacyDecided = (
  lang: Lang,
  seat: { title_ar: string; title_en: string },
  approved: boolean,
  app: string
) =>
  build(lang, (l) => {
    const lines = CANDIDACY[approved ? "approved" : "declined"][l];
    return {
      action: account(app, l, "/account/elections"),
      heading: `${lines[0]}: ${pick(l, seat.title_ar, seat.title_en)}`,
      paragraphs: [lines[1]],
    };
  });

/**
 * A Mutanabbi Prize certificate, signed by both and issued (a Qalam
 * student has no account: the Qalam lead hands theirs over).
 */
export const certificateIssued = (
  lang: Lang,
  what: string,
  certificateId: string,
  app: string
) =>
  build(lang, (l) => ({
    action: {
      href: `${app}${localizedPath(l, `/account/record/certificates/${certificateId}`)}`,
      label: l === "ar" ? "افتح الشهادة" : "Open the certificate",
    },
    heading: l === "ar" ? "شهادتك جاهزة" : "Your certificate is ready",
    paragraphs: [
      ...(what ? [what] : []),
      l === "ar"
        ? "وقّعها رئيس التحرير ورئيس الجمعية. تجدها في «السجل»، ويمكن لأي أحد التحقق منها برمزها."
        : "The Editor-in-Chief and the President have signed it. It’s on your Record, and anyone can check it with its code.",
    ],
  }));

/** A service letter (F-05), written and signed for its holder. */
export const serviceLetterWritten = (
  lang: Lang,
  role: string,
  letterId: string,
  app: string
) =>
  build(lang, (l) => ({
    action: {
      href: `${app}${localizedPath(l, `/account/record/letters/${letterId}`)}`,
      label: l === "ar" ? "افتح الرسالة" : "Open the letter",
    },
    heading: l === "ar" ? "رسالة خدمتك جاهزة" : "Your service letter is ready",
    paragraphs: [
      role,
      l === "ar"
        ? "تجدها في «السجل»، ويمكن لأي أحد التحقق منها برمزها. اطبعها من المتصفح متى احتجت إليها."
        : "It’s on your Record, and anyone can check it with its code. Print it from your browser whenever you need it.",
    ],
  }));

/**
 * The signer's copy of a form signed on the site (decisions §11, E-SIGN and
 * UETA): what was signed, by whom, when, and its fingerprint.
 */
export const formSignedCopy = (
  lang: Lang,
  form: {
    answers: { label: string; value: string }[];
    fingerprint: string;
    signedAt: string;
    signer: string;
    title: string;
    url: string | null;
  }
) =>
  build(lang, (l) => ({
    ...(form.url
      ? {
          action: {
            href: form.url,
            label: l === "ar" ? "افتح النسخة الموقّعة" : "Open the signed copy",
          },
        }
      : {}),
    heading:
      l === "ar"
        ? `نسختك الموقّعة: ${form.title}`
        : `Your signed copy: ${form.title}`,
    lists: form.answers.length
      ? [
          {
            items: form.answers.map((a) => ({ meta: a.value, title: a.label })),
            title: l === "ar" ? "ما وقّعته" : "What you signed",
          },
        ]
      : [],
    paragraphs: [
      l === "ar"
        ? `وقّعتَ ${form.title} باسم ${form.signer} في ${when(form.signedAt, l)}. يحتفظ الموقع بالنسخة الموقّعة، وهذه نسختك.`
        : `You signed ${form.title} as ${form.signer} on ${when(form.signedAt, l)}. The site keeps the signed copy; this one is yours.`,
      l === "ar"
        ? `البصمة (SHA-256): ${form.fingerprint}`
        : `Fingerprint (SHA-256): ${form.fingerprint}`,
    ],
  }));

/**
 * A single-use link to sign a form without an account (a parent's consent
 * for Qalam), sent to the teacher, who passes it on: the Society reaches
 * parents only through the teacher.
 */
export const formLink = (lang: Lang, link: { title: string; url: string }) =>
  build(lang, (l) => ({
    action: {
      href: link.url,
      label: l === "ar" ? "افتح النموذج" : "Open the form",
    },
    heading:
      l === "ar"
        ? `رابط للتوقيع: ${link.title}`
        : `A link to sign: ${link.title}`,
    paragraphs: [
      l === "ar"
        ? `أرسِل هذا الرابط إلى ولي الأمر ليوقّع ${link.title}. يعمل الرابط مرة واحدة خلال 14 يومًا، ولا يحتاج إلى حساب.`
        : `Please pass this link to the parent or guardian to sign ${link.title}. It works once, within 14 days, and needs no account.`,
    ],
  }));

/** The register's numbers (SAL-EXB-01; decisions.md). */
const REQUEST_NAMES: Record<string, Record<Lang, string>> = {
  f10: {
    ar: "مقترحك لاجتماع الأعضاء",
    en: "your motion for a members’ meeting",
  },
  f11: { ar: "مقترح الفعالية", en: "your event pitch" },
  f21: { ar: "ما رفعته من قلق", en: "your concern" },
};

/** A concern, a motion or a pitch: taken up, then closed. */
export const requestUpdated = (
  lang: Lang,
  formKey: string,
  status: "acknowledged" | "closed",
  requestId: string,
  app: string
) =>
  build(lang, (l) => {
    const thing = (REQUEST_NAMES[formKey] ?? {
      ar: "طلبك",
      en: "your request",
    })[l];
    const action = account(app, l, `/account/requests/${requestId}`);
    if (status === "closed") {
      return {
        action,
        heading: l === "ar" ? `أُغلق ${thing}` : `We've closed ${thing}`,
        paragraphs: [
          l === "ar"
            ? "انتهى العمل عليه، وما آل إليه في صفحته. شكرًا لأنك كتبت إلينا."
            : "The work on it is done, and the outcome is on its page. Thank you for writing to us.",
        ],
      };
    }
    return {
      action,
      heading: l === "ar" ? `وصلنا ${thing}` : `We have ${thing}`,
      paragraphs: [
        l === "ar"
          ? "استلمه المسؤول عنه وبدأ العمل عليه. سنكتب إليك حين يُغلق، وترى حاله في صفحته متى شئت."
          : "The officer who handles it has taken it up. We'll write when it's closed, and you can see where it stands on its page at any time.",
      ],
    };
  });

const REMOVAL_DONE: Record<
  "removed" | "closed",
  Record<Lang, [string, string, string]>
> = {
  closed: {
    ar: [
      "أغلقنا طلب الحذف",
      "راجعنا طلبك وأغلقناه.",
      "إن كان لديك سؤال، فردّ على هذه الرسالة.",
    ],
    en: [
      "We've closed your removal request",
      "We've looked at your request and closed it.",
      "If you have a question, reply to this email.",
    ],
  },
  removed: {
    ar: [
      "حُذف المحتوى",
      "حذفنا ما طلبت حذفه من صفحاتنا وقنواتنا، كما وعدنا.",
      "إن بقي شيء، فردّ على هذه الرسالة.",
    ],
    en: [
      "It has been taken down",
      "We've taken down what you asked, from our pages and channels, as promised.",
      "If anything is still up, reply to this email.",
    ],
  },
};

/** The requester: their removal request is done. */
export const removalDone = (
  lang: Lang,
  outcome: "removed" | "declined" | "closed",
  note: string | null
) =>
  build(lang, (l) => {
    const lines = REMOVAL_DONE[outcome === "removed" ? "removed" : "closed"][l];
    return {
      heading: lines[0],
      paragraphs: [lines[1], ...(note ? [note] : []), lines[2]],
    };
  });

const REPLY_LINES: Record<
  ApplicationStep,
  Record<Lang, { body: (time: string | null) => string; heading: string }>
> = {
  accepted: {
    ar: {
      body: () =>
        "قبلتَ العرض. يُعيَّن المدير بعد قرار الهيئة التنفيذية وتأكيد شؤون الطلبة أهليته، وسنكتب إليك حينها.",
      heading: "قبلتَ",
    },
    en: {
      body: () =>
        "You accepted. A director is appointed once the Executive Board has resolved and Student Life has confirmed eligibility; we'll write to you then.",
      heading: "You accepted",
    },
  },
  not_picked: {
    ar: {
      body: () =>
        "اختير غيرك لهذا الدور هذه المرة. شكرًا لتقدّمك؛ تُنشر أدوار جديدة في «شارك معنا» طوال العام. يُحذف طلبك بعد 12 شهرًا.",
      heading: "بشأن",
    },
    en: {
      body: () =>
        "Someone else was chosen for this role this time. Thank you for applying; new roles open on Get involved all year. Your application is deleted after 12 months.",
      heading: "About",
    },
  },
  offered: {
    ar: {
      body: () =>
        "الدور لك إن أردته. اقبله أو اعتذر عنه من «طلباتك» في حسابك خلال 7 أيام.",
      heading: "عرض",
    },
    en: {
      body: () =>
        "The role is yours if you'd like it. Accept or decline it from Your applications in your account within 7 days.",
      heading: "An offer",
    },
  },
  received: {
    ar: {
      body: () =>
        "وصل طلبك. يقرؤه المقعد الذي يوظّف لهذا الدور مع مراجع ثان، وترى حالته في «طلباتك» في حسابك. يمكنك سحبه من هناك متى شئت.",
      heading: "وصل طلبك",
    },
    en: {
      body: () =>
        "Your application arrived. The seat hiring for this role reads it with a second reviewer, and you can follow it, or withdraw it, from Your applications in your account.",
      heading: "Application received",
    },
  },
  talking: {
    ar: {
      body: (time) =>
        time
          ? `يودّ فريق هذا الدور مقابلتك يوم ${time}. إن لم يناسبك الموعد، فردّ على هذه الرسالة.`
          : "يودّ فريق هذا الدور مقابلتك، وسيتواصل معك لتحديد موعد.",
      heading: "مقابلة",
    },
    en: {
      body: (time) =>
        time
          ? `The team hiring for this role would like to interview you on ${time}. If the time doesn't suit you, reply to this email.`
          : "The team hiring for this role would like to interview you and will be in touch to set a time.",
      heading: "An interview",
    },
  },
};

export type ApplicationStep =
  | "accepted"
  | "not_picked"
  | "offered"
  | "received"
  | "talking";

/** An application on Get involved: each step the applicant hears of (decisions.md, Get involved and roles). */
export const replyUpdate = (
  lang: Lang,
  role: string,
  status: ApplicationStep,
  talkAt: string | null,
  app: string
) =>
  build(lang, (l) => {
    const lines = REPLY_LINES[status][l];
    return {
      action: account(app, l, "/account/applications"),
      heading: `${lines.heading}: ${role}`,
      paragraphs: [lines.body(talkAt ? when(talkAt, l) : null)],
    };
  });

export interface AuditionInfo {
  ends_at: string;
  location_ar: string | null;
  location_en: string | null;
  prepare_ar: string | null;
  prepare_en: string | null;
  production_ar: string;
  production_en: string;
  starts_at: string;
}

const AUDITION_BOOKED = {
  ar: {
    cancel: "إن تغيّرت خططك، فألغِ موعدك من صفحة تجارب الأداء ليأخذه غيرك.",
    heading: "موعد تجربة أدائك",
    prepare: "ما تحضّره:",
  },
  en: {
    cancel:
      "If your plans change, cancel from Auditions so someone else can take the time.",
    heading: "Your audition",
    prepare: "To prepare:",
  },
} as const;

const AUDITION_LINES: Record<
  "called_back" | "cast" | "not_cast",
  (l: Lang, play: string) => [string, string]
> = {
  called_back: (l, play) =>
    l === "ar"
      ? [
          `استدعاء ثان: ${play}`,
          "تودّ الفرقة رؤيتك مرة أخرى. ستتواصل معك لتحديد الموعد.",
        ]
      : [
          `A callback: ${play}`,
          "The Company would like to see you again and will be in touch about the time.",
        ],
  cast: (l, play) =>
    l === "ar"
      ? [`أنت ضمن فريق ${play}`, "مبارك. ستتواصل معك الفرقة بمواعيد التمارين."]
      : [
          `You're cast in ${play}`,
          "Congratulations. The Company will be in touch with the rehearsal times.",
        ],
  not_cast: (l, play) =>
    l === "ar"
      ? [
          `بشأن ${play}`,
          "شكرًا لتجربة أدائك. لم يُختر لك دور هذه المرة؛ تُعلن تجارب الأداء القادمة في «شارك».",
        ]
      : [
          `About ${play}`,
          "Thank you for auditioning. There isn't a part for you this time; the next auditions are on Get involved.",
        ],
};

/** An audition time booked, and the Company's answer. */
export const auditionUpdate = (
  lang: Lang,
  a: AuditionInfo,
  status: "signed_up" | "called_back" | "cast" | "not_cast",
  app: string
) =>
  build(lang, (l) => {
    const play = pick(l, a.production_ar, a.production_en);
    const action = account(app, l, "/company/auditions");
    if (status !== "signed_up") {
      const [heading, body] = AUDITION_LINES[status](l, play);
      return { action, heading, paragraphs: [body] };
    }
    const where = pick(l, a.location_ar ?? "", a.location_en ?? "");
    const prepare = pick(l, a.prepare_ar ?? "", a.prepare_en ?? "");
    const booked = AUDITION_BOOKED[l];
    return {
      action,
      heading: `${booked.heading}: ${play}`,
      paragraphs: [
        when(a.starts_at, l),
        ...(where ? [where] : []),
        ...(prepare ? [`${booked.prepare} ${prepare}`] : []),
        booked.cancel,
      ],
    };
  });

const ROLE_LINES = {
  ar: {
    heading: "دورك الجديد",
    starts: "يبدأ الآن. ما يحتاجه منك في الديوان.",
    team: "دليل الضباط وقوالب العمل في مساحة الفريق على Notion، ويصلك جديد الفريق في مجموعة الديوان على Telegram.",
    twoStep:
      "يتطلب هذا الدور خطوة ثانية لتسجيل الدخول: اضبط تطبيق المصادقة عند دخولك القادم إلى الديوان، واحفظ رموز الاسترداد.",
    until: (date: string) =>
      `يبدأ الآن ويستمر حتى ${date}. ما يحتاجه منك في الديوان.`,
  },
  en: {
    heading: "Your new role",
    starts: "It starts now. What it needs from you is in the Diwan.",
    team: "The officer handbook and templates are in the team's Notion, and the team's news comes through the Diwan group on Telegram.",
    twoStep:
      "This role needs two-step sign-in: set up your authenticator app the next time you open the Diwan, and save your recovery codes.",
    until: (date: string) =>
      `It starts now and runs until ${date}. What it needs from you is in the Diwan.`,
  },
} as const;

/** A new role: what it opens, and two-step sign-in first if it needs it. */
export const roleAssigned = (
  lang: Lang,
  role: { ends_at: string | null; name_ar: string; name_en: string },
  twoStep: boolean,
  app: string
) =>
  build(lang, (l) => {
    const lines = ROLE_LINES[l];
    return {
      action: diwan(app, l),
      heading: `${lines.heading}: ${pick(l, role.name_ar, role.name_en)}`,
      paragraphs: [
        role.ends_at
          ? lines.until(formatLongDate(role.ends_at, l))
          : lines.starts,
        ...(twoStep ? [lines.twoStep] : []),
        lines.team,
      ],
    };
  });

/** The end of the welcome: the member's first pledge is made. */
export const welcome = (lang: Lang, app: string) =>
  build(lang, (l) => {
    const link = (path: string) => `${app}${localizedPath(l, path)}`;
    return {
      action: account(app, l),
      heading:
        l === "ar"
          ? "أهلًا بك في جمعية الفنون والآداب"
          : "Welcome to the AUIB Society of Arts and Letters",
      lists: [
        {
          items: [
            {
              href: link("/events"),
              title:
                l === "ar"
                  ? "الفعاليات: أمسيات القراءة، ونقاشات الكتب، وورش الكتابة، وغيرها"
                  : "Events: readings, book discussions, writing workshops and more",
            },
            {
              href: link("/qirtas/submit"),
              title:
                l === "ar"
                  ? "اكتب لقرطاس: أي قسم، في أي وقت"
                  : "Write for Qirtas: any section, any time",
            },
            {
              href: link("/get-involved"),
              title:
                l === "ar"
                  ? "شارك معنا: الأدوار وفرق الفعاليات وتجارب الأداء"
                  : "Get involved: roles, event teams and auditions",
            },
            {
              href: "https://t.me/auibsal_bot",
              title:
                l === "ar"
                  ? "هدهد على Telegram: يدخلك مجموعة الأعضاء"
                  : "Hudhud on Telegram: lets you into the members’ group",
            },
          ],
          title: l === "ar" ? "من أين تبدأ" : "Where to start",
        },
      ],
      paragraphs: [
        l === "ar"
          ? "أنت عضو الآن. بطاقتك الحيّة في «حسابك»: تُظهرها عند الباب ليتحقق من عضويتك."
          : "You're a member now. Your live card is in your account: show it at the door, where it checks your membership.",
      ],
    };
  });

export interface ShiftInfo {
  location_ar: string | null;
  location_en: string | null;
  role_ar: string;
  role_en: string;
  starts_at: string;
}

/** The day before a shift (optional, like booked events). */
export const shiftReminder = (lang: Lang, s: ShiftInfo, app: string) =>
  build(lang, (l) => ({
    action: account(app, l, MY_CALENDAR),
    heading:
      l === "ar"
        ? `غدًا مناوبتك: ${pick(l, s.role_ar, s.role_en)}`
        : `Your shift tomorrow: ${pick(l, s.role_ar, s.role_en)}`,
    paragraphs: [
      when(s.starts_at, l),
      ...(pick(l, s.location_ar ?? "", s.location_en ?? "")
        ? [pick(l, s.location_ar ?? "", s.location_en ?? "")]
        : []),
      l === "ar"
        ? "إن لم تعد تستطيع، فاطلب تبديلًا في «تقويمي» ليغطيها غيرك."
        : "If you can no longer make it, ask for a swap on My calendar so someone can cover it.",
    ],
  }));

/**
 * After someone deletes their account: it goes in 30 days, and signing in
 * before then keeps it (decisions.md, Members).
 */
export const accountDeletionScheduled = (
  lang: Lang,
  deletesOn: string,
  base: string
) =>
  build(lang, (l) => ({
    action: {
      href: `${base}${localizedPath(l, "/sign-in")}`,
      label: l === "ar" ? "سجّل الدخول لإبقاء حسابك" : "Sign in to keep it",
    },
    heading:
      l === "ar"
        ? `سيُحذف حسابك في ${formatLongDate(deletesOn, l)}`
        : `Your account will be deleted on ${formatLongDate(deletesOn, l)}`,
    paragraphs: [
      l === "ar"
        ? "طلبت حذف حسابك في جمعية الفنون والآداب. سيُحذف هو وحجوزاتك وملفك الشخصي في هذا التاريخ."
        : "You asked to delete your account with the AUIB Society of Arts and Letters. It goes on that date, with your bookings and your profile.",
      l === "ar"
        ? "غيّرت رأيك؟ سجّل الدخول قبل ذلك ويبقى حسابك كما هو. وإن لم تطلب ذلك، فسجّل الدخول وغيّر كلمة المرور."
        : "Changed your mind? Sign in before then and your account stays as it is. If you didn't ask for this, sign in and change your password.",
    ],
  }));

/**
 * A sign-in from a kind of device the account hasn't used (decisions.md,
 * Members). Account email: always sent.
 */
export const newDevice = (
  lang: Lang,
  at: string,
  device: string,
  base: string
) =>
  build(lang, (l) => ({
    action: account(base, l, "/account/settings"),
    heading:
      l === "ar" ? "تسجيل دخول من جهاز جديد" : "A sign-in from a new device",
    paragraphs: [
      l === "ar"
        ? `سُجّل الدخول إلى حسابك في ${formatLongDate(at, l)}، الساعة ${formatClock(at, l)}، من: ${device}`
        : `Your account was signed in on ${formatLongDate(at, l)}, at ${formatClock(at, l)}, from: ${device}`,
      l === "ar"
        ? "إن كان هذا أنت فلا تفعل شيئًا. وإن لم يكن، فافتح «الإعدادات»، واختر «الخروج من الأجهزة الأخرى»، وغيّر كلمة المرور."
        : "If this was you, there's nothing to do. If it wasn't, open Settings, choose “Sign out everywhere else” and change your password.",
    ],
  }));

/** After an account is deleted: to the address it had. */
export const accountDeleted = (lang: Lang) =>
  build(lang, (l) => ({
    heading: l === "ar" ? "حُذف حسابك" : "Your account is deleted",
    paragraphs: [
      l === "ar"
        ? "حذفنا حسابك في جمعية الفنون والآداب وما كان فيه، كما طلبت. لن تصلك منا رسائل بعد هذه."
        : "We've deleted your account with the AUIB Society of Arts and Letters and what it held, as you asked. This is the last email you'll get from us.",
      l === "ar"
        ? "إن لم تطلب ذلك، فردّ على هذه الرسالة فورًا."
        : "If you didn't ask for this, reply to this email right away.",
    ],
  }));

export interface DigestSection {
  readonly items: readonly { meta?: string; title: string }[];
  readonly title: string;
}

/**
 * The staff digest (decisions.md, Channels and email): once a day, what
 * waits for the officer in the Diwan, counted and named by record, never
 * by person; urgent alerts still go at once.
 */
export const staffDigest = (
  lang: Lang,
  sections: readonly DigestSection[],
  app: string
) =>
  build(lang, (l) => ({
    action: diwan(app, l, "/"),
    heading:
      l === "ar" ? "ما ينتظرك في الديوان" : "Waiting for you in the Diwan",
    lists: sections.map((section) => ({
      items: section.items.map((item) => ({
        meta: item.meta,
        title: item.title,
      })),
      title: section.title,
    })),
    paragraphs: [
      l === "ar"
        ? "هذه رسالة يومية واحدة بما وصل منذ الأمس. أما العاجل فيصلك فور حدوثه."
        : "One email a day with what came in since yesterday. Anything urgent still reaches you at once.",
    ],
  }));

// A sentence ends in its mark, perhaps closed by a parenthesis or a quote.
const END_PUNCTUATION = /[.!?…][)’”]?$/u;

/** "Dear Lina," or, with no first name on the list, "Hello," alone. */
const greeting = (l: Lang, firstName: string | null) => {
  const name = firstName?.trim();
  if (l === "ar") {
    return name ? `مرحبًا ${name}،` : "مرحبًا،";
  }
  return name ? `Dear ${name},` : "Hello,";
};

/** Two stations ("English Language Academy, College of Law") read as one. */
const stations = (l: Lang, station: string) =>
  station
    .split(", ")
    .map((part) => part.trim())
    .filter(Boolean)
    .join(l === "ar" ? " و" : " and the ");

/** What the writer typed, quoted, or only where they sat. */
const typedLine = (l: Lang, station: string, words: string | undefined) => {
  const where = stations(l, station);
  if (l === "ar") {
    return words
      ? `في شباط الماضي جلستَ إلى آلتنا الكاتبة في ${where} وكتبت: «${words}». احتفظنا بصفحتك.`
      : `في شباط الماضي جلستَ إلى آلتنا الكاتبة في ${where}. احتفظنا بصفحتك.`;
  }
  if (!words) {
    return `Last February you sat down at our typewriter at the ${where}. We kept your page.`;
  }
  // Chicago: quotes inside the quotation are single; the period goes
  // inside the closing mark, once.
  const inner = words.replaceAll("“", "‘").replaceAll("”", "’");
  const quoted = END_PUNCTUATION.test(inner) ? inner : `${inner}.`;
  return `Last February you sat down at our typewriter at the ${where} and typed: “${quoted}” We kept your page.`;
};

/** Who signs the invitation: the President, with their signature. */
export interface InvitationSigner {
  /** The holder chose the feminine Arabic form of the title (§13). */
  feminine?: boolean;
  /** The signature as an image (`/api/email/signature`), when there is one. */
  image?: string;
  name: string;
}

const presidentSignoff = (
  l: Lang,
  signer: InvitationSigner | undefined
): NoticeSignoff | undefined =>
  signer
    ? {
        closing: l === "ar" ? "مع خالص التحية،" : "Warmly,",
        image: signer.image,
        name: signer.name,
        title:
          l === "ar"
            ? `${signer.feminine ? "رئيسة" : "رئيس"} جمعية الفنون والآداب`
            : "President, AUIB Society of Arts and Letters",
      }
    : undefined;

const JOIN_LABEL = { ar: "انضم إلى الجمعية", en: "Join the Society" };

/** The plain invitation: no page, no six words, the same signature. */
const plainInvitation = (
  l: Lang,
  hello: string,
  join: string,
  signer: InvitationSigner | undefined
): Copy => ({
  action: { fallback: true, href: join, label: JOIN_LABEL[l] },
  heading:
    l === "ar"
      ? "انضم إلى جمعية الفنون والآداب"
      : "Join the AUIB Society of Arts and Letters",
  paragraphs: [
    hello,
    l === "ar"
      ? "أودّ أن أدعوك إلى الانضمام إلى جمعية الفنون والآداب في الجامعة الأمريكية. نُصدر «قرطاس»، صحيفة الجامعة الأمريكية للأخبار والآداب والفن، ونُدير «الفرقة»، مسرحنا، ونصنع «المحطة التالية»، برنامجنا المصوّر، ونقيم الفعاليات طوال العام."
      : "I’d like to invite you to join the AUIB Society of Arts and Letters. We publish Qirtas, AUIB’s paper of news, letters and art; run the Company, our theater; make Next Stop, our show; and hold events all year.",
    l === "ar"
      ? "انضم عبر ⁦auibsal.org/join⁩ بهذا البريد. إن لم ترغب في ذلك فتجاهل هذه الرسالة؛ لن نكتب إليك مرة أخرى."
      : "Join at auibsal.org/join with this email. If you’d rather not, simply ignore this email; we won’t write to you again.",
  ],
  signoff: presidentSignoff(l, signer),
});

export interface Invitation {
  /** Empty when the list has no first name: then "Hello," alone. */
  first_name: string | null;
  kind: "tour" | "plain";
  /** Two pages, one writer ("You typed two"). */
  pages: number;
  station: string | null;
  /** Quoted only when the writer's words may be quoted ("a / b" for two). */
  words: string | null;
}

const TWO = {
  ar: " كتبتَ صفحتين، وكلتاهما بانتظارك.",
  en: " You typed two, and both are waiting for you.",
};

/** The greeting and the Tour line of one invitation, as Resend contact properties. */
export const invitationContact = (lang: Lang, invite: Invitation) => {
  const station =
    invite.station?.trim() || (lang === "ar" ? "الجامعة" : "campus");
  const typed = typedLine(lang, station, invite.words?.trim());
  return {
    greeting: greeting(lang, invite.first_name),
    tour_line: typed + (invite.pages > 1 ? TWO[lang] : ""),
  };
};

/** Resend's placeholder for a contact property, filled for each recipient. */
export const contactField = (key: string) => `{{{contact.${key}}}}`;

const PREVIEW = {
  plain: {
    ar: "دعوة شخصية للانضمام إلى جمعية الفنون والآداب.",
    en: "A personal invitation to join the AUIB Society of Arts and Letters.",
  },
  tour: {
    ar: "في شباط الماضي كتبتَ ست كلمات على آلتنا الكاتبة. احتفظنا بصفحتك.",
    en: "Last February you typed six words at our typewriter. We kept your page.",
  },
};

/**
 * The invitation as one Broadcast for everyone of a kind: the greeting and
 * the Tour line are each recipient's contact properties
 * (`invitationContact`), the rest is the same for all.
 */
export const invitationBroadcast = (
  lang: Lang,
  kind: Invitation["kind"],
  join: string,
  signer?: InvitationSigner
) => {
  const built = invitation(
    lang,
    { first_name: null, kind, pages: 1, station: null, words: null },
    join,
    signer
  );
  const fields = ["greeting", kind === "tour" ? "tour_line" : null];
  return {
    ...built,
    blocks: built.blocks.map((block) => ({
      ...block,
      paragraphs: block.paragraphs.map((paragraph, at) => {
        const field = fields[at];
        return field ? contactField(field) : paragraph;
      }),
    })),
    preview: PREVIEW[kind][lang],
  };
};

/**
 * The one-time invitation to join (decisions.md): a letter from the
 * President, signed with their signature on the platform, made as a draft
 * Broadcast on their go and sent from Resend, from hello@auibsal.org, with
 * a stop link. A Typewriter
 * Tour writer hears about their page (quoting their words only when they
 * may be quoted); everyone else, the fall fair's sign-ups and the writers
 * with no page on record, gets a plain invitation, without "We kept your
 * page" or any six words.
 */
export const invitation = (
  lang: Lang,
  invite: Invitation,
  join: string,
  signer?: InvitationSigner
) =>
  build(lang, (l) => {
    const hello = greeting(l, invite.first_name);
    if (invite.kind === "plain") {
      return plainInvitation(l, hello, join, signer);
    }
    const { tour_line: typed } = invitationContact(l, invite);
    return {
      action: { fallback: true, href: join, label: JOIN_LABEL[l] },
      heading:
        l === "ar"
          ? "كلماتك الست من جولة الآلة الكاتبة"
          : "Your six words from the Typewriter Tour",
      paragraphs: [
        hello,
        typed,
        l === "ar"
          ? "افتتحنا ⁦auibsal.org⁩، البيت الجديد للجمعية، ويسعدني أن تكون من أوائل أعضائه. انضم عبر ⁦auibsal.org/join⁩ بهذا البريد، فتجد صفحتك بانتظارك في حسابك. تبقى خاصة حتى تقرر هل تظهر في ملفك أو في صفحة الجولة."
          : "We’ve just opened auibsal.org, the Society’s new home, and I’d love for you to be one of its first members. Join at auibsal.org/join with this email, and your page will be waiting in your account. It stays private until you decide whether to show it on your profile or on the Tour’s page.",
        l === "ar"
          ? "إن لم ترغب في ذلك فتجاهل هذه الرسالة؛ لن نعرض صفحتك في أي مكان ولن نكتب إليك مرة أخرى."
          : "If you’d rather not, simply ignore this email; we won’t show your page anywhere or write to you again.",
      ],
      signoff: presidentSignoff(l, signer),
    };
  });

/** Paragraphs: text between empty lines. */
const PARAGRAPH_BREAK = /\n\s*\n/u;

export interface AnnouncementInfo {
  body_ar: string;
  body_en: string;
  link_path: string | null;
  title_ar: string;
  title_en: string;
}

/**
 * An announcement (decisions.md, Channels and email): the President's notice in one language,
 * its paragraphs as written, with a button to the page it points to.
 */
export const announcement = (
  lang: Lang,
  notice: AnnouncementInfo,
  base: string
) =>
  build(lang, (l) => ({
    action: notice.link_path
      ? {
          fallback: true,
          href: `${base}${localizedPath(l, notice.link_path)}`,
          label: l === "ar" ? "افتح الصفحة" : "Open the page",
        }
      : undefined,
    heading: l === "ar" ? notice.title_ar : notice.title_en,
    paragraphs: (l === "ar" ? notice.body_ar : notice.body_en)
      .split(PARAGRAPH_BREAK)
      .map((p) => p.trim())
      .filter(Boolean),
  }));
