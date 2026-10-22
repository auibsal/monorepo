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

export const purposes = [
  "welcome",
  "announcements",
  "events",
  "waraq",
  "word",
  "log",
] as const;
export type Purpose = (typeof purposes)[number];

export const joinPolicies = ["open", "verify", "members"] as const;
export type JoinPolicy = (typeof joinPolicies)[number];

const en = {
  alreadyLinked: (name: string) => `You're linked as ${name}.`,
  banned: (name: string) => `${name} has been removed from the group.`,
  buttons: {
    back: "Back",
    calendar: "Add to calendar",
    cancel: "Cancel my place",
    details: "Details",
    events: "Events",
    link: "Link my account",
    me: "My account",
    nexus: "Open the Nexus",
    notifyOff: "Notices here: off",
    notifyOn: "Notices here: on",
    play: "Play",
    read: "Read",
    rsvp: "RSVP",
    rules: "Group rules",
    site: "auibsal.org",
    unlink: "Unlink Telegram",
    verify: "I'm here for the Society",
    waraq: "Waraq",
    word: "Daily word",
  },
  by: (author: string) => `by ${author}`,
  commands: {
    ban: "Remove someone (reply to their message)",
    events: "What's coming up",
    help: "What I can do",
    lang: "Language of my posts: en, ar or both",
    me: "Your account and your places",
    mute: "Stop someone posting for a while (reply)",
    policy: "Who may join: open, verify or members",
    report: "Tell the moderators about a message (reply)",
    rules: "The group rules",
    setup: "Connect this group (code from the Nexus)",
    start: "Say hello",
    topic: "Tell me what this topic is for",
    unban: "Let someone rejoin (reply)",
    unmute: "Let someone post again (reply)",
    unwarn: "Clear someone's warnings (reply)",
    waraq: "New in Waraq",
    warn: "Warn someone (reply); three warnings mute for a day",
    word: "Guess today's word",
  },
  days: (n: string) => (n === "1" ? "1 day" : `${n} days`),
  description:
    "Hudhud, the messenger of the AUIB Society of Arts and Letters. Events and RSVPs, Waraq, a daily word, and your Nexus notices, all in Telegram.",
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
    `${name ? `Hello, ${name}.` : "Hello."} I'm Hudhud, the messenger of the AUIB Society of Arts and Letters.\n\nI carry the Society's news: what's on and how to get a place, what's new in Waraq, and a word to guess every day. Where shall we start?`,
  help: [
    "<b>What I can do</b>",
    "/events: what's coming up, and your place in one tap",
    "/waraq: new in the Society's paper",
    "/word: guess today's word",
    "/me: your account and your places",
    "",
    "Link your Nexus account and I'll also bring your notices here: reminders, RSVPs and Waraq decisions.",
    "",
    "In any chat, type my name and a few words to share an event or a Waraq piece.",
  ].join("\n"),
  hours: (n: string) => (n === "1" ? "1 hour" : `${n} hours`),

  // Inline
  inlineEvent: "Event",
  inlinePiece: "Waraq",
  langOk: "I'll post in this language from now on.",
  langUsage: "Use /lang en, /lang ar or /lang both.",
  linked: (name: string) =>
    `Linked. Good to meet you properly, ${name}. Your notices will come here too; /me turns them off.`,
  linkFailed:
    "That link has expired or was already used. Make a new one in the Nexus, under your profile.",

  // Linking
  linkHow:
    "To link your account, open the Nexus, go to your profile and choose <b>Connect Telegram</b>. It takes one tap.",
  memberNo: "Not verified yet: finish joining in the Nexus to RSVP.",
  membersOnly: "Members only",
  membersOnlyAsk: (group: string) =>
    `${group} is for Society members. Link your Nexus account and I'll let you in right away.`,
  memberYes: "Verified member",

  // Account
  meTitle: (name: string) => `<b>${name}</b>`,
  minutes: (n: string) => (n === "1" ? "1 minute" : `${n} minutes`),
  modLog: (admin: string, text: string) => `${admin}: ${text}`,
  muted: (name: string, duration: string) =>
    `${name} can't post for ${duration}.`,
  myPlaces: "<b>Your places</b>",
  needLink: "Link your Nexus account first, then I can RSVP for you.",

  // Group: moderation
  needReply: "Reply to a message from the person you mean.",
  needRights:
    "I need to be an admin who can delete messages and ban users for that.",
  noPlaces: "No places yet. /events shows what's on.",
  notAdmin: "Only the group's admins can do that.",
  notAdmins: "I don't moderate admins.",
  notConnected:
    "This group isn't connected to the Society yet. An officer can connect it from the Nexus (Settings, Telegram).",
  notifyOff: "Notices will go by email only.",
  notifyOn: "Notices will come here again.",
  notLinked:
    "Your Telegram isn't linked to a Nexus account yet, so I only know your Telegram name.",
  onePlaceLeft: "1 place left",
  placesLeft: (n: string) => `${n} places left`,
  policyName: "Acceptable Use Policy",
  policyOk: {
    members: "From now on, only linked Society members get in.",
    open: "From now on, everyone who asks to join gets in.",
    verify:
      "From now on, members get in at once and everyone else taps a button first.",
  } satisfies Record<JoinPolicy, string>,
  policyUsage: "Use /policy open, /policy verify or /policy members.",

  // Group posts
  postEventNew: "<b>New event</b>",
  postEventSoon: (time: string) => `<b>Starting soon</b>, at ${time}`,
  postPiece: "<b>New in Waraq</b>",
  postWord: (n: string) =>
    `<b>Word No. ${n}</b> is ready. Guess it with me in private.`,
  privateOnly: "Let's talk about that in private.",
  purposeNames: {
    announcements: "announcements",
    events: "events",
    log: "the moderators' log",
    waraq: "Waraq",
    welcome: "welcoming new people",
    word: "the daily word",
  } satisfies Record<Purpose, string>,
  removedLink: (name: string) =>
    `Removed a link from ${name}, who joined less than a day ago.`,
  reported: "Thank you. The moderators have it.",
  reportLinkLabel: "the message",
  reportLog: (by: string, about: string, link: string) =>
    `<b>Report</b> from ${by} about ${about}: ${link}`,
  rsvpAlready: "You already have a place.",
  rsvpCancelled: "Done. Your place is free for someone else.",
  rsvpClosed: "This event doesn't take RSVPs.",
  rsvpConfirmed: "You're in. I'll remind you before it starts.",
  rsvpEnded: "This event has ended.",
  rsvpNotMember:
    "RSVPs are for verified members. Finish joining in the Nexus first.",
  rsvpWaitlisted:
    "It's full, so you're on the waitlist. I'll tell you if a place opens.",
  rulesIntro: "<b>Group rules</b>",
  rulesPolicy: (link: string, draft: boolean) =>
    draft
      ? `The group follows the Society's ${link} (a draft until the Council adopts it).`
      : `The group follows the Society's ${link}.`,
  setupBad:
    "That code didn't work. An officer can make a new one in the Nexus: Settings, Telegram.",

  // Group: connecting
  setupOk:
    "Connected. I'm the Society's messenger here now.\n\nNext:\n1. Make me an admin who can delete messages, ban users and invite users.\n2. In each topic, send /topic with what it's for: welcome, announcements, events, waraq, word or log.\n3. Turn on <b>Approve new members</b> for the invite link, and I'll greet and check everyone who asks to join.",
  setupUsage: "Send /setup with the code from the Nexus (Settings, Telegram).",
  shortDescription:
    "The messenger of the AUIB Society of Arts and Letters: events, Waraq and a daily word.",
  topicCleared: "This topic is no longer for anything in particular.",
  topicOk: (purpose: string) => `This topic is now for ${purpose}.`,
  topicUsage:
    "Send it inside a topic: /topic welcome, announcements, events, waraq, word or log. /topic none clears it.",
  unbanned: (name: string) => `${name} can join again.`,
  unlinked:
    "Unlinked. Your Nexus account no longer gets notices here. You can link it again from your profile.",
  unmuted: (name: string) => `${name} can post again.`,
  unwarned: (name: string) => `${name}'s warnings are cleared.`,
  verifyAsk: (name: string, group: string) =>
    `Hello, ${name}. Before you join ${group}, tap the button below so I know you're a person.`,
  verifyDone: "Thank you. You're in.",
  verifyGone: "That request has already been handled.",
  waitlisted: "You're on the waitlist.",
  waraqNone:
    "Waraq has nothing new just now. The next pieces are on their way.",

  // Waraq
  waraqTitle: "<b>New in Waraq</b>",
  warned: (name: string, n: string) => `${name} has a warning (${n} of 3).`,
  warnMuted: (name: string) =>
    `${name} has 3 warnings and can't post for a day.`,

  // Group: joining
  welcome: (name: string) =>
    `Welcome, ${name}. I'm Hudhud, the Society's messenger. Have a look at the rules, and link your Nexus account so I know you.`,
  when: (date: string, time: string) => `${date} · ${time}`,
  wordDone:
    "You've played today's word. A new one comes at midnight, Baghdad time.",
  wordInArabic: "/word ar plays it in Arabic.",
  wordInEnglish: "/word en plays it in English.",

  // Daily word
  wordIntro: (n: string) =>
    `<b>Word No. ${n}</b>\nGuess the five-letter word in six tries. Send me a word.`,
  wordInvalidArabic: "Send a five-letter word in Arabic letters.",
  wordInvalidLatin: "Send a five-letter word in English letters.",
  wordLeft: (n: string) => (n === "1" ? "1 try left." : `${n} tries left.`),
  wordLegend: "● right place   ○ in the word   · not in it",
  wordLost: (word: string) => `Not this time. The word was <b>${word}</b>.`,
  wordNext: "A new word comes at midnight, Baghdad time.",
  wordShare: (n: string, score: string) => `Hudhud's word No. ${n}: ${score}/6`,
  wordWon: (tries: string) =>
    tries === "1"
      ? "Solved in 1. Remarkable."
      : `Solved in ${tries}. Well read.`,
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
  banned: (name: string) => `أُخرج ${name} من المجموعة.`,
  buttons: {
    back: "رجوع",
    calendar: "أضف إلى التقويم",
    cancel: "ألغِ مقعدي",
    details: "التفاصيل",
    events: "الفعاليات",
    link: "اربط حسابي",
    me: "حسابي",
    nexus: "افتح النكسس",
    notifyOff: "الإشعارات هنا: متوقفة",
    notifyOn: "الإشعارات هنا: مفعّلة",
    play: "العب",
    read: "اقرأ",
    rsvp: "احجز مقعداً",
    rules: "قواعد المجموعة",
    site: "auibsal.org",
    unlink: "افصل تيليغرام",
    verify: "جئت من أجل الجمعية",
    waraq: "ورق",
    word: "كلمة اليوم",
  },
  by: (author: string) => `بقلم ${author}`,
  commands: {
    ban: "أخرج شخصاً (بالرد على رسالته)",
    events: "ما الذي سيأتي",
    help: "ما الذي أستطيع فعله",
    lang: "لغة منشوراتي: en أو ar أو both",
    me: "حسابك ومقاعدك",
    mute: "أوقف شخصاً عن الكتابة مدةً (بالرد)",
    policy: "من يستطيع الانضمام: open أو verify أو members",
    report: "أبلغ المشرفين عن رسالة (بالرد)",
    rules: "قواعد المجموعة",
    setup: "اربط هذه المجموعة (رمز من النكسس)",
    start: "ألقِ التحية",
    topic: "أخبرني بالغرض من هذا الموضوع",
    unban: "اسمح لشخص بالعودة (بالرد)",
    unmute: "اسمح لشخص بالكتابة مجدداً (بالرد)",
    unwarn: "امسح تنبيهات شخص (بالرد)",
    waraq: "الجديد في ورق",
    warn: "وجّه تنبيهاً (بالرد)؛ ثلاثة تنبيهات توقف الكتابة يوماً",
    word: "خمّن كلمة اليوم",
  },
  days: (n: string) => (n === "1" ? "يوم واحد" : `${n} يوم`),
  description:
    "هدهد، حامل رسائل جمعية الفنون والآداب في الجامعة الأمريكية في العراق - بغداد. الفعاليات والحجز، وورق، وكلمة كل يوم، وإشعاراتك من النكسس، كلها في تيليغرام.",
  eventMissing: "لم أجد هذه الفعالية. ربما نُقلت أو أُلغيت.",
  eventsNone:
    "لا شيء في التقويم بعد. سأنشر الفعاليات الجديدة في المجموعة فور الإعلان عنها.",

  eventsTitle: "<b>ما الذي سيأتي</b>",
  full: "اكتمل العدد: الحجز يضعك في قائمة الانتظار",
  generic: "حدث خطأ من جهتي. حاول مجدداً بعد دقيقة.",
  going: "لديك مقعد.",

  greeting: (name?: string) =>
    `${name ? `أهلاً يا ${name}.` : "أهلاً."} أنا هدهد، حامل رسائل جمعية الفنون والآداب.\n\nأحمل إليك أخبار الجمعية: ما الذي يجري وكيف تحجز مقعدك، والجديد في ورق، وكلمة تخمّنها كل يوم. من أين نبدأ؟`,
  help: [
    "<b>ما الذي أستطيع فعله</b>",
    "/events: ما الذي سيأتي، ومقعدك بنقرة واحدة",
    "/waraq: الجديد في صحيفة الجمعية",
    "/word: خمّن كلمة اليوم",
    "/me: حسابك ومقاعدك",
    "",
    "اربط حسابك في النكسس وسأحمل إليك إشعاراتك هنا أيضاً: التذكيرات والحجوزات وقرارات ورق.",
    "",
    "في أي محادثة، اكتب اسمي وبضع كلمات لتشارك فعالية أو نصاً من ورق.",
  ].join("\n"),
  hours: (n: string) => (n === "1" ? "ساعة واحدة" : `${n} ساعة`),

  inlineEvent: "فعالية",
  inlinePiece: "ورق",
  langOk: "سأنشر بهذه اللغة من الآن.",
  langUsage: "استخدم /lang en أو /lang ar أو /lang both.",
  linked: (name: string) =>
    `تم الربط. سعيد بالتعرّف إليك حقاً يا ${name}. ستصلك إشعاراتك هنا أيضاً؛ ويمكنك إيقافها من /me.`,
  linkFailed:
    "انتهت صلاحية هذا الرابط أو استُخدم من قبل. أنشئ رابطاً جديداً من ملفك في النكسس.",

  linkHow:
    "لتربط حسابك، افتح النكسس واذهب إلى ملفك الشخصي واختر <b>اربط تيليغرام</b>. يكفي ذلك نقرة واحدة.",
  memberNo: "لم يُوثَّق حسابك بعد: أكمل انضمامك في النكسس لتحجز.",
  membersOnly: "للأعضاء فقط",
  membersOnlyAsk: (group: string) =>
    `${group} لأعضاء الجمعية. اربط حسابك في النكسس وسأدخلك فوراً.`,
  memberYes: "عضو موثَّق",

  meTitle: (name: string) => `<b>${name}</b>`,
  minutes: (n: string) => (n === "1" ? "دقيقة واحدة" : `${n} دقيقة`),
  modLog: (admin: string, text: string) => `${admin}: ${text}`,
  muted: (name: string, duration: string) =>
    `لن يستطيع ${name} الكتابة مدة ${duration}.`,
  myPlaces: "<b>مقاعدك</b>",
  needLink: "اربط حسابك في النكسس أولاً، وبعدها أحجز لك.",

  needReply: "ردّ على رسالة من الشخص الذي تقصده.",
  needRights: "أحتاج أن أكون مشرفاً يستطيع حذف الرسائل وحظر المستخدمين لذلك.",
  noPlaces: "لا مقاعد بعد. اكتب /events لترى ما يجري.",
  notAdmin: "هذا لمشرفي المجموعة فقط.",
  notAdmins: "لا أشرف على المشرفين.",
  notConnected:
    "هذه المجموعة غير مرتبطة بالجمعية بعد. يستطيع أحد المسؤولين ربطها من النكسس (الإعدادات، تيليغرام).",
  notifyOff: "ستصلك الإشعارات بالبريد الإلكتروني فقط.",
  notifyOn: "ستصلك الإشعارات هنا مجدداً.",
  notLinked:
    "حساب تيليغرام هذا غير مرتبط بحساب في النكسس بعد، لذا لا أعرف عنك سوى اسمك في تيليغرام.",
  onePlaceLeft: "بقي مقعد واحد",
  placesLeft: (n: string) => `بقي ${n} مقعد`,
  policyName: "سياسة الاستخدام المقبول",
  policyOk: {
    members: "من الآن، لا يدخل إلا أعضاء الجمعية المرتبطون.",
    open: "من الآن، يدخل كل من يطلب الانضمام.",
    verify: "من الآن، يدخل الأعضاء فوراً، وينقر غيرهم زراً أولاً.",
  },
  policyUsage: "استخدم /policy open أو /policy verify أو /policy members.",

  postEventNew: "<b>فعالية جديدة</b>",
  postEventSoon: (time: string) => `<b>تبدأ قريباً</b>، في ${time}`,
  postPiece: "<b>جديد في ورق</b>",
  postWord: (n: string) =>
    `<b>الكلمة رقم ${n}</b> جاهزة. خمّنها معي على انفراد.`,
  privateOnly: "لنتحدث في هذا على انفراد.",
  purposeNames: {
    announcements: "الإعلانات",
    events: "الفعاليات",
    log: "سجل المشرفين",
    waraq: "ورق",
    welcome: "الترحيب بالقادمين",
    word: "كلمة اليوم",
  },
  removedLink: (name: string) =>
    `حُذف رابط من ${name}، وقد انضم قبل أقل من يوم.`,
  reported: "شكراً لك. وصل الأمر إلى المشرفين.",
  reportLinkLabel: "الرسالة",
  reportLog: (by: string, about: string, link: string) =>
    `<b>بلاغ</b> من ${by} عن ${about}: ${link}`,
  rsvpAlready: "لديك مقعد بالفعل.",
  rsvpCancelled: "تم. صار مقعدك متاحاً لغيرك.",
  rsvpClosed: "لا تقبل هذه الفعالية الحجز.",
  rsvpConfirmed: "حُجز مقعدك. سأذكّرك قبل أن تبدأ.",
  rsvpEnded: "انتهت هذه الفعالية.",
  rsvpNotMember: "الحجز للأعضاء الموثَّقين. أكمل انضمامك في النكسس أولاً.",
  rsvpWaitlisted: "اكتمل العدد، فوضعتك في قائمة الانتظار. سأخبرك إن فرغ مقعد.",
  rulesIntro: "<b>قواعد المجموعة</b>",
  rulesPolicy: (link: string, draft: boolean) =>
    draft
      ? `تلتزم المجموعة بـ${link} الخاصة بالجمعية (مسودة إلى أن يعتمدها المجلس).`
      : `تلتزم المجموعة بـ${link} الخاصة بالجمعية.`,
  setupBad:
    "لم يعمل هذا الرمز. يستطيع أحد المسؤولين إنشاء رمز جديد من النكسس: الإعدادات، تيليغرام.",

  setupOk:
    "تم الربط. أنا حامل رسائل الجمعية هنا من الآن.\n\nالخطوات التالية:\n1. اجعلني مشرفاً يستطيع حذف الرسائل وحظر المستخدمين ودعوتهم.\n2. في كل موضوع، أرسل /topic مع الغرض منه: welcome أو announcements أو events أو waraq أو word أو log.\n3. فعّل <b>الموافقة على الأعضاء الجدد</b> في رابط الدعوة، وسأرحّب بكل من يطلب الانضمام وأتحقق منه.",
  setupUsage: "أرسل /setup مع الرمز من النكسس (الإعدادات، تيليغرام).",
  shortDescription:
    "حامل رسائل جمعية الفنون والآداب: الفعاليات وورق وكلمة كل يوم.",
  topicCleared: "لم يعد هذا الموضوع مخصصاً لشيء بعينه.",
  topicOk: (purpose: string) => `صار هذا الموضوع مخصصاً لـ${purpose}.`,
  topicUsage:
    "أرسله داخل موضوع: /topic welcome أو announcements أو events أو waraq أو word أو log. و/topic none يلغي التخصيص.",
  unbanned: (name: string) => `يستطيع ${name} الانضمام مجدداً.`,
  unlinked:
    "تم الفصل. لن تصل إشعارات حسابك في النكسس إلى هنا بعد الآن. يمكنك الربط مجدداً من ملفك الشخصي.",
  unmuted: (name: string) => `يستطيع ${name} الكتابة مجدداً.`,
  unwarned: (name: string) => `مُسحت تنبيهات ${name}.`,
  verifyAsk: (name: string, group: string) =>
    `أهلاً يا ${name}. قبل أن تنضم إلى ${group}، انقر الزر أدناه لأعرف أنك إنسان.`,
  verifyDone: "شكراً لك. انضممت إلى المجموعة.",
  verifyGone: "عولج هذا الطلب من قبل.",
  waitlisted: "أنت في قائمة الانتظار.",
  waraqNone: "لا جديد في ورق الآن. النصوص القادمة في الطريق.",

  waraqTitle: "<b>الجديد في ورق</b>",
  warned: (name: string, n: string) => `تلقّى ${name} تنبيهاً (${n} من 3).`,
  warnMuted: (name: string) =>
    `لدى ${name} ثلاثة تنبيهات، ولن يستطيع الكتابة يوماً كاملاً.`,

  welcome: (name: string) =>
    `أهلاً بك يا ${name}. أنا هدهد، حامل رسائل الجمعية. ألقِ نظرة على القواعد، واربط حسابك في النكسس لأتعرّف إليك.`,
  when: (date: string, time: string) => `${date} · ${time}`,
  wordDone: "لعبت كلمة اليوم. تأتي كلمة جديدة عند منتصف الليل بتوقيت بغداد.",
  wordInArabic: "/word ar للعب بالعربية.",
  wordInEnglish: "/word en للعب بالإنجليزية.",

  wordIntro: (n: string) =>
    `<b>الكلمة رقم ${n}</b>\nخمّن الكلمة ذات الأحرف الخمسة في ست محاولات. أرسل لي كلمة.`,
  wordInvalidArabic: "أرسل كلمة من خمسة أحرف عربية.",
  wordInvalidLatin: "أرسل كلمة من خمسة أحرف إنجليزية.",
  wordLeft: (n: string) =>
    n === "1" ? "بقيت محاولة واحدة." : `بقيت ${n} محاولات.`,
  wordLegend: "● في مكانه   ○ في الكلمة   · ليس فيها",
  wordLost: (word: string) => `ليس هذه المرة. الكلمة كانت <b>${word}</b>.`,
  wordNext: "تأتي كلمة جديدة عند منتصف الليل بتوقيت بغداد.",
  wordShare: (n: string, score: string) => `كلمة هدهد رقم ${n}: ${score}/6`,
  wordWon: (tries: string) =>
    tries === "1"
      ? "من المحاولة الأولى. مدهش."
      : `حللتها في ${tries} محاولات. أحسنت القراءة.`,
};

export const copy: Record<Lang, Copy> = { ar, en };

export type { Copy };
