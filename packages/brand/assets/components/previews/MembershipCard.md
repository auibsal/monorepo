# MembershipCard

The membership card: one component for the member's account, Google Wallet (the same fields) and a printed card on request. Never an "ID card": the AUIB ID is the university's.

**Markup:** `<article class="sal-card" data-theme="light">` with `.sal-card__main` (the lockup `img.sal-card__lockup`, `p.sal-card__name`, and `dl.sal-card__fields`: No., Class, Member since) and the live QR, `.sal-card__qr`, at the end.

**What it holds:** the name as in the Register, the member number, the class (Member, Associate Member, Honorary Member), member since, and the live QR (`/verify/member/<code>?t=<digits>`, refreshed every 30 seconds). On the account page the rosette drawn from the card number sits behind it.

**Rules**
- Always on white, in the card's 85.6 × 54 mm proportion. Printed on request only, at 100% from the same page.
- No photo, no address, no student ID number.
- In code: `MembershipCard` from `@repo/brand/components/sal/membership-card`.
