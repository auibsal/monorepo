import { diwanPath, localizedPath } from "@repo/internationalization";
import { formatClock, formatLongDate } from "@repo/internationalization/format";
import type { NoticeBlock, NoticeList, NoticeProps } from "./templates/notice";

/**
 * The words of every platform email, in both languages. Each email goes
 * out in the member's language only (SAL-BRD-01: one language per piece).
 * Arabic here was written for the platform (needs-native-review in
 * PROGRESS.md).
 */
export type Lang = "en" | "ar";

interface Copy {
  action?: { fallback?: boolean; href: string; label: string };
  heading: string;
  lists?: NoticeList[];
  paragraphs: string[];
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
const account = (base: string, l: Lang, path = "/membership") => ({
  href: `${base}${localizedPath(l, path)}`,
  label: l === "ar" ? "افتح «العضوية»" : "Open Membership",
});

/** A page in the Diwan, for officers. */
const diwan = (base: string, l: Lang, path = "") => ({
  href: `${base}${localizedPath(l, diwanPath(path || "/"))}`,
  label: l === "ar" ? "افتح الديوان" : "Open the Diwan",
});

export interface EventInfo {
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
const MY_CALENDAR = "/membership/calendar";

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
    ar: "إن لم تعد تستطيع الحضور، فتنازل عن مكانك في «تقويمي» ليأخذه غيرك.",
    en: "If you can no longer come, give your place back on My calendar so someone else can have it.",
  },
  remindMe: {
    ar: "طلبت أن نذكّرك. لا حجز لهذه الفعالية: تعال فحسب.",
    en: "You asked us to remind you. There's no booking for this one: just come.",
  },
};

/**
 * The day before: to everyone booked (who can give the place back) and to
 * everyone who asked "Remind me" for an event without booking.
 */
export const eventReminder = (
  lang: Lang,
  e: EventInfo,
  app: string,
  booked = true
) =>
  build(lang, (l) => ({
    action: account(app, l, MY_CALENDAR),
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
  desk: DeskKind = "blind"
) =>
  build(lang, (l) => ({
    action: account(app, l, "/qirtas/write"),
    heading:
      l === "ar" ? `شكرًا، وصلنا ${work}` : `Thank you: we received ${work}`,
    paragraphs: RECEIVED[desk][l],
  }));

export const returnedForFormatting = (
  lang: Lang,
  work: string,
  note: string,
  app: string
) =>
  build(lang, (l) => ({
    action: account(app, l, "/qirtas/write"),
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
        action: account(app, l, "/qirtas/write"),
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
      action: account(app, l, "/qirtas/write"),
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
    action: account(app, l, "/qirtas/write"),
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

/** "Tell me when": a Qirtas call has opened. */
export const callOpened = (lang: Lang, call: CallInfo, app: string) =>
  build(lang, (l) => ({
    action: account(app, l, "/qirtas/write"),
    heading:
      l === "ar"
        ? `فُتحت دعوة قرطاس: ${call.title_ar}`
        : `A Qirtas call is open: ${call.title_en}`,
    paragraphs: [
      l === "ar"
        ? `تستقبل الدعوة الأعمال حتى ${formatLongDate(call.closes_at, l)}. أرسل عملك من صفحة الكتابة لقرطاس.`
        : `It takes work until ${formatLongDate(call.closes_at, l)}. Send yours from Write for Qirtas.`,
      l === "ar"
        ? "وصلتك هذه الرسالة لأنك طلبت أن نخبرك. يمكنك إيقافها من الصفحة نفسها."
        : "You asked us to tell you. You can stop these from the same page.",
    ],
  }));

const piecePath = (pieceId: string) => `/membership/work/${pieceId}`;

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
        ? "إن لم تطلب ذلك، فردّ على هذه الرسالة فورًا وأخبر المجلس التنفيذي."
        : "If you didn't ask for this, reply to this email right away and tell the Council.",
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
          action: account(app, l, "/membership"),
          heading:
            l === "ar" ? "تم التحقق من حسابك" : "Your account is verified",
          paragraphs: [
            l === "ar"
              ? "راجعت الهيئة الإدارية لجمعية الفنون والآداب حسابك ووافقت عليه. أكمل إعداد حسابك، وستجد بطاقتك والفعاليات وكل ما في الجمعية في صفحة العضوية."
              : "The Council of the AUIB Society of Arts and Letters has checked and approved your account. Finish setting up, and your card, the events and everything else are on your Membership page.",
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
              ? "إن ظننت أن في الأمر خطأ، فردّ على هذه الرسالة وأخبرنا بصلتك بالجامعة الأمريكية في العراق – بغداد أو بالجمعية."
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

const SOCIETY_AR = "جمعية الفنون والآداب في الجامعة الأمريكية في بغداد";

/** A partner invitation's heading and first lines, by kind and language. */
const invitationLines = (
  l: Lang,
  kind: "team" | "guest" | "society",
  partner: string
): { body: string; heading: string } => {
  // The Society's own guest, invited by Membership (owner, Oct 31, 2026).
  if (kind === "society") {
    return l === "ar"
      ? {
          body: `تدعوك ${SOCIETY_AR} لتكون ضيفها: تحجز مقاعد في الفعاليات، وتستفيد من امتيازات الشركاء، وتحمل بطاقة الضيف الحيّة.`,
          heading: "أنت مدعو ضيفًا للجمعية",
        }
      : {
          body: "The AUIB Society of Arts and Letters invites you as its guest: you book places at events, use our partners' perks, and carry a guest's live card.",
          heading: "You are invited as the Society's guest",
        };
  }
  if (kind === "team") {
    return l === "ar"
      ? {
          body: `${partner} شريك لـ${SOCIETY_AR}، ويدعوك إلى فريقه على منصة الجمعية: ملف الشريك وامتيازاته وضيوفه.`,
          heading: `انضم إلى فريق ${partner}`,
        }
      : {
          body: `${partner} is a partner of the AUIB Society of Arts and Letters and invites you to its team on the Society's platform: the partner's profile, its perks and its guests.`,
          heading: `Join ${partner}'s team`,
        };
  }
  return l === "ar"
    ? {
        body: `${partner} شريك لـ${SOCIETY_AR}. بصفتك ضيفه تحجز مقاعد في الفعاليات، وترى امتيازاته، وتكتب لقرطاس حين تُفتح دعوة لـ${partner}.`,
        heading: `يدعوك ${partner} ضيفًا`,
      }
    : {
        body: `${partner} is a partner of the AUIB Society of Arts and Letters. As its guest you book places at events, use its perks, and write for Qirtas when a call is open to ${partner}.`,
        heading: `${partner} invites you as its guest`,
      };
};

/**
 * A partner's invitation (owner, Oct 31, 2026): to join its team on the
 * platform, or to be its guest. The link is the invitation.
 */
export const partnerInvitation = (
  lang: Lang,
  partner: string,
  kind: "team" | "guest" | "society",
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

export interface OpenPlace {
  title_ar: string;
  title_en: string;
}

const pick = (l: Lang, ar: string, en: string) =>
  l === "ar" ? ar || en : en || ar;

const PAPER_TITLES = {
  ar: {
    events: "ما يجري هذا الشهر",
    heading: "جريدة الأحد",
    lede: "ما نُشر في قرطاس هذا الشهر، وما يجري في الجمعية، والأماكن المفتوحة لمن يريد أن يشارك.",
    open: "افتح قرطاس",
    pieces: "جديد قرطاس",
    places: "أماكن مفتوحة في «شارك»",
  },
  en: {
    events: "What's on this month",
    heading: "The Sunday Paper",
    lede: "This month in Qirtas, what's on at the Society, and the places open to anyone who wants to get involved.",
    open: "Open Qirtas",
    pieces: "New in Qirtas",
    places: "Open on Get involved",
  },
} as const;

/**
 * The Sunday Paper (owner, Oct 29, 2026): monthly, on the first Sunday, to
 * members and to the public list alike: the month's pieces, What's on and
 * the open places on Get involved, each a list of links. The stop link is
 * in the footer and the List-Unsubscribe header.
 */
export const sundayPaper = (
  lang: Lang,
  paper: {
    getInvolved: string;
    events: MonthEvent[];
    front: string;
    places: OpenPlace[];
    pieces: SundayItem[];
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
    ];
    return {
      action: { href: paper.front, label: titles.open },
      heading: titles.heading,
      lists: lists.filter((list) => list.items.length > 0),
      paragraphs: [titles.lede],
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
    action: diwan(app, l, "/programs"),
    heading: removalHeading[overdue ? "overdue" : "new"][l],
    paragraphs: [
      l === "ar"
        ? `يجب الحذف قبل ${when(r.due_at, l)} (السياسة 5.3: خلال 24 ساعة، دون الحاجة إلى أسباب).`
        : `Take it down by ${when(r.due_at, l)} (Policy 5.3: within 24 hours, no reasons needed).`,
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
        ? `سيُحذف المحتوى خلال 24 ساعة، قبل ${when(dueAt, l)}، وسنكتب إليك عند الانتهاء.`
        : `It comes down within 24 hours, by ${when(dueAt, l)}, and we'll write to you when it's done.`,
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

// ── Journeys added in the email audit (owner, Nov 4, 2026) ────────────────

/** An event that is canceled, or moved to another day, time or place. */
export const eventChanged = (
  lang: Lang,
  e: EventInfo,
  change: "cancelled" | "moved",
  app: string
) =>
  build(lang, (l) =>
    change === "cancelled"
      ? {
          action: account(app, l, MY_CALENDAR),
          heading:
            l === "ar" ? `أُلغيت: ${title(e, l)}` : `Canceled: ${title(e, l)}`,
          paragraphs: [
            l === "ar"
              ? `لن تُقام ${title(e, l)} في ${when(e.starts_at, l)}. ألغينا حجزك، ولا شيء عليك أن تفعله.`
              : `${title(e, l)} on ${when(e.starts_at, l)} won't take place. Your booking is canceled; there's nothing you need to do.`,
            l === "ar"
              ? "نأسف لذلك. ما يجري بعدها في «تقويمي» وفي صفحة «ما يجري»."
              : "We're sorry. What's coming up next is on My calendar and What's on.",
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
    action: account(app, l, "/partners/join"),
    heading:
      l === "ar" ? `وصلنا طلب ${partner}` : `We have ${partner}'s application`,
    paragraphs: [
      l === "ar"
        ? "شكرًا لطلبك الشراكة مع جمعية الفنون والآداب. تقرأ «الشراكات» الطلب، وإن مضى يوقّع رئيس الجمعية مذكرة التفاهم."
        : "Thank you for applying to partner with the AUIB Society of Arts and Letters. Partnerships reads the application, and if it goes ahead, the President signs the memorandum.",
      l === "ar"
        ? "سنكتب إليك حين يُتّخذ القرار. ويمكنك رؤية الطلب في أي وقت من الرابط أدناه."
        : "We'll write to you when it's decided. You can see the application at any time from the link below.",
    ],
  }));

/** Partnerships and the President: an application waits. */
export const applicationWaiting = (lang: Lang, partner: string, app: string) =>
  build(lang, (l) => ({
    action: diwan(app, l, "/people/partners/applications"),
    heading:
      l === "ar"
        ? `طلب شراكة: ${partner}`
        : `A partner application: ${partner}`,
    paragraphs: [
      l === "ar"
        ? `تقدّم ${partner} بطلب الشراكة مع الجمعية، ووقّع ممثله مذكرة التفاهم. الطلب في الديوان بانتظار القرار.`
        : `${partner} has applied to partner with the Society, and its signatory has signed the memorandum. It waits in the Diwan for a decision.`,
    ],
  }));

/** The applicant: the partnership is signed, or not taken forward. */
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
              ? "وقّع رئيس الجمعية مذكرة التفاهم. لوحة الشريك مفتوحة لك الآن: الملف والمذكرة، والامتيازات، والفريق والضيوف."
              : "The President has signed the memorandum. Your partner dashboard is open: the profile and memorandum, perks, and your team and guests.",
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
      action: account(app, l, "/membership/society"),
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
      action: account(app, l, "/membership/society"),
      heading: `${lines[0]}: ${pick(l, seat.title_ar, seat.title_en)}`,
      paragraphs: [lines[1]],
    };
  });

/** A certificate, signed by both and issued. */
export const certificateIssued = (
  lang: Lang,
  what: string,
  certificateId: string,
  app: string
) =>
  build(lang, (l) => ({
    action: {
      href: `${app}${localizedPath(l, `/membership/record/${certificateId}`)}`,
      label: l === "ar" ? "افتح الشهادة" : "Open the certificate",
    },
    heading: l === "ar" ? "شهادتك جاهزة" : "Your certificate is ready",
    paragraphs: [
      ...(what ? [what] : []),
      l === "ar"
        ? "وقّعها رئيس الجمعية والمستشار الأكاديمي. تجدها في «السجل»، ويمكن لأي أحد التحقق منها برمزها."
        : "The President and the Faculty Advisor have signed it. It's on your Record, and anyone can check it with its code.",
    ],
  }));

const REQUEST_NAMES: Record<string, Record<Lang, string>> = {
  f09: { ar: "مقترحك للجمعية العمومية", en: "your General Assembly motion" },
  f10: { ar: "مقترح البرنامج", en: "your program pitch" },
  f19: { ar: "ما رفعته من قلق", en: "your concern" },
  f20: { ar: "ما رفعته من قلق", en: "your concern" },
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
    const action = account(app, l, `/membership/requests/${requestId}`);
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
  "talking" | "offered" | "not_picked",
  Record<
    Lang,
    {
      at: (time: string) => string;
      body: string;
      heading: string;
      soon: string;
    }
  >
> = {
  not_picked: {
    ar: {
      at: () => "",
      body: "اختير غيرك لهذا الدور هذه المرة. شكرًا لاهتمامك؛ تُنشر أدوار وأماكن جديدة في «شارك» طوال العام.",
      heading: "بشأن",
      soon: "",
    },
    en: {
      at: () => "",
      body: "Someone else was chosen for this role this time. Thank you for your interest; new roles and places open on Get involved all year.",
      heading: "About",
      soon: "",
    },
  },
  offered: {
    ar: {
      at: () => "",
      body: "الدور لك إن أردته. ستتواصل معك «العضوية» لتبدأ.",
      heading: "عرض",
      soon: "",
    },
    en: {
      at: () => "",
      body: "The role is yours if you'd like it. Membership will be in touch to get you started.",
      heading: "An offer",
      soon: "",
    },
  },
  talking: {
    ar: {
      at: (time) => `تودّ «العضوية» الحديث معك عن هذا الدور في ${time}.`,
      body: "إن لم يناسبك الموعد، فردّ على هذه الرسالة.",
      heading: "لنتحدث",
      soon: "تودّ «العضوية» الحديث معك عن هذا الدور، وستتواصل معك لتحديد موعد.",
    },
    en: {
      at: (time) =>
        `Membership would like to talk with you about this role on ${time}.`,
      body: "If the time doesn't suit you, reply to this email.",
      heading: "Let's talk",
      soon: "Membership would like to talk with you about this role and will be in touch to set a time.",
    },
  },
};

/** A member who said "I'm interested" in a role: what happens next. */
export const replyUpdate = (
  lang: Lang,
  role: string,
  status: "talking" | "offered" | "not_picked",
  talkAt: string | null,
  app: string
) =>
  build(lang, (l) => {
    const lines = REPLY_LINES[status][l];
    const time = talkAt ? when(talkAt, l) : null;
    return {
      action: account(app, l, "/get-involved"),
      heading: `${lines.heading}: ${role}`,
      paragraphs: [
        ...(status === "talking" ? [time ? lines.at(time) : lines.soon] : []),
        lines.body,
      ],
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
          `استدعاء ثانٍ: ${play}`,
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
                  ? "ما يجري: أمسيات القراءة، ونقاشات الكتب، وورش الكتابة، وغيرها"
                  : "What's on: readings, book discussions, writing workshops and more",
            },
            {
              href: link("/qirtas/write"),
              title:
                l === "ar"
                  ? "اكتب لقرطاس: أي قسم، في أي وقت"
                  : "Write for Qirtas: any section, any time",
            },
            {
              href: link("/get-involved"),
              title:
                l === "ar"
                  ? "شارك: الأدوار والمناوبات وتجارب الأداء"
                  : "Get involved: roles, shifts and auditions",
            },
            {
              href: "https://t.me/auibsal_bot",
              title:
                l === "ar"
                  ? "هدهد على Telegram: يدخلك مجموعة الأعضاء"
                  : "Hudhud on Telegram: lets you into the members' group",
            },
          ],
          title: l === "ar" ? "من أين تبدأ" : "Where to start",
        },
      ],
      paragraphs: [
        l === "ar"
          ? "أنت عضو الآن. بطاقتك الحيّة في صفحة «العضوية»: تُظهرها عند الباب، وتحمل امتيازات الشركاء."
          : "You're a member now. Your live card is on Membership: show it at the door, and it carries our partners' perks.",
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

export interface ReplyLine {
  member: string;
  note: string | null;
  role: string;
}

/** Membership: the day's replies on Get involved, in one email. */
export const repliesDigest = (lang: Lang, replies: ReplyLine[], app: string) =>
  build(lang, (l) => ({
    action: diwan(app, l, "/people/openings"),
    heading:
      l === "ar"
        ? `ردود جديدة في «شارك» (${replies.length})`
        : `New replies on Get involved (${replies.length})`,
    lists: [
      {
        items: replies.map((r) => ({
          meta: r.role,
          title: r.note ? `${r.member}: ${r.note}` : r.member,
        })),
        title: l === "ar" ? "منذ الأمس" : "Since yesterday",
      },
    ],
    paragraphs: [
      l === "ar"
        ? "أعضاء قالوا «أنا مهتم». حدّد مواعيد الحديث في «الفرص»."
        : "Members who said they're interested. Set times to talk in Openings.",
    ],
  }));

const END_PUNCTUATION = /[.!?…]$/;

/** "Hello Lina," or, with no first name on the list, "Hello," alone. */
const greeting = (l: Lang, firstName: string | null) => {
  const name = firstName?.trim();
  if (l === "ar") {
    return name ? `مرحبًا ${name}،` : "مرحبًا،";
  }
  return name ? `Hello ${name},` : "Hello,";
};

/** What the writer typed, quoted, or only where they sat. */
const typedLine = (l: Lang, station: string, words: string | undefined) => {
  // Chicago: the period goes inside the quotation marks, once.
  const quoted = words && END_PUNCTUATION.test(words) ? words : `${words}.`;
  if (l === "ar") {
    return words
      ? `في شباط الماضي جلستَ إلى آلة الجمعية الكاتبة في ${station} وكتبت: «${words}». احتفظنا بصفحتك.`
      : `في شباط الماضي جلستَ إلى آلة الجمعية الكاتبة في ${station}. احتفظنا بصفحتك.`;
  }
  return words
    ? `Last February you sat down at the Society’s typewriter at the ${station} and typed: “${quoted}” We kept your page.`
    : `Last February you sat down at the Society’s typewriter at the ${station}. We kept your page.`;
};

/** The plain invitation: no page, no six words, the same signature. */
const plainInvitation = (
  l: Lang,
  hello: string,
  signature: string,
  join: string
): Copy => ({
  action: {
    fallback: true,
    href: join,
    label: l === "ar" ? "انضم إلى الجمعية" : "Join the Society",
  },
  heading:
    l === "ar"
      ? "انضم إلى جمعية الفنون والآداب"
      : "Join the AUIB Society of Arts and Letters",
  paragraphs: [
    hello,
    l === "ar"
      ? "ندعوك إلى الانضمام إلى جمعية الفنون والآداب في الجامعة الأمريكية في العراق – بغداد. انضم عبر auibsal.org/join بهذا البريد. إن لم ترغب في ذلك فتجاهل هذه الرسالة؛ لن نكتب إليك مرة أخرى."
      : "We’d like to invite you to join the AUIB Society of Arts and Letters. Join at auibsal.org/join with this email. If you’d rather not, just ignore this email; we won’t write again.",
    signature,
  ],
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

/**
 * The one-time invitation to join (owner, Nov 7, 2026): sent once, on the
 * President's go, from hello@auibsal.org, with a stop link. A Typewriter
 * Tour writer hears about their page (quoting their words only when they
 * may be quoted); everyone else, the fall fair's sign-ups and the writers
 * with no page on record, gets a plain invitation, without "We kept your
 * page" or any six words.
 */
export const invitation = (lang: Lang, invite: Invitation, join: string) =>
  build(lang, (l) => {
    const hello = greeting(l, invite.first_name);
    const signature =
      l === "ar" ? "جمعية الفنون والآداب" : "AUIB Society of Arts and Letters";
    if (invite.kind === "plain") {
      return plainInvitation(l, hello, signature, join);
    }
    const station =
      invite.station?.trim() || (l === "ar" ? "الجامعة" : "campus");
    const typed = typedLine(l, station, invite.words?.trim());
    const two =
      invite.pages > 1
        ? [
            l === "ar"
              ? "كتبتَ صفحتين، وكلتاهما تذهب إلى ملفك."
              : "You typed two; both go on your profile.",
          ]
        : [];
    return {
      action: {
        fallback: true,
        href: join,
        label: l === "ar" ? "انضم إلى الجمعية" : "Join the Society",
      },
      heading:
        l === "ar"
          ? "كلماتك الست من جولة الآلة الكاتبة"
          : "Your six words from the Typewriter Tour",
      paragraphs: [
        hello,
        typed,
        ...two,
        l === "ar"
          ? "إنها لك. انضم إلى الجمعية عبر auibsal.org/join بهذا البريد، فتُضاف صفحتك إلى حسابك. تبقى خاصة حتى تختار في حسابك هل تظهر أيضًا في ملفك أو في صفحة الجولة. إن لم ترغب في ذلك فتجاهل هذه الرسالة؛ لن نعرض صفحتك في أي مكان ولن نكتب إليك مرة أخرى."
          : "It’s yours to claim. Join the Society at auibsal.org/join with this email, and your page is added to your account. It stays private until you choose, in your account, whether it also appears on your profile or on the Tour’s page. If you’d rather not, just ignore this email; we won’t show your page anywhere or write again.",
        l === "ar"
          ? "هل تريد الورقة الأصلية؟ استلمها من طاولة العضوية في الجمعية هذا الفصل؛ الصفحات التي لا تُستلم تُتلف في نهاية الفصل."
          : "Would you like the original sheet? Pick it up at the Society’s membership table this term; pages not collected are shredded at the end of the term.",
        signature,
      ],
    };
  });
