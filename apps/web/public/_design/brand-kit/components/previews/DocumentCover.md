# DocumentCover

The first page of every Society document: the lockup and code at the top, a large title, one sentence, the author, and a hairline footer with the date and status. Nothing decorative: no ribbon, no band, no label above the title.

**One language per document.** An English document uses the English lockup and English only. The Arabic edition is a separate document: `dir="rtl" lang="ar"` on the page and the Arabic lockup (`sal-lockup-horizontal-ar.svg`). The code stays in Latin letters in both.

**Markup:** `<article class="sal-page sal-cover" data-theme="light" lang="en">` (or `dir="rtl" lang="ar"`), containing:
- `.sal-cover__top`, holding `img.sal-cover__lockup` (78 px tall) and `.sal-cover__code` with one `.sal-code` line.
- `h1.sal-cover__title`: one or two words a line, at most two lines. Light, in ink (Ubuntu Arabic Regular in Arabic).
- `p.sal-cover__subtitle`: one sentence.
- `p.sal-cover__prepared` with `span.sal-cover__prepared-name`: "Prepared by", the name, the role.
- `footer.sal-cover__foot`: the date at the start, the status at the end ("Draft 2 · for ratification", "Ratified").

**What you provide:** the language, the code, the title, the sentence, the author's name and role, the date and the status.

**Rules**
- A cover is always light; the light lockup never sits on ink.
- A4 at 96 dpi (794 × 1123 px), side margins `page-margin`. Render at A4 with no browser margins to print.
- No document footer on the cover. Crimson appears only in the logo.
