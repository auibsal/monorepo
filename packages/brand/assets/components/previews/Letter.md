# Letter

One letter template for every letter the Society sends (F-03, F-05, F-30, F-32, F-33, F-34, F-42). A4 portrait; on screen it is the same page, printed or saved as PDF from the browser.

**Markup:** `<article class="sal-letter" data-theme="light">` with `.sal-letter__head` (the lockup and `p.sal-letter__date`), `.sal-letter__text` (the recipient as an `address`, `p.sal-letter__subject`, the greeting, the paragraphs, the closing and `.sal-letter__signer`), and `.sal-letter__foot` (the form's code and hello@auibsal.org · auibsal.org).

**Rules**
- The lockup in the letter's language; one language per letter.
- A plain subject line ("Service letter"), never a label above it.
- The signer by name and seat; the letter ends with the closing and signer, never "Thank you." as a page.
- In code: `Letter` from `@repo/brand/components/sal/letter`.
