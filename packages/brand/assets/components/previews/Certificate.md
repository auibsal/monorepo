# Certificate

One certificate component for the only two the Society gives: finishing Qalam, and the Mutanabbi Prize (each category). A4 landscape; on screen it is the same page, printed or saved as PDF from the browser.

**Markup:** `<article class="sal-cert" data-theme="light">` with `.sal-cert__frame` holding the lockup and `h1.sal-cert__title`; `.sal-cert__body` ("This is to record that", `p.sal-cert__name` on a rule, one or two sentences); `.sal-cert__sigs` (the signature lines); and `.sal-cert__foot` (the rosette, `.sal-cert__code` with the check address, and the QR).

**Rules**
- Every certificate carries its verification code and a QR to its check page (auibsal.org/verify/<code>). A Qalam student's check page shows only the first name, last initial, school and year.
- Qalam: signed by the Qalam lead and the Editor-in-Chief. The Mutanabbi Prize: the Editor-in-Chief and the President.
- No other certificates: service is a letter (F-05), honorary membership an invitation (F-34).
- In code: `Certificate` from `@repo/brand/components/sal/certificate`.
