# Icons

The Society's icon set: 44 Lucide icons redrawn at a 1.5 px line with square ends, one per meaning. The files are in `assets/Icons`; the table there lists what each one means.

**Markup:** paste the SVG inline with `class="sal-icon"`; it sizes itself to 1.15 em and takes the text color. Put it before the text it goes with, or inside `.sal-icon-label` to space a pair. A standalone icon on a screen gets `aria-label` (and `role="img"`); one beside a word keeps `aria-hidden="true"`.

**Rules**
- Alone when the meaning is plain: a calendar before a date, a pin before a place, close, menu, search, share, a link arrow. Add a word when the icon could be misread.
- The text's size and color: `text` or `text-secondary`; white on crimson and ink. Never crimson on its own, never filled.
- One icon, one meaning. Never in a headline, as a bullet or as decoration. The Bookmark and Hudhud are never icons. No emoji.
