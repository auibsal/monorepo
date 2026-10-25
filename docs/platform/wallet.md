# Google Wallet: the membership card as a pass

Members add their card to Google Wallet from the card on `/account`
("Add to Google Wallet"). The pass shows the card's name, number and
member-since date, and the same live QR as the website card: Google
computes the 8-digit code from the card's secret every 30 seconds (RFC
6238 TOTP, SHA-1), exactly as the website does, so the door and the check
page accept either.

## How it works

- `POST /api/wallet/google` (`app/api/wallet/google/route.ts`) reads the
  member's card as the member (`membership.my_card`, under their token) and
  returns a "Save to Google Wallet" link: a JWT signed with the service
  account key that carries the pass class (`<issuer>.sal-membership`) and
  the member's object (`<issuer>.card-<code>`). `lib/api/wallet.ts` builds it.
- Resetting the card code (Card security on `/account`) gives a new code
  and secret; the old pass stops checking in. The member adds the card again.

## Setting it up (once)

1. Google Pay & Wallet Console (pay.google.com/business/console): create the
   issuer for the Society and note the issuer id. Ask for publishing access
   for the Generic pass when ready (until then only test accounts can save).
2. Google Cloud: enable the Google Wallet API; create a service account and
   a JSON key. In the Wallet Console, add the service account's email as a
   user of the issuer.
3. Vercel → auibsal → Settings → Environment Variables (Production and
   Preview): `GOOGLE_WALLET_ISSUER_ID`, `GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL`,
   `GOOGLE_WALLET_PRIVATE_KEY` (the key's `private_key`, with `\n` for line
   breaks). Redeploy.

Until all three are set, the button says the Wallet pass isn't available
yet. Apple Wallet is not offered (owner, 2026-10-25).
