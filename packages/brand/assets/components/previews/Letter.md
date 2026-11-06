# Letter

One letter template for every letter the Society sends (F-03, F-05, F-30, F-32, F-33, F-34, F-42), in American business-letter form. A4 portrait; on screen it is the same page, printed or saved as PDF from the browser.

**Markup:** `<article class="sal-letter" data-theme="light">` with `.sal-letter__head` (the lockup and `p.sal-letter__date`), `.sal-letter__text` (the recipient as an `address`, `p.sal-letter__subject`, the greeting, the paragraphs, the closing and `.sal-letter__signer`), and `.sal-letter__foot` (the form's code and hello@auibsal.org · auibsal.org, and `.sal-letter__verify` with the verification code and `.sal-letter__qr` where the letter has one).

**Rules**
- The lockup in the letter's language; one language per letter.
- The date with no weekday: "November 7, 2026" (Arabic: 7 تشرين الثاني 2026).
- A plain subject line ("Service letter"), never a label above it.
- The greeting takes a colon ("Dear Mr. Najm:"); a comma only in a personal letter to a member ("Dear Lina,"). Arabic letters use the formal "al-Sayyid … al-Muhtaram" greeting or the personal "Azizati …", each ending in the Arabic comma.
- The closing "Sincerely," (Arabic: ma'a khalis al-tahiya), then the signer by name and seat; the letter ends there, never "Thank you." as a page.
- The foot has the form code and, beside it, room for a verification code and QR to auibsal.org/verify/<code>; service letters (F-05) use it.
- In code: `Letter` from `@repo/brand/components/sal/letter` (`verify` for the code and QR).
