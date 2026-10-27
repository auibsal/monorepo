Use this system for anything carrying the Society's name: screens, posts, documents and print. The Society sounds like a well-read friend: warm, precise and never grand. It looks like the best-made page on campus: wide margins, light type, one crimson mark. Modern in its restraint, literary in its words, and plainly part of AUIB.

This is SAL-BRD-01, Brand and Identity, Version 1, ratified by the Society. The full guide is the PDF in Other.

## Three principles

- **Quiet by default.** White space, hairline rules and sentence case carry the page. Each page gets one loud thing: a headline, one crimson word or one band of color.
- **One language per piece.** Every page, post and document is in English or in Arabic, with the logo in that language. The two editions are equals: same family, same care, each written for its own readers. Never both on one piece, never a translation tucked underneath.
- **The page is the brand.** The symbol is a bookmark and appears only as the logo. Everything else is built from what a book is made of: pages, margins, rules and type. Headings stand alone: no markers, no ribbons, no labels above them.

## Content fundamentals

- Write warm, not gushing: "We would love you to join us." Never "An AMAZING opportunity!!!"
- Be concrete: "Tuesday, October 13, 4 PM, Room [x]." Never "soon, somewhere on campus."
- Be confident, not grand: "A paper read blind and printed with care." Never "Iraq's premier literary institution."
- Be playful about ideas, never people: "The worst poem at AUIB wins."
- Write Arabic for Arabic readers, then have a native speaker check it. Never ship a translation as an afterthought.
- Names: "AUIB Society of Arts and Letters" in full on first use in formal documents; then "the Society" or "SAL". Never "the club", never "Art and Letter".
- The Society's paper is **Qirtas** («قرطاس», paper, from the motto «والقرطاسُ والقلم»), "AUIB's paper of news, letters and art." Qirtas is the Society's paper, not a program: its masthead, desks and Launch Night are its own.
- The programs are four flagships, **Next Stop**, **Second Chapter**, **Typewriter Tour** and **the Company**, plus **the Evenings** (the Majlis, Book Circle and Open Pages, in a three-week cycle on one weekday) and **the Specials** (Bad Poetry Night, Munazara, Mutanabbi Friday).
- Endorsed programs carry the line "a Society of Arts and Letters programme" (Arabic: «من برامج جمعية الفنون والآداب»).
- Short titles: "Charter Day", "Every Dinar", "The Ribbon".
- Dates as "Tuesday, October 13"; times as "6:00 PM"; money as "50,000 IQD". Numerals in tables; words in prose for numbers under ten.
- American English everywhere: organization, program, color. Quoted adopted text and the endorsement line keep their own spelling.
- Partners with Arabic names are named in their own language first: Natrok Athar (نترك اثر).
- No emoji, no exclamation marks in headlines. Tag @auibsal on every post, and always give the date.

## Color

- Six colors do all the work: `white`, `ink`, `crimson`, `paper`, `stone` and `ash`. Aim for about 70% white, 18% ink, 7% crimson and 5% paper and stone.
- `crimson` appears once or twice a page at full strength: the logo, one italic word, one button, one band. Never as a pale tint, never as large blocks of headline.
- `paper` is Qirtas's page and long reading only. Elsewhere the page is `white`.
- `stone` is for hairline rules only, never text. `ash` is secondary text and captions (6.0:1 on white, 5.3:1 on paper).
- Two colors are reserved: `crimson-700` lives only inside the logo files; `crimson-100` (rose) is the accent on `ink`, where crimson fails contrast, and the reversed wordmark color.
- Build with the role tokens: `surface`, `surface-reading`, `text`, `text-secondary`, `accent`, `line`, `band` and `on-band`. They switch between light and dark.
- Dark mode is `ink` with white text, `mist` for secondary text and rose in place of crimson. Never crimson text or the crimson symbol on `ink` (1.7:1).

## Type

- Ubuntu is the Society's voice in English and Ubuntu Arabic in Arabic: one family for both languages, as AUIB uses it. Ubuntu and Ubuntu Mono come from Google Fonts; Ubuntu Arabic ships in `fonts/`.
- **Display is Light.** Headlines, the motto and large dates are Ubuntu Light (300), large, tightly spaced, in `text`. One word in Light Italic and `accent` per headline at most: "The paper and the *pen.*"
- **Text is Regular**, 1.6 leading, 60–70 characters a line. **Labels are Medium**, small, tracked capitals, and only name fields, columns and metadata: never a line above a headline. **Bold** is for the logo and for emphasis inside a sentence, never for headlines.
- Arabic is set in Ubuntu Arabic Regular, with 1.3 leading for display and 1.6–2.0 for text. It has no Light and no italic: Arabic display is Regular, and the accent word changes color only. Never tracked. Set `dir="rtl"` and `lang="ar"` on the page or post, and mirror the layout. Use Western digits in both languages.
- Qirtas's long articles are set in Literata (Google Fonts) for reading; its masthead, headlines and interface stay Ubuntu.
- Codes, form numbers and six-word typewriter lines are Ubuntu Mono: `SAL-GOV-01`, `F-14`.
- Use the styles in tokens: `display-xl`, `display`, `title`, `heading`, `lede`, `body`, `label`, `caption` on screens; `print-*` for A4; `post-*` for 1080 × 1350 posts; `ar-*` for Arabic; `read-*` for Qirtas.

## Space and shape

- Space is the main material. Use the spacing scale (`space-1` 4 px to `space-9` 128 px); sections on screens are `space-8` apart, A4 pages keep `page-margin` (21 mm).
- Corners are square everywhere (`radius-none`). Only avatars are round.
- No shadows, no frames around controls, no tinted cards. Separate things with `hairline` rules in `line` and with space.
- At most one full-bleed `band` per page.

## The symbol, wordmarks and lockups

- The **symbol** is a crimson panel with a V-notch cut into its top; turned over, it is the tail of a ribbon bookmark, and its name is **the Bookmark** (Arabic «العلامة»). The **English wordmark** is "AUIB / Society of / Arts and / Letters" in Ubuntu Bold, on four lines. The **Arabic wordmark** is «جمعيةُ الفنونِ / والآدابِ في / الجامعةِ / الأمريكيةِ» in Ubuntu Arabic Bold, on four lines.
- Use the files in Logos (`assets/Logos/README.md`); never retype or redraw them. Their line breaks, spacing and proportions are fixed.
- Color is one hue. On light grounds the symbol is `crimson` and the wordmarks `crimson-700`. On `crimson` or `ink`, use the reversed files: white symbol, `crimson-100` wordmarks.
- Use the lockup in the content's language: the English horizontal lockup for English, the Arabic horizontal lockup (`sal-lockup-horizontal-ar`, symbol on the right) for Arabic. Stacked for square spaces and merchandise; the symbol alone for avatars, favicons and stamps. The bilingual lockup is only for permanent signage, banners and merchandise that must speak to both at once.
- The logo appears **once** per page or post, in the header or a corner, with clear space of one notch depth on every side. Never repeat it in a hero beneath the header.
- The Bookmark is only ever the logo. Never use it as a bullet, a section marker, a ribbon or a decoration.
- Where the AUIB logo appears it leads; the SAL lockup follows at equal or smaller height. Never stretch, recolor, rotate, re-break the wordmark lines, add effects, or put the crimson symbol on `ink`.

## Screens

- **Grounds.** One ground for the whole platform, public site and the Diwan (the members' portal) alike, in two modes: light is white; dark is ink. The visitor's system setting picks the mode until they choose. The footer is ink in both. Qirtas pages sit on `paper`. Certificates and printouts stay white sheets in dark mode.
- **Header.** One line: the lockup in the page's language (English lockup on `/`, Arabic lockup on `/ar`), at most five sections, the other language as a text link (العربية or English) and Sign in. A hairline below it. Nothing boxed.
- **Section titles** stand alone: the title, and at most a text link at the end of its line. No marker, no label or kicker above it.
- **One language per page.** The English site is English only and the Arabic site Arabic only, mirrored. The motto appears as "The paper and the pen." on English pages and «والقرطاسُ والقلم» on Arabic pages.
- **Buttons.** One solid `accent` button per view for the main action, 48–50 px tall, square, sentence case. Everything else is a text link with an underline. No frames, no offset blocks.
- **Lists over cards.** Events, stories, programs and partners are lists separated by hairlines. Use a card only when the thing is a separate object, like a ticket.
- **Dates.** Event lists carry large Light dates down the margin, like an almanac.
- **Capitals** only for small labels, never sentences, never Arabic.
- **Contrast.** Every text pair reaches 4.5:1 in both modes.
- **Phones.** Nothing scrolls sideways at 360 px.
- **Words.** Errors and statuses say what happened and what to do, in the Society's voice. No exclamation marks, and never a service's raw message.

## Hudhud, the mascot

- Hudhud (هدهد) is a hoopoe: native to Iraq, the messenger of the old stories, and the guide in Attar's *The Conference of the Birds*. It is the face of the Telegram bot and appears only where the Society talks to members one to one: the bot, notices, stickers, and empty states that point somewhere.
- Hudhud and the logo never touch. The symbol and wordmarks are never put in Hudhud's beak, crest, feet or anywhere on it, and Hudhud never stands in for a logo or sits inside a lockup. Where both appear, as on a bot welcome card, keep them apart with at least the logo's clear space.
- Hudhud is drawn flat, in the brand's colors and with no outlines: a `crimson` body, `crimson-100` breast, `ink` wings, tail and beak with `white` bars. On `crimson` grounds, use the reversed files, where the body turns `white`.
- Use the files in Mascot (`assets/Mascot/README.md`): standing, standing reversed, flying, and the round avatar. Never redraw, recolor, stretch or mirror them. Props, expressions and the symbols for sleep, questions and surprise belong to the stickers in Stickers (`assets/Stickers/README.md`) only.
- Keep Hudhud at 48 px or larger; the avatar works down to 28 px.
- Hudhud speaks in the first person, warm and brief: "You're in. I'll remind you before it starts." No exclamation marks and no emoji. See `components/Hudhud/README.md`.

## Documents

- **One language per document.** The Arabic edition is its own document, mirrored, with the Arabic lockup. Codes stay in Latin letters.
- **Cover:** the lockup at the top start; the document code in Ubuntu Mono at the top end. Title in `print-display` (Light, `ink`), one sentence in `print-lede`, "Prepared by", and a hairline footer with the date and status. No ribbon, no band.
- **Section pages:** a one- or two-word title in `print-display` Light, a one-sentence lede, then content. No label above the title.
- **Contents:** numbered rows with hairlines; no band.
- **Legal text:** two columns, articles numbered in Ubuntu Mono, clause numbers in the margin.
- **Forms:** code and title above a hairline, the symbol at top right, small tracked labels, ink write-on lines, and an office-use strip on `paper`.
- **Footers** (every page but the cover): code and title at left, "n / total" at right, in `text-secondary`.
- **Closing page:** "Thank you." in `print-display` Light, and nothing else.
- Code series: SAL-GOV, SAL-POL, SAL-OPS, SAL-STR, MEM, BRD, PRT, PRP.

## Components

- Plain HTML with `components/bundle.css` (classes prefixed `sal-`). Load `tokens.css` first, then `bundle.css`, and copy the markup from each preview.
- `DocumentCover`, `DocumentFooter`, `FormHeader`, `SocialPost`, `Carousel`, `Story`, `Hudhud`, `HudhudStickers`.
- Covers and forms are always light (`data-theme="light"`).

## Social and print

- **One language per post.** English posts carry the English lockup and English only; Arabic posts the Arabic lockup and Arabic only, mirrored. Post them separately.
- **Posts (1080 × 1350):** the lockup at the top start; a headline of two to five words with a full stop in `post-display` Light, one italic word at most; one sentence; the date, link and @auibsal at the bottom start. No label above the headline.
- **Photo posts:** the photo above (1080 × 820), the headline and meta on a solid ink or white panel below, the lockup at the bottom end. Never type over a photograph.
- **Carousels:** a cover post, numbered inside slides ("01", a short title, a few lines), and an end slide with the wordmark alone in the carousel's language: no symbol, no text. One ground and one language throughout. No slide counters or "swipe" prompts.
- **Stories (1080 × 1920):** the post's parts, with every word 250 px clear of the top and 340 px clear of the bottom.
- Three grounds, by purpose: `crimson` for calls and moments, `white` for events, `ink` for words worth keeping and recruiting.
- Posters A3/A4 follow the post: lockup, Light headline, a QR code at bottom right. Term Card A6; membership cards 85 × 55 mm; certificates A4 landscape with a single hairline frame and the lockup. Print only when current stock runs out.

## Imagery

- Use our own photos of our own people, taken with consent. Never stock photos of books or typewriters in place of ours.
- Shoot hands on typewriter keys, pages, books being handed over, readers mid-sentence, full rooms. Natural light, no heavy filters.
- Keep color natural and slightly warm. For posters and covers, a duotone in `crimson` or `ink`. Crop with room for a headline. Never leave an empty image space: no photo means a typographic layout.
- Never shoot anyone wearing a camera-shy sticker, identifiable children, or people praying, in distress or in private moments.

## Iconography

- The system has no icon set. Its pictorial elements are the logo and, in one-to-one channels only, Hudhud and his stickers. Use words, not icons or emoji. Mark failures in examples with a plain "×".
