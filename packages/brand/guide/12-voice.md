# Voice

We sound like a well-read friend: warm, precise and never grand.

| We are | We are not | So we write |
| --- | --- | --- |
| Warm | Gushing | “We would love you to join us.” Not “An AMAZING opportunity!!!” |
| Concrete | Vague | “Tuesday, November 17, 4:00 p.m., Room \[x\].” Not “soon, somewhere on campus.” |
| Confident | Grand | “A paper read blind and printed with care.” Not “Iraq’s premier literary institution.” |
| Bilingual | Translated as an afterthought | Every piece in both languages, the Arabic written for Arabic readers. |
| Playful | Mocking | “Bring a book you love and someone who hasn’t read it.” Jokes about ideas, never people. |

## House style

- Events are titled plainly for what they are: “Writing workshop”, “A reading with a guest”. Only the two traditions have names: the Typewriter Tour and Second Chapter.
- Dates as “Tuesday, November 17”; times as “6:00 p.m.”.
- Numerals in tables; words in prose under ten (Chicago, 9.2).
- American English everywhere, with no exceptions: program, color, center, traveled, canceled, catalog, organization.
- No emoji; no exclamation marks in headlines.

## Which Arabic

We speak two kinds of Arabic, as our members do (owner, Nov 4, 2026).

- **Iraqi Arabic** where the Society talks with members as a friend would: Hudhud in Telegram, captions and stories on social media, the members' group, a sign at the door. Spell it as Iraqis write it, with گ, چ and پ («أگدر»، «چا»، «پاس»), and keep it warm and brief.
- **Standard Arabic** for everything meant to last or to be read beyond the chat: the website and the Diwan, emails, the Society's documents and policies, certificates, Qirtas's pages and articles (a writer's own piece keeps the Arabic they wrote it in), the press kit, and the bot's Telegram profile.
- Never mix the two in one message.

## Names and pictures

- “AUIB Society of Arts and Letters” in full on first use; then “the Society” or “SAL”. Never “the club”, never “Art and Letter”.
- Call Qirtas “the Society’s paper”. Events are named as the Events page lists them; none is a program.
- Partners with Arabic names are named in their own language first.
- People: captions, credits, playbills and Next Stop's lower thirds use the name the person chose to be shown (their short name, or the name they are credited by); signature blocks, letters, certificates and anything signed use the full official name. Names come from the site, never typed.
- Icons come only from the Society's set; they stand alone when they say enough (see Icons). No emoji. Mark wrong examples with a plain “×”.
- Describe the Society with the motto, "The paper and the pen." («والقرطاسُ والقلمُ»), on posters, bios, stickers and anywhere short: no list of its parts. Where a full sentence is needed (the About page, the press kit, LinkedIn's About, letters to partners), use only this one: "The AUIB Society of Arts and Letters publishes Qirtas, AUIB's paper of news, letters and art; runs the Company, its theater; makes Next Stop, its show; and holds events all year."

## Language standard

One standard for every word the platform writes (owner, Nov 4, 2026). `bun run check:i18n` checks the messages, the email copy and Hudhud's copy against it (`scripts/check-language.ts`).

### English

- **The Chicago Manual of Style** for everything the Society writes, with Merriam-Webster for spelling: program, color, theater, canceled, judgment. Where this page is silent, Chicago decides.
- Curly quotes and apostrophes in prose (“ ” ‘ ’); the ellipsis character (…); an en dash for ranges (6:00–8:00 p.m., November 17–20); the em dash as Chicago uses it, sparingly.
- The serial comma: “Qirtas, the Company, and Next Stop.”
- Sentence case for interface labels, buttons and titles: “Book a place”, not “Book A Place”. Names keep their capitals: Qirtas, the Diwan, the Company, Get involved.
- “For example” and “that is” in running text; no exclamation marks; no “click here”.
- Dates, times and amounts only through `formatLongDate`, `formatClock` and `formatIqd`: "Tuesday, October 13", "6:00 p.m.", "50,000 IQD".

### Arabic

- **Which Arabic:** Modern Standard Arabic, following the Arab language academies' usage, everywhere the Society writes, except where it chats: Hudhud, social captions and stories, the members' group and signs at the door speak Iraqi Arabic (above). The checker keeps Iraqi spellings (گ، چ، پ، شلون، هسه، ماكو …) out of everything but Hudhud's copy.
- **Digits:** Latin digits (0–9), as the formatter writes them (`nu-latn`); never ٠–٩.
- **Months:** the Iraqi (Levantine) names, as `ar-IQ` formats dates: كانون الثاني، شباط، آذار، نيسان، أيار، حزيران، تموز، آب، أيلول، تشرين الأول، تشرين الثاني، كانون الأول. Never يناير … ديسمبر.
- **Punctuation:** the Arabic comma, semicolon and question mark (، ؛ ؟); «» for quotations and for the names of pages and buttons («شارك معنا»), never "" or “”; a full stop and the ellipsis as in English.
- **Spelling:** tanween al-fath on the letter before the alif (شكرًا، دائمًا), not on the alif (شكراً), and no other tanween (جارٍ is written جار); hamzas written in full (إلى، أن، مسؤول) and hamzat al-wasl bare on derived nouns (استمارة، اجتماع); taa marbuta and alif maqsura only at a word's end; no tatweel: rephrase instead (بالنطاق ⁦@auib.edu.iq⁩، ضمن، التزامات الجمعية).
- **Latin inside Arabic:** an address (auibsal.org, an email, a link) is isolated so it reads left to right: ⁦…⁩ in plain text, `<bdi>` or `dir="ltr"` in markup.
- **Voice:** address the reader as «أنت» in the masculine generic, as standard Arabic does, unless the text knows the reader; imperatives for buttons («احجز مكانًا»، «أرسل»), verbal nouns for headings and labels («الحجز»، «الإرسال»).
- **Translation:** every piece exists in both languages; write the Arabic for Arabic readers, not word for word. It is used as written, and the team edits later where needed.

### Glossary

One glossary for every Arabic word the Society uses, kept with the decisions in the Claude project. The terms used most:

| English | Arabic |
| --- | --- |
| AUIB Society of Arts and Letters | جمعية الفنون والآداب في الجامعة الأمريكية (then الجمعية; never النادي) |
| Qirtas · Qalam | قرطاس · قلم |
| the Company | الفرقة |
| Next Stop | «المحطة التالية» |
| the Typewriter Tour | «جولة الآلة الكاتبة» |
| Second Chapter | «الفصل الثاني» |
| the Diwan · Hudhud | الديوان · هدهد |
| the Council | المجلس |
| the Executive Board | الهيئة التنفيذية |
| general meeting | الاجتماع العام |
| the Annual Meeting | الاجتماع السنوي |
| the Founding Meeting | الاجتماع التأسيسي |
| member | عضو |
| event · event lead | فعالية · قائد الفعالية |
| Events | «الفعاليات» |
| Get involved | «شارك معنا» |
| the Edition | الإصدار |
| piece | عمل (the writer's own: عملك) |
| the Sunday Paper | «جريدة الأحد» |
| Write for Qirtas | «اكتب لقرطاس» |
| the Mutanabbi Prize | جائزة المتنبي |
| needs list | قائمة الاحتياجات |
| version · draft | النسخة · مسودة |
| sign in · sign out | تسجيل الدخول · تسجيل الخروج |
