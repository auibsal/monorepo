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
- The pass also carries two links: "Your account" (`/account`) and
  "What's on" (`/events`), in the member's language.
- The route records the pass in `membership.wallet_passes` (by card code).
  If the member already holds it, the route brings it up to date through
  the Wallet API (name, tier, active again after a renewal) before
  returning the link, which only creates passes.
- Google tells `POST /api/wallet/google/callback` when a member saves or
  removes the pass. The message is signed by Google (Google Pay
  `ECv2SigningOnly`: sender `GooglePayPasses`, recipient our issuer id, keys
  from pay.google.com/gp/m/issuer/keys) and checked in
  `lib/api/wallet-callback.ts`; anything else is refused. A saved pass
  shows as "In your Google Wallet" on the card, and the Diwan's member
  insights count them.
- Retiring passes: resetting the card code (Card security on `/account`),
  the end of a membership (or of the account's verification) and deleting
  the account queue `membership.wallet_expire`; the outbox marks each pass
  expired in Google Wallet. The member adds the new card again.
- No NFC (Smart Tap) and no redemption issuers: the door scans the QR with
  an officer's phone, and the code is already live.

## Setting it up (once)

1. Google Pay & Wallet Console (pay.google.com/business/console): create the
   issuer for the Society and note the issuer id. Create a Generic class
   with the class id `sal-membership`, "Multiple devices and holders"
   `ONE_USER_ALL_DEVICES`, no modules, Smart Tap off, no redemption
   issuers, callback URL `https://auibsal.org/api/wallet/google/callback`
   and no update request URL. (If the class doesn't exist, the first saved
   pass creates it with these settings.) Add test accounts; ask for
   publishing access for the Generic pass when a test pass looks right
   (until then only test accounts can save).
2. Google Cloud: enable the Google Wallet API; create a service account and
   a JSON key. In the Wallet Console, add the service account's email as a
   user of the issuer (Register for access to the REST API). The same
   account updates and expires passes.
3. Vercel → auibsal → Settings → Environment Variables (Production and
   Preview): `GOOGLE_WALLET_ISSUER_ID`, `GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL`,
   `GOOGLE_WALLET_PRIVATE_KEY` (the key's `private_key`, with `\n` for line
   breaks). Redeploy.

Until all three are set, the button says the Wallet pass isn't available
yet. Apple Wallet is not offered (owner, 2026-10-25).
