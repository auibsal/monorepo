# Highlights

The six Instagram highlights on @auibsal, always in this order: What's on, Qirtas, Next Stop, Programs, Join, Get involved.

**Covers.** Plain crimson with the highlight's icon above its name, both in white (the name in Ubuntu Light), centered. No Bookmark, no other text. Icons: What's on `calendar`, Qirtas `newspaper`, Next Stop `bus`, Programs `layout-grid`, Join `user-plus`, Get involved `hand-helping`. Export each at 1080 × 1080 and keep the name inside the middle 760 px, so the circle crop never touches it. Instagram shows the name again under the circle; the two always match.

**Markup:** `<div class="sal-highlight">` wrapping `.sal-highlight__frame`, an inline `svg.sal-highlight__icon` and `p.sal-highlight__name`. Add `sal-highlight--round` to preview the circle crop.

**Banners.** Every highlight opens with a 1080 × 1920 story banner on white:
- `img.sal-banner__wordmark`: the English wordmark alone at the top (`sal-wordmark-en.svg`). No Bookmark.
- `h2.sal-banner__headline`: a Light headline with one italic crimson word ("Come *in.*").
- `p.sal-banner__line`: one short line under it.
- `ul.sal-banner__list`: three to six items split by thin rules; an optional `<span>` holds a date or a short note at the end of the line.
- `p.sal-banner__link`: the link at the bottom, as words, after the `arrow-up-right` icon (auibsal.org/join). Add Instagram's link sticker over it when posting.

**Rules**
- Keep every word 250 px clear of the top and 340 px clear of the bottom.
- English only: the account is in English. Arabic stories are posted separately.
- Update the What's on banner every term, and the Qirtas banner each Edition.
