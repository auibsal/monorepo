import { localizedPath, nexusPath } from "@repo/internationalization";
import { formatClock, formatLongDate } from "@repo/internationalization/format";
import type { NoticeBlock, NoticeProps } from "./templates/notice";

/**
 * The words of every platform email, in both languages. Each email goes
 * out in the member's language only (SAL-BRD-01: one language per piece).
 * Arabic here was written for the platform (needs-native-review in
 * PROGRESS.md).
 */
export type Lang = "en" | "ar";

interface Copy {
  action?: { href: string; label: string };
  heading: string;
  paragraphs: string[];
}

export interface Built extends NoticeProps {
  subject: string;
}

/** Builds the notice in the recipient's language only. */
const build = (lang: Lang, make: (l: Lang) => Copy): Built => {
  const copy = make(lang);
  const blocks: NoticeBlock[] = [{ lang, ...copy }];
  return { blocks, preview: copy.heading, subject: copy.heading };
};

const when = (iso: string, l: Lang) =>
  `${formatLongDate(iso, l)} · ${formatClock(iso, l)}`;

/** A member's own page on the site (Membership, Qirtas, …). */
const account = (base: string, l: Lang, path = "/membership") => ({
  href: `${base}${localizedPath(l, path)}`,
  label: l === "ar" ? "افتح «العضوية»" : "Open Membership",
});

/** A page in the Diwan, for officers. */
const nexus = (base: string, l: Lang, path = "") => ({
  href: `${base}${localizedPath(l, nexusPath(path || "/"))}`,
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
const MY_CALENDAR = "/events/book";

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
    heading: l === "ar" ? `غداً: ${title(e, l)}` : `Tomorrow: ${title(e, l)}`,
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
      "يسمع كل كاتب الجواب في اليوم المعلن، أياً كان القرار. ويمكنك متابعة المراحل في صفحة الكتابة لقرطاس.",
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
      l === "ar" ? `شكراً، وصلنا ${work}` : `Thank you: we received ${work}`,
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
          l === "ar" ? `شكراً لإرسالك ${work}` : `Thank you for sending ${work}`,
        paragraphs:
          l === "ar"
            ? [
                "لم يختر المحررون هذا العمل لقرطاس هذه المرة.",
                "هذا قرار يخص إصداراً واحداً، لا قيمة كتابتك. نرجو أن ترسل إلينا مجدداً.",
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

const piecePath = (pieceId: string) => `/qirtas/work?id=${pieceId}`;

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
        ? "راجع خلال ٧٢ ساعة اسمك والعنوان وكل فاصل أسطر ونبذتك، ثم وافق على النص في صفحة عملك."
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
        ? "شكراً لك. إن أعدت نشره في مكان آخر فاكتب: «نُشر أولاً في قرطاس»."
        : "Thank you. If you republish it anywhere, add: \u201cFirst published in Qirtas.\u201d",
    ],
  }));

/** Waraq's desks, as the emails name them. */
export const deskNames = {
  gallery: { ar: "معرض", en: "Gallery" },
  games: { ar: "ألعاب", en: "Games" },
  letters: { ar: "آداب", en: "Letters" },
  news: { ar: "أخبار", en: "News" },
  video: { ar: "مرئيات", en: "Video" },
  voices: { ar: "أصوات", en: "Voices" },
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
      href: confirm,
      label: l === "ar" ? "أكّد اشتراكك" : "Confirm your subscription",
    },
    heading:
      l === "ar"
        ? "أكّد اشتراكك في «صحيفة الأحد»"
        : "Confirm your subscription to the Sunday Paper",
    paragraphs: [
      l === "ar"
        ? "طلب أحدهم بهذا العنوان «صحيفة الأحد»، رسالة قرطاس الشهرية من جمعية الفنون والآداب، في أول أحد من كل شهر. اضغط الزر للتأكيد."
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
    action: nexus(app, l),
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

const paperPieces = (l: Lang, pieces: SundayItem[]) =>
  pieces.length === 0
    ? []
    : [
        l === "ar" ? "ما نُشر في قرطاس هذا الشهر:" : "New in Qirtas this month:",
        ...pieces.map((i) =>
          l === "ar"
            ? `${i.desk_ar}: ${i.title_ar || i.title_en} ${i.url}`
            : `${i.desk_en}: ${i.title_en || i.title_ar} ${i.url}`
        ),
      ];

const paperEvents = (l: Lang, events: MonthEvent[]) =>
  events.length === 0
    ? []
    : [
        l === "ar" ? "ما يجري:" : "What's on:",
        ...events.map((e) =>
          l === "ar"
            ? `${formatLongDate(e.starts_at, l)}: ${e.title_ar || e.title_en} ${e.url}`
            : `${formatLongDate(e.starts_at, l)}: ${e.title_en || e.title_ar} ${e.url}`
        ),
      ];

const paperPlaces = (l: Lang, places: OpenPlace[], callboard: string) =>
  places.length === 0
    ? []
    : [
        l === "ar"
          ? `أماكن مفتوحة في لوحة النداءات (${callboard}):`
          : `Open places on the Callboard (${callboard}):`,
        ...places.map((p) =>
          l === "ar" ? p.title_ar || p.title_en : p.title_en || p.title_ar
        ),
      ];

/**
 * The Sunday Paper (owner, Oct 29, 2026): monthly, on the first Sunday, to
 * members and to the public list alike. The month's pieces, What's on, and
 * the Callboard's open places.
 */
export const sundayPaper = (
  lang: Lang,
  {
    callboard,
    events,
    front,
    places,
    pieces,
    stop,
  }: {
    callboard: string;
    events: MonthEvent[];
    front: string;
    places: OpenPlace[];
    pieces: SundayItem[];
    stop: string;
  }
) =>
  build(lang, (l) => ({
    action: {
      href: front,
      label: l === "ar" ? "افتح قرطاس" : "Open Qirtas",
    },
    heading:
      l === "ar" ? "صحيفة الأحد من قرطاس" : "The Sunday Paper from Qirtas",
    paragraphs: [
      ...paperPieces(l, pieces),
      ...paperEvents(l, events),
      ...paperPlaces(l, places, callboard),
      l === "ar"
        ? `لإيقاف صحيفة الأحد: ${stop}`
        : `To stop the Sunday Paper: ${stop}`,
    ],
  }));

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
        ? `ينتهي دورك قريباً: ${role.name_ar}`
        : `Your role ends soon: ${role.name_en}`,
    paragraphs: [
      l === "ar"
        ? `ينتهي في ${formatLongDate(role.ends_at, l)}. سلّم ما لديك لمن يخلفك، وراجع المجلس إن كان يجب تمديده.`
        : `It ends on ${formatLongDate(role.ends_at, l)}. Hand over to your successor, and speak to the Council if it should be extended.`,
    ],
  }));

export interface OpeningReplyInfo {
  member: string;
  note: string | null;
  title: string;
}

/** Someone answered a Callboard opening (to Membership, which runs hiring). */
export const openingReply = (
  lang: Lang,
  reply: OpeningReplyInfo,
  app: string
) =>
  build(lang, (l) => ({
    action: nexus(app, l, "/hiring"),
    heading:
      l === "ar"
        ? `مهتم بدور: ${reply.title}`
        : `Interested in a role: ${reply.title}`,
    paragraphs: [
      l === "ar"
        ? `${reply.member} مهتم بهذا الدور في لوحة النداءات. حدّد موعدًا للحديث في قسم التوظيف.`
        : `${reply.member} is interested in this role on the Callboard. Set a time to talk in Hiring.`,
      ...(reply.note ? [reply.note] : []),
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
    action: nexus(app, l, "/programs"),
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
