# Carousel

An Instagram carousel: up to ten 1080 × 1350 slides that read as one piece. Use it for anything with steps, a list or a story in parts: how to submit, an event's lineup, a reading list, a recap.

**Slides**
1. **Cover:** a `SocialPost` (lockup, headline, one sentence, date or link, @auibsal). It is the only slide with the logo.
2. **Inside slides:** `<div class="sal-post sal-post--{ground}">` with `.sal-post__frame` containing `p.sal-post__num` ("01", "02"…, Light, in the accent), `h3.sal-post__title` (a short title with a full stop, one `<i>` word at most) and `p.sal-post__body` (one to three lines). A slide may be a photo instead.
3. **End slide:** `<div class="sal-post sal-post--{ground} sal-post--end">` with only `img.sal-post__wordmark`: the English wordmark for an English carousel, the Arabic wordmark for an Arabic one. No symbol, no text, no handle.

**Rules**
- One language and one ground for the whole carousel. Arabic carousels add `dir="rtl" lang="ar"` to every slide and use the Arabic lockup and wordmark.
- Wordmark files: `sal-wordmark-en.svg` / `sal-wordmark-ar.svg` on white; the `-reversed` files on crimson and ink.
- No labels above titles, no "swipe" prompts, no slide counters: Instagram shows the dots.
- Six slides or fewer is best; ten is the limit.
