# SocialPost

The 1080 × 1350 Instagram post. It scales to any container width: every size is in units of 1/1080 of the post's width, so a 300 px preview and a 1080 px export match.

**One language per post.** English posts are in English only, with the English lockup. Arabic posts are in Arabic only: add `dir="rtl" lang="ar"` to `.sal-post` and use the Arabic lockup. The layout mirrors itself. Post the two as separate posts, never one post with both.

**Markup:** `<div class="sal-post sal-post--crimson|white|ink">` (add `sal-post--photo` for a photo post) wrapping `.sal-post__frame`, which contains:
- `img.sal-post__photo` (photo posts only): the picture, cropped to 1080 × 820.
- `img.sal-post__lockup`: `sal-lockup-horizontal.svg` or `sal-lockup-horizontal-ar.svg` on white; the `-reversed` files on crimson and ink.
- `h2.sal-post__headline`: two to five words with a full stop, Light, one word in `<i>` at most. In Arabic, Ubuntu Arabic Regular; the `<i>` word changes color only.
- `p.sal-post__lede`: one sentence (optional on photo posts).
- `p.sal-post__meta`: one or two `<span>` lines: the date and place, the link, `@auibsal`. In Arabic posts, wrap Latin runs (`@auibsal`, links) in `<bdi dir="ltr">`.

**Rules**
- Grounds by purpose: crimson for calls and moments, white for events, ink for words worth keeping and recruiting. Photo posts sit on ink or white.
- Never set type over a photograph: the photo sits above, the words on a solid panel below. Use the Society's own photos; the preview's book photo is a stand-in (Liam Quin, fromoldbooks.org).
- No label or kicker above the headline. The headline starts the post.
- One idea per post. Every post carries the date or the link, and @auibsal.
- Instagram crops the grid to 3:4: keep words at least 80 px from the left and right edges, as the template does.
- Western digits in both languages: "3 كانون الأول".
- To export, render `.sal-post` at exactly 1080 px wide.
