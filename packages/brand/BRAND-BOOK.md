Use this system for anything carrying the Society's name: screens, posts, documents and print. The Society sounds like a well-read friend: warm, precise and never grand. It looks like the best-made page on campus: wide margins, light type, one crimson mark. Modern in its restraint, literary in its words, and plainly part of AUIB.

This is SAL-MED-02, Brand and Identity, Version 1, proposed for adoption at the Founding Meeting (March 30, 2027), in short. The full guide is the design system's Guide, in the Diwan at /diwan/design (`packages/brand/guide`).

## Three principles

- **Quiet by default.** White space, hairline rules and sentence case carry the page. Each page gets one loud thing: a headline, one button or one band of color.
- **One language per piece.** Every page, post and document is in English or in Arabic, with the logo in that language. The two editions are equals: same family, same care, each written for its own readers. Never both on one piece, never a translation tucked underneath.
- **The page is the brand.** The symbol is a bookmark and appears only as the logo. Everything else is built from what a book is made of: pages, margins, rules and type. Headings stand alone: no markers, no ribbons, no labels above them. Icons carry meaning; they never decorate.

## Content fundamentals

- Write warm, not gushing: "We would love you to join us." Never "An AMAZING opportunity!!!"
- Be concrete: "Tuesday, October 13, 4 PM, Room [x]." Never "soon, somewhere on campus."
- Be confident, not grand: "A paper read blind and printed with care." Never "Iraq's premier literary institution."
- Be playful about ideas, never people: “Bring a book you love and someone who hasn’t read it.”
- Every piece exists in both languages. Write the Arabic for Arabic readers, never as a translation done as an afterthought.
- Iraqi Arabic where the Society chats with members (Hudhud, social captions and stories, the members' group, signs at the door), spelled as Iraqis write it (گ); standard Arabic for the site, the Diwan, emails, documents, certificates and Qirtas. Never both in one message.
- Names: "AUIB Society of Arts and Letters" in full on first use in formal documents; then "the Society" or "SAL". Never "the club", never "Art and Letter".
- The Society's paper is **Qirtas** («قرطاس», paper, from the motto «والقرطاسُ والقلمُ»), "AUIB's paper of news, letters and art." Qirtas is the Society's paper, with its own masthead. It has six sections: News, Voices, Letters, Gallery, Video and Games, and runs Qalam, its summer program for high school students. Write for Qirtas is always open. One printed Edition a year, a year in review, is launched at an event; the Sunday Paper is its monthly newsletter, on the first Sunday of the month. The Mutanabbi Prize is its one prize. Six Words and Next Stop are not part of Qirtas.
- **The Company** is the Society's theater company, with its own Artistic Director on the Council.
- **Next Stop** is the Society's video show, made by the Director of Media's team.
- Everything else is an event (owner, Nov 5, 2026): the Society holds no standing programs. Each is titled plainly for what happens that day, on one standard event page with three kinds of access (open, RSVP, private). Only the two traditions have names: the **Typewriter Tour** (membership, the spring club fair week) and **Second Chapter** (partnerships, a book drive and sale at the fall club fair). Never say "program" for any of them, and never group them into kinds.
- Endorsed work carries the line "a Society of Arts and Letters program" (Arabic: «من برامج جمعية الفنون والآداب»).
- Short, plain titles: “Writing workshop”, “A reading with a guest”.
- Dates as "Tuesday, October 13"; times as "6:00 PM". Numerals in tables; words in prose for numbers under ten.
- American English everywhere, with no exceptions: program, color, center, traveled, canceled, catalog, organization.
- Partners with Arabic names are named in their own language first.
- No emoji, no exclamation marks in headlines. Tag @auibsal on every post, and always give the date.
- **One language standard** (Guide, Voice, "Language standard", with the glossary). English: the Chicago Manual of Style with Merriam-Webster: curly quotes in prose, the serial comma, en dashes for ranges, the ellipsis character; sentence case for interface labels. Arabic: Latin digits, the Iraqi month names, ، ؛ ؟ and «», tanween on the letter before the alif (شكرًا), one word per term from the one glossary (`claude/glossary_ar.md`: the Council المجلس, the Executive Board الهيئة التنفيذية, What's on «ما يجري», piece عمل). Iraqi Arabic, with گ، چ، پ, only where the Society chats.

## Color

- Six colors do all the work: `white`, `ink`, `crimson`, `paper`, `stone` and `ash`. Aim for about 70% white, 18% ink, 7% crimson and 5% paper and stone.
- `crimson` appears once or twice a page at full strength: the logo, one button, links, one band. Never as a pale tint, never as large blocks of headline.
- `paper` is Qirtas's page and long reading only. Elsewhere the page is `white`.
- `stone` is for hairline rules only, never text. `ash` is secondary text and captions (6.0:1 on white, 5.3:1 on paper).
- One color is reserved: `crimson-700` lives only inside the logo files. There is no pink (decided Nov 6): rose is retired, as an accent and in Hudhud.
- Build with the role tokens: `surface`, `surface-reading`, `text`, `text-secondary`, `accent`, `line`, `band` and `on-band`. They switch between light and dark.
- Dark mode is `ink` with white text and `mist` for secondary text. On `ink` and `crimson` everything is white; mist is never on crimson. In dark mode the one button is white with ink text. Never crimson text or the crimson symbol on `ink` (1.7:1).

## Type

- Ubuntu is the Society's voice in English and Ubuntu Arabic in Arabic: one family for both languages, as AUIB uses it. Ubuntu and Ubuntu Mono come from Google Fonts; Ubuntu Arabic ships in `fonts/`.
- **Display is Light.** Headlines, the motto and large dates are Ubuntu Light (300), large, tightly spaced, in `text`, in one color: no accent word, no italic word, in any language or on any ground (decided Nov 6). "The paper and the pen."
- **Text is Regular**, 1.6 leading, 60–70 characters a line. **Labels are Medium**, small, tracked capitals, and only name fields, columns and metadata: never a line above a headline. **Bold** is for the logo and for emphasis inside a sentence, never for headlines.
- Arabic is set in Ubuntu Arabic Regular, with 1.3 leading for display and 1.6–2.0 for text. It has no Light and no italic: Arabic display is Regular. Never tracked. Set `dir="rtl"` and `lang="ar"` on the page or post, and mirror the layout. Use Western digits in both languages.
- Qirtas's long articles are set in Literata (Google Fonts) for reading; its masthead, headlines and interface stay Ubuntu.
- Codes, form numbers and six-word typewriter lines are Ubuntu Mono: `SAL-GOV-01`, `F-14`.
- Use the styles in tokens: `display-xl`, `display`, `title`, `heading`, `lede`, `body`, `label`, `caption` on screens; `print-*` for A4; `post-*` for 1080 × 1350 posts; `ar-*` for Arabic; `read-*` for Qirtas.

## Space and shape

- Space is the main material. Use the spacing scale (`space-1` 4 px to `space-9` 128 px); sections on screens are `space-8` apart, A4 pages keep `page-margin` (21 mm).
- Corners are square everywhere (`radius-none`). Only avatars are round.
- No shadows, no frames around controls, no tinted cards. Separate things with `hairline` rules in `line` and with space.
- At most one full-bleed `band` per page.

## Motion

- **Quiet, and only to explain.** Movement shows where something came from or went: a panel opening, a shelf moving one item, one page becoming another. Nothing moves to decorate, loop or draw the eye.
- **Native CSS and the browser's own tools:** transitions, scroll snapping, view transitions. No 3D and no animation library.
- **Three durations and one easing,** from the tokens: `duration-quick` (120 ms) for hover and focus, `duration-base` (200 ms) for a part of the page appearing or moving, `duration-slow` (320 ms) for one page becoming another, all on `ease-standard`. Nothing longer.
- **Opacity and position only.** No bouncing, spinning, scaling of text, parallax or motion tied to scrolling.
- **Reduced motion is respected everywhere:** with the system setting on, everything arrives at once. Nothing depends on movement to be understood.
- **Direction follows the language.** Sliding and paging run right to left on Arabic pages.

## The symbol, wordmarks and lockups

- The **symbol** is a crimson panel with a V-notch cut into its top; turned over, it is the tail of a ribbon bookmark, and its name is **the Bookmark** (Arabic «العلامة»). The **English wordmark** is "AUIB / Society of / Arts and / Letters" in Ubuntu Bold, on four lines. The **Arabic wordmark** is «جمعيةُ الفنونِ / والآدابِ في / الجامعةِ / الأمريكيةِ» in Ubuntu Arabic Bold, on four lines.
- Use the files in Logos (`assets/Logos/README.md`); never retype or redraw them. Their line breaks, spacing and proportions are fixed.
- Color is one hue. On light grounds the symbol is `crimson` and the wordmarks `crimson-700`. On `crimson` or `ink`, use the reversed files: white symbol, white wordmarks.
- Use the lockup in the content's language: the English horizontal lockup for English, the Arabic horizontal lockup (`sal-lockup-horizontal-ar`, symbol on the right) for Arabic. Stacked for square spaces and merchandise; the symbol alone for avatars, favicons and stamps. The bilingual lockup is only for permanent signage, banners and merchandise that must speak to both at once.
- The logo appears **once** per page or post, in the header or a corner, with clear space of one notch depth on every side. Never repeat it in a hero beneath the header.
- The Bookmark is only ever the logo. Never use it as a bullet, a section marker, a ribbon or a decoration.
- Where the AUIB logo appears it leads; the SAL lockup follows at equal or smaller height. Never stretch, recolor, rotate, re-break the wordmark lines, add effects, or put the crimson symbol on `ink`.

## Screens

- **Grounds.** One ground for the whole platform, public site, the members' pages and the Diwan alike, in two modes: light is white; dark is ink. The visitor's system setting picks the mode until they choose. The footer is ink in both. Qirtas pages sit on `paper`. Certificates and printouts stay white sheets in dark mode.
- **Header.** One line: the lockup in the page's language (English lockup on `/`, Arabic lockup on `/ar`), at most five sections, the other language as a text link (العربية or English) and Sign in. A hairline below it. Nothing boxed.
- **Section titles** stand alone: the title, and at most a text link at the end of its line. No marker, no label or kicker above it.
- **One language per page.** The English site is English only and the Arabic site Arabic only, mirrored. The motto appears as "The paper and the pen." on English pages and «والقرطاسُ والقلمُ» on Arabic pages.
- **Buttons.** One solid `accent` button per view for the main action, 48–50 px tall, square, sentence case. Everything else is a text link with an underline. No frames, no offset blocks.
- **Lists over cards.** Events, stories, programs and partners are lists separated by hairlines. Use a card only when the thing is a separate object, like a ticket.
- **Dates.** Event lists carry large Light dates down the margin, like an almanac.
- **Capitals** only for small labels, never sentences, never Arabic.
- **Contrast.** Every text pair reaches 4.5:1 in both modes.
- **Phones.** Nothing scrolls sideways at 360 px.
- **Words.** Errors and statuses say what happened and what to do, in the Society's voice. No exclamation marks, and never a service's raw message.

## Hudhud, the mascot

- Hudhud (هدهد) is a hoopoe: native to Iraq, the messenger of the old stories, and the guide in Attar's *The Conference of the Birds*. It is the face of the Telegram bot, which posts notices to Announcements, sends a daily word and warns members a week before removal; it appears only where the Society talks to members: the bot, notices, stickers, and empty states that point somewhere.
- Hudhud and the logo never touch. The symbol and wordmarks are never put in Hudhud's beak, crest, feet or anywhere on it, and Hudhud never stands in for a logo or sits inside a lockup. Where both appear, as on a bot welcome card, keep them apart with at least the logo's clear space.
- Hudhud is drawn flat, in the brand's colors and with no outlines: a `crimson` body, `stone` breast, `ink` wings, tail and beak with `white` bars. On `crimson` grounds, use the reversed files, where the body turns `white`.
- Use the files in Mascot (`assets/Mascot/README.md`): standing, standing reversed, flying, and the round avatar. Never redraw, recolor, stretch or mirror them. Props, expressions and the symbols for sleep, questions and surprise belong to the stickers in Stickers (`assets/Stickers/README.md`) only.
- Keep Hudhud at 48 px or larger; the avatar works down to 28 px.
- Hudhud speaks in the first person, warm and brief: "You're in. I'll remind you before it starts." No exclamation marks and no emoji. See `components/Hudhud/README.md`.

## Documents

- **Two editions, one language each.** Every document is a Notion page in English and in Arabic; the Arabic edition is its own document, mirrored, with the Arabic lockup. Codes stay in Latin letters. Status: "Version 1, proposed" until the Founding Meeting.
- **Cover:** the lockup at the top start; the document code in Ubuntu Mono at the top end. Title in `print-display` (Light, `ink`), one sentence in `print-lede`, "Prepared by", and a hairline footer with the date and status. No ribbon, no band.
- **Section pages:** a one- or two-word title in `print-display` Light, a one-sentence lede, then content. No label above the title.
- **Contents:** numbered rows with hairlines; no band.
- **Legal text:** two columns, articles numbered in Ubuntu Mono, clause numbers in the margin.
- **Forms:** digital by default, on one standard page at auibsal.org/forms/F-xx (code SAL-EXB-01 · F-xx), signed by typing a name; staff forms are Notion templates. The printed form is only a backup, in the same plain layout: code and title above a hairline, the symbol at top right, labels and ink write-on lines, no office-use strip.
- **Footers** (every page but the cover): code and title at left, "n / total" at right, in `text-secondary`.
- **The end:** documents end with their last section. "Thank you." in `print-display` Light closes only printed pieces (decks, printed programs, the Edition).
- Code families, one per Council seat: SAL-GOV (the members'), EXB, EVT, MEM, PTN, MED, ART, EDT; 01 is each family's general manual.

## Components

- Plain HTML with `components/bundle.css` (classes prefixed `sal-`). Load `tokens.css` first, then `bundle.css`, and copy the markup from each preview.
- `DocumentCover`, `DocumentFooter`, `FormHeader`, `SocialPost`, `Carousel`, `Story`, `Highlights`, `Hudhud`, `HudhudStickers`.
- Covers and forms are always light (`data-theme="light"`).

## Social and print

- **One language per post.** English posts carry the English lockup and English only; Arabic posts the Arabic lockup and Arabic only, mirrored. Post them separately.
- **Posts (1080 × 1350):** the lockup at the top start; a headline of two to five words with a full stop in `post-display` Light, in one color; one sentence; the date, link and @auibsal at the bottom start. No label above the headline.
- **Photo posts:** the photo above (1080 × 820), the headline and meta on a solid ink or white panel below, the lockup at the bottom end. Never type over a photograph.
- **Carousels:** a cover post, numbered inside slides ("01", a short title, a few lines), and an end slide with the wordmark alone in the carousel's language: no symbol, no text. One ground and one language throughout. No slide counters or "swipe" prompts.
- **Stories (1080 × 1920):** the post's parts, with every word 250 px clear of the top and 340 px clear of the bottom.
- **Profile pictures:** Instagram (@auibsal) and the members' Telegram group use the Bookmark in white on crimson (`sal-avatar.svg`). The Diwan group, the officers' working group, uses the Bookmark in white on ink (`sal-avatar-ink.svg`), so the two groups are never confused. Hudhud, the bot, keeps the hoopoe (`hudhud-avatar.png`).
- **Instagram bio:** "The paper and the pen at @auibaghdad." Links, in order: auibsal.org, auibsal.org/events, auibsal.org/join.
- **Highlights:** six, in this order: What's on, Qirtas, The Company, Next Stop, Join (with the Typewriter Tour), Partners (with Second Chapter). Covers are plain crimson with the highlight's icon alone, in white: no name (Instagram writes it under the circle) and no Bookmark. Each highlight opens with a 1080 × 1920 story banner on white: the wordmark alone at the top (no Bookmark), a Light headline in ink, a short line, a list split by thin rules, and the link at the bottom. See `components/Highlights`.
- Three grounds, by purpose: `crimson` for calls and moments, `white` for events, `ink` for words worth keeping and recruiting.
- Posters A3/A4 follow the post: lockup, Light headline, a QR code at bottom right. Forms, letters, the membership card and certificates are each designed once and printed from their own pages (the form and letter are `FormPage` and `Letter`; the card and certificate are the live site's designs); certificates only for finishing Qalam and the Mutanabbi Prize, with a verification code. Print only to the confirmed need (the RSVP count plus 10%, or the number asked for); booklets in page counts of multiples of 4.
- **Paperless by default.** The site footer and every email carry “Paperless by default. Books reused through Second Chapter.” («الأصل عندنا: بلا ورق. والكتب يُعاد استخدامها عبر «الفصل الثاني».»). Say only what the Society does: no green badges.
- Print sizes: name badges 90 × 55 mm; photography notice A4; camera-shy stickers 40 mm round, twenty to an A4 sheet, the crossed-out camera alone in white on ink. Every one is drawn in Print.
- **The sticker pack** (`assets/print/stickers`, decided Nov 6): 43 stickers, from the Bookmark and the motto to Qirtas in typewriter keys, a ticket, a record, Next Stop's bus, the Company's stage, Second Chapter's book and Hudhud, printed by Student Life to the confirmed need. No white borders: each is cut on a full ground or on its own clean edge. Only the brand's colors; the variety is in shape, type and structure. Each file is one sticker at 100% with its cut line in magenta.

## Imagery

- Use our own photos of our own people, taken with consent. Never stock photos of books or typewriters in place of ours.
- Shoot hands on typewriter keys, pages, books being handed over, readers mid-sentence, full rooms. Natural light, no heavy filters.
- Keep color natural and slightly warm. For posters and covers, a duotone in `crimson` or `ink`. Crop with room for a headline. Never leave an empty image space: no photo means a typographic layout.
- Never shoot anyone wearing a camera-shy sticker, identifiable children, or people praying, in distress or in private moments.

## Iconography

- **One icon set, everywhere:** the site and the Diwan, posts, stories, highlights, documents and printables. It is Lucide (ISC license), redrawn at a 1.5 px line with square ends. The files are in Icons (`assets/Icons/README.md`), one per meaning; see `components/Icons`.
- **Alone when it says enough.** An icon can stand on its own wherever its meaning is plain: a calendar before a date, a pin before a place, close, menu, search, share, a link arrow. Add a word only when the icon alone could be misread (Join, Get involved, a section name the first time it appears). On screens, a standalone icon carries an `aria-label`.
- **Same size and color as the text** around it, at 1.15 em: `text` or `text-secondary`, white on crimson and ink. Never crimson on its own, never filled, never in two colors.
- **Never** in a headline, as a bullet, as decoration or in place of the logo. The Bookmark is never an icon, and Hudhud is never an icon.
- **One icon, one meaning,** as the Icons list sets out (calendar for a date, map-pin for a place). Don't add an icon from outside the set; ask the Director of Media to add one, drawn the same way.
- Still no emoji, except the one each Telegram sticker is filed under. Mark failures in examples with a plain "×".
