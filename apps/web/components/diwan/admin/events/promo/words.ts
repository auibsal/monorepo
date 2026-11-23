import type { Lang } from "./draw";

/**
 * The promo kit's own words, in both languages, since every piece is made
 * in each (decisions.md, Events: a promo kit on every event). Signs at the
 * door and the table tents are where the Society chats: Iraqi Arabic
 * (decisions.md, Language); everything else is Modern Standard Arabic.
 */
export const KIT_WORDS: Record<
  Lang,
  {
    checkIn: string;
    checkInText: string;
    contentNote: string;
    coSponsoredBy: string;
    foldAndTear: string;
    forConversation: string;
    howWasIt: string;
    /** "A note to the filmmakers" (a screening) or "to the writers". */
    noteTo: (films: boolean) => string;
    runTime: (n: number) => string;
    thanksTo: string;
    /** "Turn over: a note to the filmmakers". */
    turnOver: (films: boolean) => string;
    wellness: string;
    goodToKnow: string;
    inProgress: string;
    inProgressText: string;
    minutes: (n: number) => string;
    photos: string;
    photosText: string;
    thanks: string;
    thanksText: string;
    today: string;
    tomorrow: string;
  }
> = {
  ar: {
    checkIn: "سجّلوا حضوركم هنا",
    checkInText: "اعرضوا التذكرة من حسابكم، أو گولوا اسمكم.",
    contentNote: "انتبهوا للمحتوى",
    coSponsoredBy: "برعاية مشتركة مع",
    foldAndTear: "اطوِ واقطع",
    forConversation: "للنقاش",
    howWasIt: "كيف كانت؟",
    noteTo: (films) => (films ? "رسالة إلى صنّاع الأفلام" : "رسالة إلى الكتّاب"),
    runTime: (n) => `مدة العرض: ${n} دقيقة`,
    thanksTo: "شكر وتقدير",
    turnOver: (films) =>
      films
        ? "اقلب الورقة: رسالة إلى صنّاع الأفلام"
        : "اقلب الورقة: رسالة إلى الكتّاب",
    wellness:
      "إن بقي معك شيء مما شاهدته، فمركز العافية في الجامعة موجود لتتحدث إليه.",
    goodToKnow: "معلومات مفيدة",
    inProgress: "الفعالية بلّشت",
    inProgressText: "ادخلوا بهدوء رجاءً.",
    minutes: (n) => `${n} دقيقة`,
    photos: "دا نصوّر الفعالية",
    photosText: "إذن النشر الإعلامي للجمعية يشمل كل الحاضرين.",
    thanks: "شكرًا لحضوركم",
    thanksText: "سؤال واحد بصفحة الفعالية: كيف كانت؟",
    today: "اليوم",
    tomorrow: "غدًا",
  },
  en: {
    checkIn: "Check in here",
    checkInText: "Show the ticket in your account, or give your name.",
    contentNote: "Content note",
    coSponsoredBy: "Co-sponsored by",
    foldAndTear: "Fold and tear",
    forConversation: "For the conversation",
    goodToKnow: "Good to know",
    howWasIt: "How was it?",
    noteTo: (films) =>
      films ? "A note to the filmmakers" : "A note to the writers",
    runTime: (n) => `Run time: ${n} minutes`,
    thanksTo: "Thanks to",
    turnOver: (films) =>
      films
        ? "Turn over: a note to the filmmakers"
        : "Turn over: a note to the writers",
    wellness:
      "If something stays with you, AUIB’s Wellness Center is there to talk to.",
    inProgress: "Event in progress",
    inProgressText: "Please come in quietly.",
    minutes: (n) => `${n} min.`,
    photos: "Photos are taken",
    photosText: "The Society’s media release covers everyone at the event.",
    thanks: "Thanks for coming",
    thanksText: "One question on the event’s page: how was it?",
    today: "Today",
    tomorrow: "Tomorrow",
  },
};

/** The event's "Good to know" fields, as the kit's card lists them. */
export interface KitFacts {
  access_detail_ar: string | null;
  access_detail_en: string | null;
  classes: string[];
  content_note_ar: string | null;
  content_note_en: string | null;
  entry: string;
  language: string | null;
  no_photos: boolean;
  off_campus: boolean;
  seating: string | null;
  serves_food: boolean;
  starts_at: string;
  step_free: boolean | null;
}

const FACT_WORDS = {
  ar: {
    both: "اللغة: العربية والإنجليزية",
    food: "يُقدَّم طعام وشراب",
    lang: { ar: "اللغة: العربية", en: "اللغة: الإنجليزية" },
    mixed: "بعض المقاعد، وبعض الحضور وقوفًا",
    note: "تنبيه حول المحتوى",
    notStepFree: "فيه درج",
    photos: "يُصوَّر الحدث",
    seated: "الحضور جلوسًا",
    standing: "الحضور وقوفًا",
    stepFree: "بلا درج",
  },
  en: {
    both: "In English and Arabic",
    food: "Food and drink are served",
    lang: { ar: "In Arabic", en: "In English" },
    mixed: "Some seats, some standing",
    note: "Content note",
    notStepFree: "Not step-free",
    photos: "Photos are taken",
    seated: "Seated",
    standing: "Standing",
    stepFree: "Step-free",
  },
} as const;

const stepWords = (stepFree: boolean | null, lang: Lang) => {
  if (stepFree === null) {
    return null;
  }
  return stepFree ? FACT_WORDS[lang].stepFree : FACT_WORDS[lang].notStepFree;
};

const languageWords = (language: string | null, lang: Lang) => {
  if (language === "both") {
    return FACT_WORDS[lang].both;
  }
  return language === "ar" || language === "en"
    ? FACT_WORDS[lang].lang[language]
    : null;
};

/**
 * "Good to know" in the kit's language: who can come and how, the
 * language, access and seating with its detail, food, the content note,
 * and photos (decisions.md, Events).
 */
export const goodToKnowLines = (
  event: KitFacts,
  lang: Lang,
  access: string
) => {
  const w = FACT_WORDS[lang];
  const seating =
    event.seating === "seated" ||
    event.seating === "standing" ||
    event.seating === "mixed"
      ? w[event.seating]
      : null;
  const step = stepWords(event.step_free, lang);
  const language = languageWords(event.language, lang);
  const note = lang === "ar" ? event.content_note_ar : event.content_note_en;
  const detail =
    lang === "ar" ? event.access_detail_ar : event.access_detail_en;
  return [
    access,
    language,
    [step, seating].filter(Boolean).join(" · ") || null,
    detail,
    event.serves_food ? w.food : null,
    note ? `${w.note}: ${note}` : null,
    event.no_photos ? null : w.photos,
  ].filter((line): line is string => Boolean(line));
};
