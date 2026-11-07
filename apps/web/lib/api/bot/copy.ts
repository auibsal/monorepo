/**
 * Everything Hudhud says, in English and Arabic. Hudhud is the Society's
 * messenger: warm, brief and literate, a little playful, never loud (no
 * exclamation marks, no emoji). Dynamic values arrive already escaped for
 * Telegram HTML and already formatted (Latin digits, Baghdad time).
 *
 * Hudhud speaks Iraqi Arabic (decisions.md): he is the Society's
 * voice in the chat, so his Arabic is the Arabic members speak to each
 * other, with the Iraqi spelling (گ for the g sound). Only the bot's
 * Telegram profile (description, shortDescription) stays in standard
 * Arabic.
 */

export type Lang = "en" | "ar";

export const langOf = (code: string | undefined): Lang =>
  code?.toLowerCase().startsWith("ar") ? "ar" : "en";

export const purposes = [
  "announcements",
  "events",
  "qirtas",
  "word",
  "brief",
] as const;
export type Purpose = (typeof purposes)[number];

const en = {
  alreadyLinked: (name: string) => `You're linked as ${name}.`,
  audienceMembers:
    "This group is for the Society's members now: I let in anyone with a linked SAL account.",
  audienceStaff:
    "This group is for the Society's officers now: I let in only linked accounts that hold a Society role, post the morning brief at 8:00 a.m. and a short summary after each event. /topic brief chooses where they go.",
  audienceUsage: "Use /audience staff or /audience members.",
  briefBooked: (booked: string, capacity: string) =>
    `${booked} booked of ${capacity}`,
  briefBookedOpen: (booked: string) => `${booked} booked`,
  briefCounts: {
    grantsAsked: "Partners asking to turn something on",
    hiringNew: "New replies to openings",
    partnerApplications: "Partner applications",
    requestsOpen: "Requests open",
    submissionsNew: "New submissions to Qirtas",
  },
  briefEvent: (title: string, time: string) => `${title} · ${time}`,
  briefNoEvents: "No events today.",
  briefNothing: "Nothing waits in the Diwan.",
  briefTitle: (date: string) => `<b>Good morning. Today, ${date}</b>`,
  briefWaiting: "<b>Waiting in the Diwan</b>",
  briefWaitlist: (n: string) => `${n} on the waitlist`,
  buttons: {
    back: "Back",
    calendar: "Add to calendar",
    cancel: "Cancel my place",
    details: "Details",
    diwan: "Open the Diwan",
    events: "Events",
    link: "Link my account",
    me: "My membership",
    membership: "Open Membership",
    notifyOff: "Notices here: off",
    notifyOn: "Notices here: on",
    play: "Play",
    qirtas: "Qirtas",
    read: "Read",
    rsvp: "RSVP",
    site: "auibsal.org",
    unlink: "Unlink Telegram",
    word: "Daily word",
    wordOff: "Daily word here: off",
    wordOn: "Daily word here: on",
  },
  by: (author: string) => `by ${author}`,
  commands: {
    audience: "Who this group is for: staff or members",
    events: "What's coming up",
    help: "What I can do",
    lang: "Language of my posts: en, ar or both",
    me: "Your membership and your places",
    qirtas: "New in Qirtas",
    setup: "Connect this group (code from the Diwan)",
    start: "Say hello",
    topic: "Tell me what this topic is for",
    word: "Play today's word",
  },
  description:
    "Hudhud, the messenger of the AUIB Society of Arts and Letters. Events and RSVPs, Qirtas, a daily word, and your Society notices, all in Telegram.",
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
    "/qirtas: new in the Society's paper",
    "/word: play today's word",
    "/me: your membership and your places",
    "",
    "Link your SAL account and I'll also bring your notices here: reminders, RSVPs and Qirtas decisions.",
    "",
    "In any chat, type my name and a few words to share an event or a Qirtas piece.",
  ].join("\n"),

  // Inline
  inlineEvent: "Event",
  inlinePiece: "Qirtas",
  joinMembersOnly: (group: string) =>
    `${group} is for the Society's members. An admin will look at your request.`,
  joinStaffOnly: (group: string) =>
    `${group} is for the Society's officers. An admin will look at your request.`,
  joinStaffWaiting: (group: string) =>
    `${group} is for the Society's officers. If you hold a Society role, link your SAL account and I'll let you in right away; otherwise an admin will look at your request.`,
  joinWaiting: (group: string) =>
    `Thank you for asking to join ${group}. An admin will look at your request soon. If you have a SAL account, link it and I'll let you in right away.`,
  langOk: "I'll post in this language from now on.",
  langUsage: "Use /lang en, /lang ar or /lang both.",
  linked: (name: string) =>
    `Linked. Good to meet you properly, ${name}. Your notices will come here too; /me turns them off.`,
  linkFailed:
    "That link has expired or was already used. Make a new one on auibsal.org: Your account, then Settings.",

  // Linking
  linkHow:
    "To link your account, open Your account on auibsal.org, then Settings, and choose <b>Connect Telegram</b>. It takes one tap.",
  memberNo: "Not verified yet: finish joining on auibsal.org to RSVP.",
  membersOnly: "Members only",
  memberYes: "Verified member",

  // Account
  meTitle: (name: string) => `<b>${name}</b>`,
  myPlaces: "<b>Your places</b>",
  needLink: "Link your SAL account first, then I can RSVP for you.",

  noPlaces: "No places yet. /events shows what's on.",
  notAdmin: "Only the group's admins can do that.",
  notConnected:
    "This group isn't connected to the Society yet. An officer can connect it from the Diwan (Settings, Telegram).",
  notifyOff: "Notices will go by email only.",
  notifyOn: "Notices will come here again.",
  notLinked:
    "Your Telegram isn't linked to a SAL account yet, so I only know your Telegram name.",
  onePlaceLeft: "1 place left",
  placesLeft: (n: string) => `${n} places left`,

  // Group posts
  postEventNew: "<b>New event</b>",
  postEventSoon: (time: string) => `<b>Starting soon</b>, at ${time}`,
  postPiece: "<b>New in Qirtas</b>",
  postWord: (n: string) => `<b>Word No. ${n}</b> is ready.`,
  purposeNames: {
    announcements: "announcements",
    brief: "the morning brief and event summaries",
    events: "events",
    qirtas: "Qirtas",
    word: "the daily word",
  } satisfies Record<Purpose, string>,
  qirtasNone:
    "Qirtas has nothing new just now. The next pieces are on their way.",

  // Qirtas
  qirtasTitle: "<b>New in Qirtas</b>",
  removalWarning: (name: string) =>
    `${name}, this group is for the Society's members, and I can't find your SAL account. Join on auibsal.org and link it here within a week, or I'll have to remove you from the group. Student Life's staff and the Faculty Advisor aren't affected.`,
  rsvpAlready: "You already have a place.",
  rsvpCancelled: "Done. Your place is free for someone else.",
  rsvpClosed: "This event doesn't take RSVPs.",
  rsvpConfirmed: "You're in. I'll remind you before it starts.",
  rsvpEnded: "This event has ended.",
  rsvpNotMember:
    "RSVPs are for verified members. Finish joining on auibsal.org first.",
  rsvpWaitlisted:
    "It's full, so you're on the waitlist. I'll tell you if a place opens.",
  setupBad:
    "That code didn't work. An officer can make a new one in the Diwan: Settings, Telegram.",

  // Group: connecting
  setupOk:
    "Connected. I'm the Society's messenger here now.\n\nNext:\n1. Make me an admin who can invite users.\n2. In each topic, send /topic with what it's for: announcements, events, qirtas or word.\n3. Turn on <b>Approve new members</b> for the invite link: I let linked members in at once and leave everyone else to you.",
  setupUsage: "Send /setup with the code from the Diwan (Settings, Telegram).",
  shortDescription:
    "The messenger of the AUIB Society of Arts and Letters: events, Qirtas and a daily word.",
  summaryCame: (came: string, booked: string, walkIns: string) =>
    `${came} came: ${booked} who booked, ${walkIns} without a booking`,
  summaryNoShows: (n: string) => `${n} booked and didn't come`,
  summaryTitle: "<b>After the event</b>",
  topicCleared: "This topic is no longer for anything in particular.",
  topicOk: (purpose: string) => `This topic is now for ${purpose}.`,
  topicUsage:
    "Send it inside a topic: /topic announcements, events, qirtas, word or brief. /topic none clears it.",
  unlinked:
    "Unlinked. Your SAL account no longer gets notices here. You can link it again from Settings in Your account.",
  waitlisted: "You're on the waitlist.",

  when: (date: string, time: string) => `${date} · ${time}`,
  wordOff: "No more daily word here.",
  wordOn: "Each day's word will come here at 9:00 a.m.",
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
  alreadyLinked: (name: string) => `انت مربوط باسم ${name}.`,
  audienceMembers:
    "هالمجموعة هسه لأعضاء الجمعية: أدخّل كل واحد رابط حسابه بالجمعية.",
  audienceStaff:
    "هالمجموعة هسه لمسؤولي الجمعية: ما أدخّل غير الحسابات المربوطة اللي عدها دور بالجمعية، وأنزّل موجز الصبح الساعة 8:00 وملخص قصير بعد كل فعالية. /topic brief يحدد وين ينزلن.",
  audienceUsage: "اكتب /audience staff أو /audience members.",
  briefBooked: (booked: string, capacity: string) =>
    `${booked} حاجزين من ${capacity}`,
  briefBookedOpen: (booked: string) => `${booked} حاجزين`,
  briefCounts: {
    grantsAsked: "شركاء يريدون يفعّلون شي",
    hiringNew: "ردود جديدة عالفرص",
    partnerApplications: "طلبات شراكة",
    requestsOpen: "طلبات مفتوحة",
    submissionsNew: "مشاركات جديدة لقرطاس",
  },
  briefEvent: (title: string, time: string) => `${title} · ${time}`,
  briefNoEvents: "ماكو فعاليات اليوم.",
  briefNothing: "ماكو شي ينتظر بالديوان.",
  briefTitle: (date: string) => `<b>صباح الخير. اليوم ${date}</b>`,
  briefWaiting: "<b>شنو ينتظر بالديوان</b>",
  briefWaitlist: (n: string) => `${n} بقائمة الانتظار`,
  buttons: {
    back: "رجوع",
    calendar: "ضيفها للتقويم",
    cancel: "ألغي مقعدي",
    details: "التفاصيل",
    diwan: "افتح الديوان",
    events: "الفعاليات",
    link: "اربط حسابي",
    me: "عضويتي",
    membership: "افتح «العضوية»",
    notifyOff: "الإشعارات هنا: مطفية",
    notifyOn: "الإشعارات هنا: شغّالة",
    play: "إلعب",
    qirtas: "قرطاس",
    read: "إقرا",
    rsvp: "احجزلي مقعد",
    site: "auibsal.org",
    unlink: "افصل تيليغرام",
    word: "كلمة اليوم",
    wordOff: "كلمة اليوم هنا: مطفية",
    wordOn: "كلمة اليوم هنا: شغّالة",
  },
  by: (author: string) => `بقلم ${author}`,
  commands: {
    audience: "هالمجموعة لمنو: staff أو members",
    events: "شنو جاي",
    help: "شنو أگدر أسوي",
    lang: "لغة منشوراتي: en أو ar أو both",
    me: "عضويتك ومقاعدك",
    qirtas: "الجديد بقرطاس",
    setup: "اربط هالمجموعة (رمز من الديوان)",
    start: "سلّم عليّ",
    topic: "گلّي هالموضوع لشنو",
    word: "إلعب كلمة اليوم",
  },
  // The bot's profile in Telegram is read by people who don't know the
  // Society yet, so it stays in standard Arabic.
  description:
    "هدهد، حامل رسائل جمعية الفنون والآداب في الجامعة الأمريكية في العراق - بغداد. الفعاليات والحجز، وقرطاس، وكلمة كل يوم، وإشعاراتك من الجمعية، كلها في تيليغرام.",
  eventMissing: "ما لگيت هالفعالية. يمكن انتقلت أو انلغت.",
  eventsNone:
    "بعد ماكو شي بالتقويم. أول ما تنعلن فعالية جديدة أنزّلها بالمجموعة.",

  eventsTitle: "<b>شنو جاي</b>",
  full: "العدد اكتمل: الحجز يحطك بقائمة الانتظار",
  generic: "صار خلل من صوبي. عيدها بعد دقيقة.",
  going: "عندك مقعد.",

  greeting: (name?: string) =>
    `${name ? `هلا ${name}.` : "هلا."} آني هدهد، حامل رسائل جمعية الفنون والآداب.\n\nأجيبلك أخبار الجمعية: شنو دا يصير وشلون تحجز مقعدك، والجديد بقرطاس، وكلمة تحزرها كل يوم. منين نبدي؟`,
  help: [
    "<b>شنو أگدر أسوي</b>",
    "/events: شنو جاي، ومقعدك بكبسة وحدة",
    "/qirtas: الجديد بجريدة الجمعية",
    "/word: إلعب كلمة اليوم",
    "/me: عضويتك ومقاعدك",
    "",
    "اربط حسابك بالجمعية وأجيبلك إشعاراتك هنا هم: التذكيرات والحجوزات وقرارات قرطاس.",
    "",
    "بأي محادثة، اكتب اسمي ويّا كم كلمة حتى تشارك فعالية أو نص من قرطاس.",
  ].join("\n"),

  inlineEvent: "فعالية",
  inlinePiece: "قرطاس",
  joinMembersOnly: (group: string) =>
    `${group} لأعضاء الجمعية. واحد من المشرفين راح يشوف طلبك.`,
  joinStaffOnly: (group: string) =>
    `${group} لمسؤولي الجمعية. واحد من المشرفين راح يشوف طلبك.`,
  joinStaffWaiting: (group: string) =>
    `${group} لمسؤولي الجمعية. إذا عندك دور بالجمعية اربط حسابك وأدخّلك هسه، وإلا واحد من المشرفين راح يشوف طلبك.`,
  joinWaiting: (group: string) =>
    `شكرًا لأنك طلبت تنضم لـ${group}. واحد من المشرفين راح يشوف طلبك قريب. وإذا عندك حساب بالجمعية اربطه وأدخّلك هسه.`,
  langOk: "من هسه أنزّل بهاللغة.",
  langUsage: "اكتب /lang en أو /lang ar أو /lang both.",
  linked: (name: string) =>
    `انربط. تشرفنا صدگ يا ${name}. إشعاراتك هم راح توصلك هنا، وتگدر تطفيها من /me.`,
  linkFailed:
    "هالرابط خلص وقته أو انستخدم قبل. سوّي رابط جديد من «حسابك» على auibsal.org، وبعدين الإعدادات.",

  linkHow:
    "حتى تربط حسابك، افتح «حسابك» على auibsal.org، وبعدين الإعدادات، واختار <b>اربط تيليغرام</b>. بس كبسة وحدة.",
  memberNo: "حسابك بعده ما توثّق: كمّل انضمامك على auibsal.org حتى تحجز.",
  membersOnly: "للأعضاء بس",
  memberYes: "عضو موثّق",

  meTitle: (name: string) => `<b>${name}</b>`,
  myPlaces: "<b>مقاعدك</b>",
  needLink: "اربط حسابك بالجمعية أول، وبعدين أحجزلك.",

  noPlaces: "بعد ما عندك مقاعد. /events يراويك شنو اكو.",
  notAdmin: "هاي بس لمشرفين المجموعة.",
  notConnected:
    "هالمجموعة بعدها مو مربوطة بالجمعية. واحد من المسؤولين يگدر يربطها من الديوان (الإعدادات، تيليغرام).",
  notifyOff: "الإشعارات راح توصلك بالإيميل بس.",
  notifyOn: "الإشعارات رجعت توصلك هنا.",
  notLinked:
    "تيليغرامك بعده مو مربوط بحساب بالجمعية، فما أعرف عنك غير اسمك بتيليغرام.",
  onePlaceLeft: "باقي مقعد واحد",
  placesLeft: (n: string) => `باقي ${n} مقعد`,

  postEventNew: "<b>فعالية جديدة</b>",
  postEventSoon: (time: string) => `<b>تبدي قريب</b>، الساعة ${time}`,
  postPiece: "<b>جديد بقرطاس</b>",
  postWord: (n: string) => `<b>الكلمة رقم ${n}</b> جاهزة.`,
  purposeNames: {
    announcements: "الإعلانات",
    brief: "موجز الصبح وملخصات الفعاليات",
    events: "الفعاليات",
    qirtas: "قرطاس",
    word: "كلمة اليوم",
  },
  qirtasNone: "ماكو شي جديد بقرطاس هسه. النصوص الجاية بالطريق.",

  qirtasTitle: "<b>الجديد بقرطاس</b>",
  removalWarning: (name: string) =>
    `${name}، هالمجموعة لأعضاء الجمعية، وما لگيت حسابك بالجمعية. سجّل على auibsal.org واربط حسابك هنا خلال أسبوع، وإلا راح أضطر أطلّعك من المجموعة. موظفي الحياة الطلابية والمشرف من الهيئة التدريسية ما يشملهم هذا.`,
  rsvpAlready: "عندك مقعد من قبل.",
  rsvpCancelled: "تم. مقعدك صار فارغ لغيرك.",
  rsvpClosed: "هالفعالية ما بيها حجز.",
  rsvpConfirmed: "انحجزلك مقعد. أذكّرك قبل ما تبدي.",
  rsvpEnded: "هالفعالية خلصت.",
  rsvpNotMember: "الحجز للأعضاء الموثّقين. كمّل انضمامك على auibsal.org أول.",
  rsvpWaitlisted: "العدد اكتمل، فحطيتك بقائمة الانتظار. أخبرك إذا فرغ مقعد.",
  setupBad:
    "هالرمز ما اشتغل. واحد من المسؤولين يگدر يسوي رمز جديد من الديوان: الإعدادات، تيليغرام.",

  setupOk:
    "انربطت. من هسه آني حامل رسائل الجمعية هنا.\n\nبعدين:\n1. سوّوني مشرف يگدر يدعي مستخدمين.\n2. بكل موضوع، دزّوا /topic ويّا الغرض منه: announcements أو events أو qirtas أو word.\n3. فعّلوا <b>الموافقة على الأعضاء الجدد</b> لرابط الدعوة: أدخّل الأعضاء المربوطين هسه وأخلّي الباقين عليكم.",
  setupUsage: "دز /setup ويّا الرمز من الديوان (الإعدادات، تيليغرام).",
  shortDescription:
    "حامل رسائل جمعية الفنون والآداب: الفعاليات وقرطاس وكلمة كل يوم.",
  summaryCame: (came: string, booked: string, walkIns: string) =>
    `إجو ${came}: ${booked} من اللي حجزوا و${walkIns} بلا حجز`,
  summaryNoShows: (n: string) => `${n} حجزوا وما إجو`,
  summaryTitle: "<b>بعد الفعالية</b>",
  topicCleared: "هالموضوع ما بقى مخصص لشي معيّن.",
  topicOk: (purpose: string) => `هالموضوع صار مخصص لـ${purpose}.`,
  topicUsage:
    "دزها داخل موضوع: /topic announcements أو events أو qirtas أو word أو brief. و/topic none يشيل التخصيص.",
  unlinked:
    "انفصل. حسابك بالجمعية ما راح توصله إشعارات هنا بعد. تگدر تربطه مرة لخ من الإعدادات بـ«حسابك».",
  waitlisted: "انت بقائمة الانتظار.",

  when: (date: string, time: string) => `${date} · ${time}`,
  wordOff: "ما راح توصلك كلمة اليوم هنا بعد.",
  wordOn: "كل يوم الساعة 9:00 الصبح توصلك كلمة اليوم هنا.",
  wordOpen: "كلمة اليوم تنفتح هنا بتيليغرام.",
};

export const copy: Record<Lang, Copy> = { ar, en };

export type { Copy };
