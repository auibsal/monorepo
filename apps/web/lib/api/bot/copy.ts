/**
 * Everything Hudhud says, in English and Arabic. Hudhud is the Society's
 * messenger: warm, brief and literate, a little playful, never loud (no
 * exclamation marks, no emoji). Dynamic values arrive already escaped for
 * Telegram HTML and already formatted (Latin digits, Baghdad time).
 *
 * Hudhud speaks Iraqi Arabic (decisions.md): he is the Society's
 * voice in the chat, so his Arabic is the Arabic members speak to each
 * other, with the Iraqi spelling (گ for the g sound): chat, reminders and
 * the Sunday note. The bot's Telegram profile (description,
 * shortDescription) and anything formal (a removal, a consent, an appeal)
 * stay in standard Arabic (fourth prompt, 7g).
 */

export type Lang = "en" | "ar";

export const langOf = (code: string | undefined): Lang =>
  code?.toLowerCase().startsWith("ar") ? "ar" : "en";

/**
 * Each topic's purpose. In the Diwan group the team topics take staff
 * alerts (decisions.md: a topic for each team; Qirtas and Events share the
 * members' group's names).
 */
const purposes = [
  "announcements",
  "events",
  "qirtas",
  "word",
  "brief",
  "council",
  "media",
  "membership",
  "partnerships",
] as const;
export type Purpose = (typeof purposes)[number];

const en = {
  alreadyLinked: (name: string) => `You're linked as ${name}.`,
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
    // The Arabic edition of a group post (decisions §6): the language's own
    // name, as the language switcher shows it.
    arabic: "العربية",
    back: "Back",
    calendar: "Add to calendar",
    cancel: "Cancel my place",
    details: "Details",
    diwan: "Open the Diwan",
    events: "Events",
    joinMembers: "Join the members' group",
    joinStaff: "Join the Diwan group",
    link: "Link my account",
    me: "My membership",
    membership: "Open Membership",
    newsOff: "Society news here: off",
    newsOn: "Society news here: on",
    notifyOff: "My notices here: off",
    notifyOn: "My notices here: on",
    paperOff: "The Sunday Paper here: off",
    paperOn: "The Sunday Paper here: on",
    play: "Play",
    qirtas: "Qirtas",
    read: "Read",
    readPaper: "Read it",
    remindersOff: "Reminders here: off",
    remindersOn: "Reminders here: on",
    rsvp: "RSVP",
    rules: "Code of Conduct",
    site: "auibsal.org",
    unlink: "Unlink Telegram",
    word: "Daily word",
    wordOff: "Daily word here: off",
    wordOn: "Daily word here: on",
  },
  by: (author: string) => `by ${author}`,
  commands: {
    events: "What's coming up",
    help: "What I can do",
    me: "Your membership and your places",
    qirtas: "New in Qirtas",
    setup: "Connect this group (code from the Diwan)",
    start: "Say hello",
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
    "This group isn't connected to the Society yet. An officer can connect it from the Diwan (Media, Channels).",
  notifyOff: "Your notices will go by email only.",
  notifyOn: "Your notices will come here again.",
  notLinked:
    "Your Telegram isn't linked to a SAL account yet, so I only know your Telegram name.",
  onePlaceLeft: "1 place left",
  paperOut:
    "<b>The Sunday Paper</b> is out. This month's issue is waiting for you.",
  placesLeft: (n: string) => `${n} places left`,

  // Group posts
  postEventSoon: (date: string) => `<b>In two days</b>: ${date}`,
  postPiece: "<b>New in Qirtas</b>",
  postWeek: "<b>This week at SAL</b>",
  postWeekCalls: "Write for Qirtas",
  postWeekCloses: (date: string) => `closes ${date}`,
  postWeekEvents: "Events",
  postWord: (n: string) => `<b>Word No. ${n}</b> is ready.`,
  prefSaved: "Saved. It's the same setting as Notices in Your account.",
  purposeNames: {
    announcements: "announcements",
    brief: "the morning brief and event summaries",
    council: "the Council's alerts",
    events: "events",
    media: "Media's alerts",
    membership: "Membership's alerts",
    partnerships: "Partnerships' alerts",
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
    "That code didn't work. An officer can make a new one in the Diwan: Media, Channels.",

  // Group: connecting
  setupOk:
    "Connected. I'm the Society's messenger here now.\n\nNext:\n1. Make me an admin who can invite users.\n2. Choose each topic's purpose, the language and who the group is for in the Diwan, under Media → Channels.\n3. Turn on <b>Approve new members</b> for the invite link: I let linked members in at once and leave everyone else to you.",
  setupUsage: "Send /setup with the code from the Diwan (Media, Channels).",
  shortDescription:
    "The messenger of the AUIB Society of Arts and Letters: events, Qirtas and a daily word.",
  streamLive: "<b>Live now</b> in the members' group.",
  streamSoon: (when: string) => `<b>Live in the members' group</b>: ${when}`,
  summaryCame: (came: string, booked: string, walkIns: string) =>
    `${came} came: ${booked} who booked, ${walkIns} without a booking`,
  summaryNoShows: (n: string) => `${n} booked and didn't come`,
  summaryTitle: "<b>After the event</b>",
  unlinked:
    "Unlinked. Your SAL account no longer gets notices here. You can link it again from Settings in Your account.",
  waitlisted: "You're on the waitlist.",
  welcome: (name: string) =>
    `Welcome to the members' group, ${name}. Have a look at the Code of Conduct before you write; questions go to Help Desk.`,

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
    arabic: "العربية",
    back: "رجوع",
    calendar: "ضيفها للتقويم",
    cancel: "ألغي مقعدي",
    details: "التفاصيل",
    diwan: "افتح الديوان",
    events: "الفعاليات",
    joinMembers: "ادخل مجموعة الأعضاء",
    joinStaff: "ادخل مجموعة الديوان",
    link: "اربط حسابي",
    me: "عضويتي",
    membership: "افتح «العضوية»",
    newsOff: "أخبار الجمعية هنا: مطفية",
    newsOn: "أخبار الجمعية هنا: شغّالة",
    notifyOff: "إشعاراتي هنا: مطفية",
    notifyOn: "إشعاراتي هنا: شغّالة",
    paperOff: "«جريدة الأحد» هنا: مطفية",
    paperOn: "«جريدة الأحد» هنا: شغّالة",
    play: "إلعب",
    qirtas: "قرطاس",
    read: "إقرا",
    readPaper: "اقراها",
    remindersOff: "التذكيرات هنا: مطفية",
    remindersOn: "التذكيرات هنا: شغّالة",
    rsvp: "احجزلي مقعد",
    rules: "مدونة السلوك",
    site: "auibsal.org",
    unlink: "افصل تيليغرام",
    word: "كلمة اليوم",
    wordOff: "كلمة اليوم هنا: مطفية",
    wordOn: "كلمة اليوم هنا: شغّالة",
  },
  by: (author: string) => `بقلم ${author}`,
  commands: {
    events: "شنو جاي",
    help: "شنو أگدر أسوي",
    me: "عضويتك ومقاعدك",
    qirtas: "الجديد بقرطاس",
    setup: "اربط هالمجموعة (رمز من الديوان)",
    start: "سلّم عليّ",
    word: "إلعب كلمة اليوم",
  },
  // The bot's profile in Telegram is read by people who don't know the
  // Society yet, so it stays in standard Arabic.
  description:
    "هدهد، حامل رسائل جمعية الفنون والآداب في الجامعة الأمريكية. الفعاليات والحجز، وقرطاس، وكلمة كل يوم، وإشعاراتك من الجمعية، كلها في تيليغرام.",
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
    `شكرًا لأنك طلبت تنضم إلى ${group}. واحد من المشرفين راح يشوف طلبك قريب. وإذا عندك حساب بالجمعية اربطه وأدخّلك هسه.`,
  linked: (name: string) =>
    `انربط. تشرفنا صدگ يا ${name}. إشعاراتك هم راح توصلك هنا، وتگدر تطفيها من /me.`,
  linkFailed:
    "هالرابط خلص وقته أو انستخدم قبل. سوّي رابط جديد من «حسابك» على ⁦auibsal.org⁩، وبعدين الإعدادات.",

  linkHow:
    "حتى تربط حسابك، افتح «حسابك» على ⁦auibsal.org⁩، وبعدين الإعدادات، واختار <b>اربط تيليغرام</b>. بس كبسة وحدة.",
  memberNo: "حسابك بعده ما توثّق: كمّل انضمامك على ⁦auibsal.org⁩ حتى تحجز.",
  membersOnly: "للأعضاء بس",
  memberYes: "عضو موثّق",

  meTitle: (name: string) => `<b>${name}</b>`,
  myPlaces: "<b>مقاعدك</b>",
  needLink: "اربط حسابك بالجمعية أول، وبعدين أحجزلك.",

  noPlaces: "بعد ما عندك مقاعد. /events يراويك شنو اكو.",
  notAdmin: "هاي بس لمشرفين المجموعة.",
  notConnected:
    "هالمجموعة بعدها مو مربوطة بالجمعية. واحد من المسؤولين يگدر يربطها من الديوان («الإعلام»، «القنوات»).",
  notifyOff: "إشعاراتك راح توصلك بالإيميل بس.",
  notifyOn: "إشعاراتك رجعت توصلك هنا.",
  notLinked:
    "تيليغرامك بعده مو مربوط بحساب بالجمعية، فما أعرف عنك غير اسمك بتيليغرام.",
  onePlaceLeft: "باقي مقعد واحد",
  paperOut: "طلعت <b>«جريدة الأحد»</b>. عدد هالشهر ينتظرك.",
  placesLeft: (n: string) => `باقي ${n} مقعد`,

  postEventSoon: (date: string) => `<b>بعد يومين</b>: ${date}`,
  postPiece: "<b>جديد بقرطاس</b>",
  postWeek: "<b>شنو عدنا هالأسبوع</b>",
  postWeekCalls: "اكتبوا لقرطاس",
  postWeekCloses: (date: string) => `آخر موعد ${date}`,
  postWeekEvents: "الفعاليات",
  postWord: (n: string) => `<b>الكلمة رقم ${n}</b> جاهزة.`,
  prefSaved: "انحفظ. هذا نفس الإعداد اللي في «الإشعارات» بحسابك.",
  purposeNames: {
    announcements: "الإعلانات",
    brief: "موجز الصبح وملخصات الفعاليات",
    council: "تنبيهات المجلس",
    events: "الفعاليات",
    media: "تنبيهات الإعلام",
    membership: "تنبيهات العضوية",
    partnerships: "تنبيهات الشراكات",
    qirtas: "قرطاس",
    word: "كلمة اليوم",
  },
  qirtasNone: "ماكو شي جديد بقرطاس هسه. النصوص الجاية بالطريق.",

  qirtasTitle: "<b>الجديد بقرطاس</b>",
  // A removal is said in standard Arabic: Iraqi is for chat, reminders and
  // the Sunday note; removals, consents and appeals are standard (fourth
  // prompt, 7g).
  removalWarning: (name: string) =>
    `${name}، هذه المجموعة لأعضاء الجمعية، ولم أجد حسابك فيها. انضم على ⁦auibsal.org⁩ واربط حسابك هنا خلال أسبوع، وإلا فسأضطر إلى إخراجك من المجموعة. ولا يشمل ذلك موظفي شؤون الطلبة ولا المستشار من أعضاء هيئة التدريس.`,
  rsvpAlready: "عندك مقعد من قبل.",
  rsvpCancelled: "تم. مقعدك صار فارغ لغيرك.",
  rsvpClosed: "هالفعالية ما بيها حجز.",
  rsvpConfirmed: "انحجزلك مقعد. أذكّرك قبل ما تبدي.",
  rsvpEnded: "هالفعالية خلصت.",
  rsvpNotMember: "الحجز للأعضاء الموثّقين. كمّل انضمامك على ⁦auibsal.org⁩ أول.",
  rsvpWaitlisted: "العدد اكتمل، فحطيتك بقائمة الانتظار. أخبرك إذا فرغ مقعد.",
  setupBad:
    "هالرمز ما اشتغل. واحد من المسؤولين يگدر يسوي رمز جديد من الديوان: «الإعلام»، «القنوات».",

  setupOk:
    "انربطت. من هسه آني حامل رسائل الجمعية هنا.\n\nبعدين:\n1. سوّوني مشرف يگدر يدعي مستخدمين.\n2. اختاروا غرض كل موضوع، واللغة، ولمنو المجموعة من الديوان، من «الإعلام ← القنوات».\n3. فعّلوا <b>الموافقة على الأعضاء الجدد</b> لرابط الدعوة: أدخّل الأعضاء المربوطين هسه وأخلّي الباقين عليكم.",
  setupUsage: "دز /setup ويّا الرمز من الديوان («الإعلام»، «القنوات»).",
  shortDescription:
    "حامل رسائل جمعية الفنون والآداب: الفعاليات وقرطاس وكلمة كل يوم.",
  streamLive: "<b>بث مباشر هسه</b> بمجموعة الأعضاء.",
  streamSoon: (when: string) => `<b>بث مباشر بمجموعة الأعضاء</b>: ${when}`,
  summaryCame: (came: string, booked: string, walkIns: string) =>
    `إجو ${came}: ${booked} من اللي حجزوا و${walkIns} بلا حجز`,
  summaryNoShows: (n: string) => `${n} حجزوا وما إجو`,
  summaryTitle: "<b>بعد الفعالية</b>",
  unlinked:
    "انفصل. حسابك بالجمعية ما راح توصله إشعارات هنا بعد. تگدر تربطه مرة لخ من الإعدادات في «حسابك».",
  waitlisted: "انت بقائمة الانتظار.",
  welcome: (name: string) =>
    `هلا ${name}، أهلًا بيك بمجموعة الأعضاء. شوف مدونة السلوك قبل لا تكتب، وأي سؤال اسأله في «مكتب المساعدة».`,

  when: (date: string, time: string) => `${date} · ${time}`,
  wordOff: "ما راح توصلك كلمة اليوم هنا بعد.",
  wordOn: "كل يوم الساعة 9:00 الصبح توصلك كلمة اليوم هنا.",
  wordOpen: "كلمة اليوم تنفتح هنا بتيليغرام.",
};

export const copy: Record<Lang, Copy> = { ar, en };

export type { Copy };
