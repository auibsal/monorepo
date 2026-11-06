# Space, motion, icons and interface parts

## Space and shape

Space is the main material. Things are separated by margins and hairlines, never by boxes, shadows or fills.

| Token | Value |
| --- | --- |
| `space-1` | 4 px |
| `space-2` | 8 px |
| `space-3` | 16 px |
| `space-4` | 24 px |
| `space-5` | 40 px |
| `space-6` | 56 px |
| `space-7` | 88 px |
| `space-8` | 110 px |
| `space-9` | 128 px |
| `page-margin` | 21 mm, A4 side margins (79 px) |

- Corners are square everywhere (`radius-none`). Only avatars are round.
- Hairlines (1 px) in `line` between list rows; in `text` under mastheads and section rules.
- No shadows, no frames, no tinted cards.
- Lists over cards. Use a card only for a separate object, such as a ticket.
- One band of full-bleed color per page at most.
- One solid button; everything else a text link.

## Motion

_Added Nov 4, 2026 (owner)._

- **Quiet, and only to explain.** Movement shows where something came from or went: a panel opening, a shelf moving one item, one page becoming another. Nothing moves to decorate, loop or draw the eye.
- **Native CSS and the browser's own tools:** transitions, scroll snapping, view transitions. No 3D and no animation library.
- **Three durations and one easing,** from the tokens: `duration-quick` (120 ms) for hover and focus, `duration-base` (200 ms) for a part of the page appearing or moving, `duration-slow` (320 ms) for one page becoming another, all on `ease-standard`. Nothing longer.
- **Opacity and position only.** No bouncing, spinning, scaling of text, parallax or motion tied to scrolling.
- **Reduced motion is respected everywhere:** with the system setting on, everything arrives at once. Nothing depends on movement to be understood.
- **Direction follows the language.** Sliding and paging run right to left on Arabic pages.

## Icons

One set across the board: the site, posts, stories, highlights, documents and printables. Lucide, redrawn at a 1.5 px line with square ends, so it sits with Ubuntu Light. An icon stands alone when it says enough. The set is in Foundations → Icons.

| Group | Meanings |
| --- | --- |
| Interface | Menu, close, search, go/next, opens another site, more, language, light mode, dark mode, account, sign in, done/confirmed, error, note, download, link, share, send, email, document, reminder |
| Events | Date and What's on, time, place, RSVP, members and attendance |
| Qirtas | Qirtas and News, Voices, Letters, Gallery, Video, Games, Next Stop, an episode |
| The Society | Books and the book fair, tea and conversation, book discussions, writing workshops, listening sessions, the Company, events, the Typewriter Tour, Join, Get involved |

- **Alone when it says enough:** a calendar before a date, a pin before a place, close, menu, search, share, a link arrow. Add a word only when the icon could be misread. On screens, a standalone icon has a label for screen readers.
- **The text's size and color:** 1.15 em, in `text` or `text-secondary`; white on crimson and ink. Never crimson alone, never filled.
- **One icon, one meaning,** as listed. Additions come from Lucide, drawn the same way, approved by the Director of Media.
- **Never** in a headline, as a bullet, as decoration or in place of the logo. The Bookmark and Hudhud are never icons.
- Paste the SVG inline so it takes the text color. Still no emoji. Lucide is free to use under the ISC license.

## Interface parts

The pieces every screen is built from, in the platform's components (Components). Square, hairline, quiet.

- **Button and link.** One solid accent button per view, 48–50 px tall on screen, sentence case. Everything else is an underlined link.
- **Navigation.** Medium 14.5 px, sentence case; the current section underlined 1.5 px in accent.
- **Fields.** A 1 px line box, square. The label above, never inside.
- **Errors.** Under the field, saying what to do: "Your ID has seven digits. Check your AUIB card."
- **Section title.** The title alone, a link at the end of the line at most.
- **Lists.** Rows between hairlines, not cards. Dates large and Light.
- **Status.** Outlined text, never a filled pill: Approved, Draft, Overdue.
- **Dark mode.** The same parts on ink: text and the one button are white, secondary text mist.
- **The cookie notice.** A slim bar along the bottom edge that never covers content.
