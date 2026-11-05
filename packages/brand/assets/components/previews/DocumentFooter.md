# DocumentFooter

The running footer on every document page except the cover: a hairline, then the code and short title at left and "n / total" at right, in `ash`.

**Markup:** `<footer class="sal-footer">` with `span.sal-footer__doc` (Ubuntu Mono) and `span.sal-footer__page`. Inside a `.sal-page`, it pins itself to the bottom margin.

**What you provide:** the document code, the short title and the page numbers.

**Rules**
- Spaced slash, no "Page": "3 / 14".
- Leave it off the cover.
