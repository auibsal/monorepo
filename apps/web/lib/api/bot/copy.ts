/**
 * Everything Hudhud says, in English and Arabic. Hudhud is the Society's
 * messenger: warm, brief and literate, a little playful, never loud (no
 * exclamation marks, no emoji). Dynamic values arrive already escaped for
 * Telegram HTML and already formatted (Latin digits, Baghdad time).
 *
 * The Arabic was written for the platform: needs-native-review.
 */

export type Lang = "en" | "ar";

export const langOf = (code: string | undefined): Lang =>
  code?.toLowerCase().startsWith("ar") ? "ar" : "en";

export const purposes = ["announcements", "events", "waraq", "word"] as const;
export type Purpose = (typeof purposes)[number];

const en = {
  alreadyLinked: (name: string) => `You're linked as ${name}.`,
  buttons: {
    back: "Back",
    calendar: "Add to calendar",
    cancel: "Cancel my place",
    details: "Details",
    events: "Events",
    link: "Link my account",
    me: "My account",
    nexus: "Open the Diwan",
    notifyOff: "Notices here: off",
    notifyOn: "Notices here: on",
    play: "Play",
    read: "Read",
    rsvp: "RSVP",
    site: "auibsal.org",
    unlink: "Unlink Telegram",
    waraq: "Qirtas",
    word: "Daily word",
  },
  by: (author: string) => `by ${author}`,
  commands: {
    events: "What's coming up",
    help: "What I can do",
    lang: "Language of my posts: en, ar or both",
    me: "Your account and your places",
    setup: "Connect this group (code from the Diwan)",
    start: "Say hello",
    topic: "Tell me what this topic is for",
    waraq: "New in Qirtas",
    word: "Play today's word",
  },
  description:
    "Hudhud, the messenger of the AUIB Society of Arts and Letters. Events and RSVPs, Qirtas, a daily word, and your Diwan notices, all in Telegram.",
  eventMissing:
    "I couldn't find that event. It may have been moved or canceled.",
  eventsNone:
    "Nothing on the calendar yet. I'll post new events in the group as soon as they're announced.",

  // Events
  eventsTitle: "<b>Coming up</b>",
  full: "Full: an RSVP joins the waitlist",
  generic: "Something went wrong on my side. Try again in a minute.",
  going: "You have a place.",

  greeting: (name?: string) =>
    `${name ? `Hello, ${name}.` : "Hello."} I'm Hudhud, the messenger of the AUIB Society of Arts and Letters.\n\nI carry the Society's news: what's on and how to get a place, what's new in Qirtas, and a word to guess every day. Where shall we start?`,
  help: [
    "<b>What I can do</b>",
    "/events: what's coming up, and your place in one tap",
    "/waraq: new in the Society's paper",
    "/word: play today's word",
    "/me: your account and your places",
    "",
    "Link your Diwan account and I'll also bring your notices here: reminders, RSVPs and Qirtas decisions.",
    "",
    "In any chat, type my name and a few words to share an event or a Qirtas piece.",
  ].join("\n"),

  // Inline
  inlineEvent: "Event",
  inlinePiece: "Qirtas",
  joinWaiting: (group: string) =>
    `Thank you for asking to join ${group}. An admin will look at your request soon. If you have a Diwan account, link it and I'll let you in right away.`,
  langOk: "I'll post in this language from now on.",
  langUsage: "Use /lang en, /lang ar or /lang both.",
  linked: (name: string) =>
    `Linked. Good to meet you properly, ${name}. Your notices will come here too; /me turns them off.`,
  linkFailed:
    "That link has expired or was already used. Make a new one in the Diwan, under your profile.",

  // Linking
  linkHow:
    "To link your account, open the Diwan, go to your profile and choose <b>Connect Telegram</b>. It takes one tap.",
  memberNo: "Not verified yet: finish joining in the Diwan to RSVP.",
  membersOnly: "Members only",
  memberYes: "Verified member",

  // Account
  meTitle: (name: string) => `<b>${name}</b>`,
  myPlaces: "<b>Your places</b>",
  needLink: "Link your Diwan account first, then I can RSVP for you.",

  noPlaces: "No places yet. /events shows what's on.",
  notAdmin: "Only the group's admins can do that.",
  notConnected:
    "This group isn't connected to the Society yet. An officer can connect it from the Diwan (Settings, Telegram).",
  notifyOff: "Notices will go by email only.",
  notifyOn: "Notices will come here again.",
  notLinked:
    "Your Telegram isn't linked to a Diwan account yet, so I only know your Telegram name.",
  onePlaceLeft: "1 place left",
  placesLeft: (n: string) => `${n} places left`,

  // Group posts
  postEventNew: "<b>New event</b>",
  postEventSoon: (time: string) => `<b>Starting soon</b>, at ${time}`,
  postPiece: "<b>New in Qirtas</b>",
  postWord: (n: string) => `<b>Word No. ${n}</b> is ready.`,
  purposeNames: {
    announcements: "announcements",
    events: "events",
    waraq: "Qirtas",
    word: "the daily word",
  } satisfies Record<Purpose, string>,
  rsvpAlready: "You already have a place.",
  rsvpCancelled: "Done. Your place is free for someone else.",
  rsvpClosed: "This event doesn't take RSVPs.",
  rsvpConfirmed: "You're in. I'll remind you before it starts.",
  rsvpEnded: "This event has ended.",
  rsvpNotMember:
    "RSVPs are for verified members. Finish joining in the Diwan first.",
  rsvpWaitlisted:
    "It's full, so you're on the waitlist. I'll tell you if a place opens.",
  setupBad:
    "That code didn't work. An officer can make a new one in the Diwan: Settings, Telegram.",

  // Group: connecting
  setupOk:
    "Connected. I'm the Society's messenger here now.\n\nNext:\n1. Make me an admin who can invite users.\n2. In each topic, send /topic with what it's for: announcements, events, waraq or word.\n3. Turn on <b>Approve new members</b> for the invite link: I let linked members in at once and leave everyone else to you.",
  setupUsage: "Send /setup with the code from the Diwan (Settings, Telegram).",
  shortDescription:
    "The messenger of the AUIB Society of Arts and Letters: events, Qirtas and a daily word.",
  topicCleared: "This topic is no longer for anything in particular.",
  topicOk: (purpose: string) => `This topic is now for ${purpose}.`,
  topicUsage:
    "Send it inside a topic: /topic announcements, events, waraq or word. /topic none clears it.",
  unlinked:
    "Unlinked. Your Diwan account no longer gets notices here. You can link it again from your profile.",
  waitlisted: "You're on the waitlist.",
  waraqNone:
    "Qirtas has nothing new just now. The next pieces are on their way.",

  // Waraq
  waraqTitle: "<b>New in Qirtas</b>",

  when: (date: string, time: string) => `${date} · ${time}`,
  wordOpen: "Today's word opens right here in Telegram.",
} as const;

type Copy = {
  [K in keyof typeof en]: (typeof en)[K] extends (...args: infer A) => string
    ? (...args: A) => string
    : (typeof en)[K] extends string
      ? string
      : { [P in keyof (typeof en)[K]]: string };
};

const ar: Copy = {
  alreadyLinked: (name: string) => `أنت مرتبط باسم ${name}.`,
  buttons: {
    back: "رجوع",
    calendar: "أضف إلى التقويم",
    cancel: "ألغِ مقعدي",
    details: "التفاصيل",
    events: "الفعاليات",
    link: "اربط حسابي",
    me: "حسابي",
    nexus: "افتح الديوان",
    notifyOff: "الإشعارات هنا: متوقفة",
    notifyOn: "الإشعارات هنا: مفعّلة",
    play: "العب",
    read: "اقرأ",
    rsvp: "احجز مقعداً",
    site: "auibsal.org",
    unlink: "افصل تيليغرام",
    waraq: "قرطاس",
    word: "كلمة اليوم",
  },
  by: (author: string) => `بقلم ${author}`,
  commands: {
    events: "ما الذي سيأتي",
    help: "ما الذي أستطيع فعله",
    lang: "لغة منشوراتي: en أو ar أو both",
    me: "حسابك ومقاعدك",
    setup: "اربط هذه المجموعة (رمز من الديوان)",
    start: "ألقِ التحية",
    topic: "أخبرني بالغرض من هذا الموضوع",
    waraq: "الجديد في قرطاس",
    word: "العب كلمة اليوم",
  },
  description:
    "هدهد، حامل رسائل جمعية الفنون والآداب في الجامعة الأمريكية في العراق - بغداد. الفعاليات والحجز، وقرطاس، وكلمة كل يوم، وإشعاراتك من الديوان، كلها في تيليغرام.",
  eventMissing: "لم أجد هذه الفعالية. ربما نُقلت أو أُلغيت.",
  eventsNone:
    "لا شيء في التقويم بعد. سأنشر الفعاليات الجديدة في المجموعة فور الإعلان عنها.",

  eventsTitle: "<b>ما الذي سيأتي</b>",
  full: "اكتمل العدد: الحجز يضعك في قائمة الانتظار",
  generic: "حدث خطأ من جهتي. حاول مجدداً بعد دقيقة.",
  going: "لديك مقعد.",

  greeting: (name?: string) =>
    `${name ? `أهلاً يا ${name}.` : "أهلاً."} أنا هدهد، حامل رسائل جمعية الفنون والآداب.\n\nأحمل إليك أخبار الجمعية: ما الذي يجري وكيف تحجز مقعدك، والجديد في قرطاس، وكلمة تخمّنها كل يوم. من أين نبدأ؟`,
  help: [
    "<b>ما الذي أستطيع فعله</b>",
    "/events: ما الذي سيأتي، ومقعدك بنقرة واحدة",
    "/waraq: الجديد في صحيفة الجمعية",
    "/word: العب كلمة اليوم",
    "/me: حسابك ومقاعدك",
    "",
    "اربط حسابك في الديوان وسأحمل إليك إشعاراتك هنا أيضاً: التذكيرات والحجوزات وقرارات قرطاس.",
    "",
    "في أي محادثة، اكتب اسمي وبضع كلمات لتشارك فعالية أو نصاً من قرطاس.",
  ].join("\n"),

  inlineEvent: "فعالية",
  inlinePiece: "قرطاس",
  joinWaiting: (group: string) =>
    `شكراً لطلبك الانضمام إلى ${group}. سينظر أحد المشرفين في طلبك قريباً. وإن كان لديك حساب في الديوان فاربطه وسأدخلك فوراً.`,
  langOk: "سأنشر بهذه اللغة من الآن.",
  langUsage: "استخدم /lang en أو /lang ar أو /lang both.",
  linked: (name: string) =>
    `تم الربط. سعيد بالتعرّف إليك حقاً يا ${name}. ستصلك إشعاراتك هنا أيضاً؛ ويمكنك إيقافها من /me.`,
  linkFailed:
    "انتهت صلاحية هذا الرابط أو استُخدم من قبل. أنشئ رابطاً جديداً من ملفك في الديوان.",

  linkHow:
    "لتربط حسابك، افتح الديوان واذهب إلى ملفك الشخصي واختر <b>اربط تيليغرام</b>. يكفي ذلك نقرة واحدة.",
  memberNo: "لم يُوثَّق حسابك بعد: أكمل انضمامك في الديوان لتحجز.",
  membersOnly: "للأعضاء فقط",
  memberYes: "عضو موثَّق",

  meTitle: (name: string) => `<b>${name}</b>`,
  myPlaces: "<b>مقاعدك</b>",
  needLink: "اربط حسابك في الديوان أولاً، وبعدها أحجز لك.",

  noPlaces: "لا مقاعد بعد. اكتب /events لترى ما يجري.",
  notAdmin: "هذا لمشرفي المجموعة فقط.",
  notConnected:
    "هذه المجموعة غير مرتبطة بالجمعية بعد. يستطيع أحد المسؤولين ربطها من الديوان (الإعدادات، تيليغرام).",
  notifyOff: "ستصلك الإشعارات بالبريد الإلكتروني فقط.",
  notifyOn: "ستصلك الإشعارات هنا مجدداً.",
  notLinked:
    "حساب تيليغرام هذا غير مرتبط بحساب في الديوان بعد، لذا لا أعرف عنك سوى اسمك في تيليغرام.",
  onePlaceLeft: "بقي مقعد واحد",
  placesLeft: (n: string) => `بقي ${n} مقعد`,

  postEventNew: "<b>فعالية جديدة</b>",
  postEventSoon: (time: string) => `<b>تبدأ قريباً</b>، في ${time}`,
  postPiece: "<b>جديد في قرطاس</b>",
  postWord: (n: string) => `<b>الكلمة رقم ${n}</b> جاهزة.`,
  purposeNames: {
    announcements: "الإعلانات",
    events: "الفعاليات",
    waraq: "قرطاس",
    word: "كلمة اليوم",
  },
  rsvpAlready: "لديك مقعد بالفعل.",
  rsvpCancelled: "تم. صار مقعدك متاحاً لغيرك.",
  rsvpClosed: "لا تقبل هذه الفعالية الحجز.",
  rsvpConfirmed: "حُجز مقعدك. سأذكّرك قبل أن تبدأ.",
  rsvpEnded: "انتهت هذه الفعالية.",
  rsvpNotMember: "الحجز للأعضاء الموثَّقين. أكمل انضمامك في الديوان أولاً.",
  rsvpWaitlisted: "اكتمل العدد، فوضعتك في قائمة الانتظار. سأخبرك إن فرغ مقعد.",
  setupBad:
    "لم يعمل هذا الرمز. يستطيع أحد المسؤولين إنشاء رمز جديد من الديوان: الإعدادات، تيليغرام.",

  setupOk:
    "تم الربط. أنا حامل رسائل الجمعية هنا من الآن.\n\nالخطوات التالية:\n1. اجعلني مشرفاً يستطيع دعوة المستخدمين.\n2. في كل موضوع، أرسل /topic مع الغرض منه: announcements أو events أو waraq أو word.\n3. فعّل <b>الموافقة على الأعضاء الجدد</b> في رابط الدعوة: أُدخل الأعضاء المرتبطين فوراً وأترك الباقين لكم.",
  setupUsage: "أرسل /setup مع الرمز من الديوان (الإعدادات، تيليغرام).",
  shortDescription:
    "حامل رسائل جمعية الفنون والآداب: الفعاليات وقرطاس وكلمة كل يوم.",
  topicCleared: "لم يعد هذا الموضوع مخصصاً لشيء بعينه.",
  topicOk: (purpose: string) => `صار هذا الموضوع مخصصاً لـ${purpose}.`,
  topicUsage:
    "أرسله داخل موضوع: /topic announcements أو events أو waraq أو word. و/topic none يلغي التخصيص.",
  unlinked:
    "تم الفصل. لن تصل إشعارات حسابك في الديوان إلى هنا بعد الآن. يمكنك الربط مجدداً من ملفك الشخصي.",
  waitlisted: "أنت في قائمة الانتظار.",
  waraqNone: "لا جديد في قرطاس الآن. النصوص القادمة في الطريق.",

  waraqTitle: "<b>الجديد في قرطاس</b>",

  when: (date: string, time: string) => `${date} · ${time}`,
  wordOpen: "تُفتح كلمة اليوم هنا في تيليغرام.",
};

export const copy: Record<Lang, Copy> = { ar, en };

export type { Copy };
