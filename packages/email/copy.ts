import { localizedPath } from "@repo/internationalization";
import { formatClock, formatLongDate } from "@repo/internationalization/format";
import type { NoticeBlock, NoticeProps } from "./templates/notice";

/**
 * The words of every platform email, in both languages. Arabic here was
 * written for the platform (needs-native-review in PROGRESS.md).
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

const other = (lang: Lang): Lang => (lang === "ar" ? "en" : "ar");

/** Builds the notice: the recipient's language first, then the other. */
const build = (lang: Lang, make: (l: Lang) => Copy): Built => {
  const first = make(lang);
  const blocks: NoticeBlock[] = [lang, other(lang)].map((l) => ({
    lang: l,
    ...make(l),
  }));
  return { blocks, preview: first.heading, subject: first.heading };
};

const when = (iso: string, l: Lang) =>
  `${formatLongDate(iso, l)} · ${formatClock(iso, l)}`;

const nexus = (base: string, l: Lang, path = "") => ({
  href: `${base}${localizedPath(l, path || "/")}`,
  label: l === "ar" ? "افتح النِّكسَس" : "Open the Nexus",
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

export const rsvpConfirmed = (lang: Lang, e: EventInfo, app: string) =>
  build(lang, (l) => ({
    action: nexus(app, l),
    heading:
      l === "ar"
        ? `حُجز مكانك: ${title(e, l)}`
        : `You're booked: ${title(e, l)}`,
    paragraphs: [
      ...eventLines(e, l),
      l === "ar"
        ? "رمز تذكرتك في النِّكسَس. وإن تغيّرت خططك فألغِ الحجز هناك ليأخذ غيرك المكان."
        : "Your ticket code is in the Nexus. If your plans change, cancel there so someone else can have the place.",
    ],
  }));

export const waitlistPromoted = (lang: Lang, e: EventInfo, app: string) =>
  build(lang, (l) => ({
    action: nexus(app, l),
    heading:
      l === "ar"
        ? `أصبح لك مكان: ${title(e, l)}`
        : `A place opened up: ${title(e, l)}`,
    paragraphs: [
      ...eventLines(e, l),
      l === "ar"
        ? "كنت على قائمة الانتظار، وقد حُجز لك مكان الآن. رمز تذكرتك في النِّكسَس."
        : "You were on the waiting list and you now have a place. Your ticket code is in the Nexus.",
    ],
  }));

export const eventReminder = (lang: Lang, e: EventInfo, app: string) =>
  build(lang, (l) => ({
    action: nexus(app, l),
    heading: l === "ar" ? `غداً: ${title(e, l)}` : `Tomorrow: ${title(e, l)}`,
    paragraphs: [
      ...eventLines(e, l),
      l === "ar"
        ? "إن لم تعد تستطيع الحضور، فألغِ حجزك في النِّكسَس."
        : "If you can no longer come, cancel your place in the Nexus.",
    ],
  }));

/** Letters and Gallery are read blind; News, Video and Voices by name. */
export type DeskKind = "blind" | "named";

const RECEIVED: Record<DeskKind, Record<Lang, string[]>> = {
  blind: {
    ar: [
      "يُقرأ عملك قراءة عمياء: لا يرى القرّاء والمحررون اسمك حتى يُتَّخذ القرار.",
      "يسمع كل كاتب الجواب في اليوم المعلن، أياً كان القرار. ويمكنك متابعة المراحل في النِّكسَس.",
    ],
    en: [
      "Your work is read blind: readers and editors never see your name until a decision is made.",
      "Every author hears by the announced date, either way. You can follow its progress in the Nexus.",
    ],
  },
  named: {
    ar: [
      "سيقرؤه محرر القسم ويتواصل معك باسمك بشأن التحرير والتحقق من الوقائع.",
      "يمكنك متابعة المراحل في النِّكسَس.",
    ],
    en: [
      "The desk editor will read it and work with you by name on the edit and the facts.",
      "You can follow its progress in the Nexus.",
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
    action: nexus(app, l, "/waraq"),
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
    action: nexus(app, l, "/waraq"),
    heading:
      l === "ar"
        ? `تعديل واحد قبل القراءة: ${work}`
        : `One fix before reading: ${work}`,
    paragraphs: [
      ...(note ? [note] : []),
      l === "ar"
        ? "هذا تعديل واحد وفرصة واحدة قبل الموعد النهائي، ولا يُحسب ضد العمل. عدّله في النِّكسَس ثم احفظ."
        : "It is one specific fix, one chance, before the deadline, and it won't count against the piece. Revise it in the Nexus and save.",
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
        action: nexus(app, l, "/waraq"),
        heading:
          l === "ar" ? `شكراً لإرسالك ${work}` : `Thank you for sending ${work}`,
        paragraphs:
          l === "ar"
            ? [
                "لم يختر المحررون هذا العمل لورق هذه المرة.",
                "هذا قرار يخص إصداراً واحداً، لا قيمة كتابتك. نرجو أن ترسل إلينا مجدداً.",
              ]
            : [
                "This time the editors have not selected it for Waraq.",
                "It is a decision about one Edition, not the worth of the writing. Please submit again.",
              ],
      };
    }
    return {
      action: nexus(app, l, "/waraq"),
      heading:
        l === "ar" ? `قُبل ${work} في ورق` : `${work} is accepted for Waraq`,
      paragraphs: [
        ACCEPTED[outcome][l],
        l === "ar"
          ? "خلال سبعة أيام: وقّع اتفاقية النشر وأكمل بياناتك ككاتب في النِّكسَس. توافق أنت على كل تغيير، وترى النص النهائي قبل نشره."
          : "Within 7 days, sign the Publication Agreement and complete your contributor details in the Nexus. You approve every change and see the final text before it is published.",
      ],
    };
  });

export const agreementReminder = (lang: Lang, work: string, app: string) =>
  build(lang, (l) => ({
    action: nexus(app, l, "/waraq"),
    heading:
      l === "ar"
        ? `بانتظار توقيعك: اتفاقية نشر ${work}`
        : `Waiting for your signature: ${work}`,
    paragraphs: [
      l === "ar"
        ? "قُبل عملك في ورق، ولا يمكن نشره قبل أن توقّع اتفاقية النشر في النِّكسَس."
        : "Your work is accepted for Waraq, and it cannot be published until you sign the Publication Agreement in the Nexus.",
    ],
  }));

const piecePath = (pieceId: string) => `/waraq/work?id=${pieceId}`;

/** Final check (72 hours): errors only, not new revisions. */
export const finalCheck = (
  lang: Lang,
  work: string,
  pieceId: string,
  app: string
) =>
  build(lang, (l) => ({
    action: nexus(app, l, piecePath(pieceId)),
    heading:
      l === "ar" ? `مراجعتك الأخيرة: ${work}` : `Your final check: ${work}`,
    paragraphs: [
      l === "ar"
        ? "راجع خلال ٧٢ ساعة اسمك والعنوان وكل فاصل أسطر ونبذتك، ثم وافق على النص في النِّكسَس."
        : "Within 72 hours, check your name, the title, every line break and your bio, then approve the text in the Nexus.",
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
    action: nexus(app, l, piecePath(pieceId)),
    heading:
      l === "ar"
        ? `ملاحظة من المحرر: ${work}`
        : `A note from your editor: ${work}`,
    paragraphs: [
      l === "ar"
        ? "كتب المحرر إليك عن عملك. اقرأ الملاحظة وردّ عليها في النِّكسَس. الكلمة الأخيرة في كلماتك لك."
        : "Your editor wrote to you about the piece. Read the note and reply in the Nexus. The final word on the words is yours.",
    ],
  }));

/** Thank-you with the credit line, when the piece goes out. */
export const piecePublished = (lang: Lang, work: string, url: string) =>
  build(lang, (l) => ({
    action: {
      href: url,
      label: l === "ar" ? "اقرأه في ورق" : "Read it in Waraq",
    },
    heading: l === "ar" ? `نُشر ${work}` : `${work} is published`,
    paragraphs: [
      l === "ar"
        ? "شكراً لك. إن أعدت نشره في مكان آخر فاكتب: «نُشر أولاً في ورق»."
        : "Thank you. If you republish it anywhere, add: \u201cFirst published in Waraq.\u201d",
    ],
  }));

/** Waraq's desks, as the emails name them. */
export const deskNames = {
  gallery: { ar: "معرض", en: "Gallery" },
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

/** The Sunday Paper: the week's pieces, in both languages. */
export const sundayPaper = (lang: Lang, items: SundayItem[], front: string) =>
  build(lang, (l) => ({
    action: {
      href: front,
      label: l === "ar" ? "افتح ورق" : "Open Waraq",
    },
    heading: l === "ar" ? "صحيفة الأحد من ورق" : "The Sunday Paper from Waraq",
    paragraphs: [
      l === "ar" ? "ما نُشر في ورق هذا الأسبوع:" : "This week in Waraq:",
      ...items.map((i) =>
        l === "ar"
          ? `${i.desk_ar}: ${i.title_ar || i.title_en} ${i.url}`
          : `${i.desk_en}: ${i.title_en || i.title_ar} ${i.url}`
      ),
    ],
  }));

/** The newsletter's double opt-in: nothing is sent until they confirm. */
export const newsletterConfirm = (lang: Lang, confirm: string) =>
  build(lang, (l) => ({
    action: {
      href: confirm,
      label: l === "ar" ? "أكّد اشتراكك" : "Confirm your subscription",
    },
    heading:
      l === "ar"
        ? "أكّد اشتراكك في «شهر في ورق»"
        : "Confirm your subscription to The Month in Waraq",
    paragraphs: [
      l === "ar"
        ? "طلب أحدهم بهذا العنوان رسالة «شهر في ورق» الشهرية من جمعية الفنون والآداب. اضغط الزر للتأكيد."
        : "Someone asked for The Month in Waraq, the monthly email from the AUIB Society of Arts and Letters, at this address. Press the button to confirm.",
      l === "ar"
        ? "إن لم تطلبه فتجاهل هذه الرسالة؛ لن نراسلك."
        : "If it was not you, ignore this email; we will not write again.",
    ],
  }));

export interface MonthEvent {
  starts_at: string;
  title_ar: string;
  title_en: string;
  url: string;
}

/** The Month in Waraq: the month's pieces and the coming public events. */
export const monthInWaraq = (
  lang: Lang,
  pieces: SundayItem[],
  events: MonthEvent[],
  front: string,
  unsubscribe: string
) =>
  build(lang, (l) => ({
    action: {
      href: front,
      label: l === "ar" ? "افتح ورق" : "Open Waraq",
    },
    heading: l === "ar" ? "شهر في ورق" : "The Month in Waraq",
    paragraphs: [
      ...(pieces.length > 0
        ? [
            l === "ar" ? "ما نُشر في ورق هذا الشهر:" : "This month in Waraq:",
            ...pieces.map((i) =>
              l === "ar"
                ? `${i.desk_ar}: ${i.title_ar || i.title_en} ${i.url}`
                : `${i.desk_en}: ${i.title_en || i.title_ar} ${i.url}`
            ),
          ]
        : []),
      ...(events.length > 0
        ? [
            l === "ar" ? "قادم في الجمعية:" : "Coming up at SAL:",
            ...events.map((e) =>
              l === "ar"
                ? `${formatLongDate(e.starts_at, l)}: ${e.title_ar || e.title_en} ${e.url}`
                : `${formatLongDate(e.starts_at, l)}: ${e.title_en || e.title_ar} ${e.url}`
            ),
          ]
        : []),
      l === "ar"
        ? `لإلغاء الاشتراك: ${unsubscribe}`
        : `To unsubscribe: ${unsubscribe}`,
    ],
  }));

export interface RoleInfo {
  ends_at: string;
  name_ar: string;
  name_en: string;
}

export const roleEnding = (lang: Lang, role: RoleInfo, app: string) =>
  build(lang, (l) => ({
    action: nexus(app, l),
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
    action: nexus(app, l, "/admin/programs"),
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
        body: "ستصلك هنا تذكيرات الفعاليات وأخبار ورق وقرارات النشر.",
        title: "الإشعارات تعمل",
      }
    : {
        body: "Event reminders, Waraq news and decisions will arrive here.",
        title: "Notifications are on",
      };
