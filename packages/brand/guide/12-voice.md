# Voice

We sound like a well-read friend: warm, precise and never grand.

| We are | We are not | So we write |
| --- | --- | --- |
| Warm | Gushing | "We would love you to join us." Not "An AMAZING opportunity!!!" |
| Concrete | Vague | "Tuesday, October 13, 4 PM, Room \[x\]." Not "soon, somewhere on campus." |
| Confident | Grand | "A paper read blind and printed with care." Not "Iraq's premier literary institution." |
| Bilingual | Translated as an afterthought | Arabic written for Arabic readers, then checked by a native speaker. |
| Playful | Mocking | "The worst poem at AUIB wins." Jokes about ideas, never people. |

## House style

- Short titles: "Charter Day", "Launch Night", "The Ribbon".
- Dates as "Tuesday, October 13"; times as "6:00 PM".
- Numerals in tables; words in prose under ten.
- American English everywhere, with no exceptions: program, color, center, traveled, canceled, catalog, organization.
- No emoji; no exclamation marks in headlines.

## Which Arabic

We speak two kinds of Arabic, as our members do (owner, Nov 4, 2026).

- **Iraqi Arabic** where the Society talks with members as a friend would: Hudhud in Telegram, captions and stories on social media, the members' group, a sign at the door. Spell it as Iraqis write it, with گ for the g sound ("أگدر", "صدگ"), and keep it warm and brief.
- **Standard Arabic** for everything meant to last or to be read beyond the chat: the website and the Diwan, emails, the Society's documents and policies, certificates, Qirtas's pages and articles (a writer's own piece keeps the Arabic they wrote it in), the press kit, and the bot's Telegram profile.
- Never mix the two in one message. Every Iraqi line is checked by a native speaker before it ships, like any Arabic written for the platform.

## Names and pictures

- "AUIB Society of Arts and Letters" in full on first use; then "the Society" or "SAL". Never "the club", never "Art and Letter".
- Call Qirtas "the Society's paper". Events are named as What's on lists them; none is a program.
- Partners with Arabic names are named in their own language first.
- Icons come only from the Society's set; they stand alone when they say enough (see Icons). No emoji. Mark wrong examples with a plain "×".
- Name the Society's three parts in this order: Qirtas, our paper; the Company, our theater; and events all year.

## Language standard

One standard for every word the platform writes (owner, Nov 4, 2026). `bun run check:i18n` checks the messages, the email copy and Hudhud's copy against it (`scripts/check-language.ts`).

### English

- American spelling and usage (Merriam-Webster; Chicago for style): program, color, theater, canceled, judgment.
- Sentence case for titles, buttons and labels: "Book a place", not "Book A Place". Names keep their capitals: Qirtas, the Diwan, the Company, Get involved.
- Straight quotes and apostrophes (`"`, `'`); the ellipsis character (…); an en dash for ranges (6:00–8:00 PM, October 13–20); commas, colons or parentheses in place of the em dash.
- "For example" and "that is", not "e.g." and "i.e."; no exclamation marks; no "click here".
- The serial comma only where a list would be misread without it.
- Dates, times and amounts only through `formatLongDate`, `formatClock` and `formatIqd`: "Tuesday, October 13", "6:00 PM", "50,000 IQD".

### Arabic

- **Which Arabic:** standard Arabic everywhere the Society writes, except where it chats: Hudhud, social captions and stories, the members' group and signs at the door speak Iraqi Arabic (above). The checker keeps Iraqi spellings (گ, چ, شلون, هسه, ماكو …) out of everything but Hudhud's copy.
- **Digits:** Latin digits (0–9), as the formatter writes them (`nu-latn`); never ٠–٩.
- **Months:** the Iraqi (Levantine) names, as `ar-IQ` formats dates: كانون الثاني، شباط، آذار، نيسان، أيار، حزيران، تموز، آب، أيلول، تشرين الأول، تشرين الثاني، كانون الأول. Never يناير … ديسمبر.
- **Punctuation:** the Arabic comma, semicolon and question mark (، ؛ ؟); «» for quotations and for the names of pages and buttons («شارك معنا»), never "" or “”; a full stop and the ellipsis as in English.
- **Spelling:** tanween on the letter before the alif (شكرًا، دائمًا), not on the alif (شكراً); hamzas written in full (إلى، أن، مسؤول); the tatweel only to join a prefix to Latin text or a number (لـSAL، بـ50).
- **Voice:** address the reader as «أنت» in the masculine generic, as standard Arabic does, unless the text knows the reader; imperatives for buttons («احجز مكانًا»، «أرسل»), verbal nouns for headings and labels («الحجز»، «الإرسال»).
- **Translation:** write the Arabic for Arabic readers, not word for word; a new Arabic line is needs-native-review until a native speaker has read it.

### Glossary

| English | Arabic | Note |
| --- | --- | --- |
| AUIB Society of Arts and Letters | جمعية الفنون والآداب في الجامعة الأمريكية في العراق – بغداد | then الجمعية; never النادي |
| the Society | الجمعية | |
| Qirtas | قرطاس | no quotes |
| Edition (of Qirtas) | الإصدار | not العدد |
| piece | المادة / العمل | the writer's own: عملك |
| the Sunday Paper | «جريدة الأحد» | |
| the Diwan | الديوان | no quotes |
| Membership | العضوية | |
| member | عضو | |
| guest | ضيف | |
| partner | شريك | |
| the Council | المجلس التنفيذي | |
| event | فعالية | not حدث or نشاط |
| program | برنامج | |
| What's on | البرنامج | |
| Get involved | «شارك معنا» | |
| the Company | الفرقة | |
| production | عرض | |
| the Qirtas Awards | جوائز قرطاس | |
| the Apprenticeship | التدريب المهني | |
| version (of a document) | النسخة | |
| draft | مسودة | |
| sign in / sign out | تسجيل الدخول / تسجيل الخروج | |
| Hudhud | هدهد | no quotes |
