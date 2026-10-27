# The IDEA Pass

The IDEA Pass is the only way to sign in to auibsal.org (owner, Oct 26,
2026), and the place where students prove they study at AUIB. SAL keeps
everything else: accounts, membership, roles, Qirtas, the records. Only
who the person is crosses over from the Pass: SAL's own id for them, their
verified address, a name, a language, a yes or no for student status and,
if they allow it, their verified AUIB address, used only to find the
account they made with it.

## How it works

1. **Sign in** (`/sign-in`, `/sign-up`, `/forgot-password`) shows one
   button, **Continue with The IDEA Pass**. The browser makes a PKCE
   verifier, a state and a nonce, and `POST /api/pass/start` answers the
   Pass's sign-in address.
2. The Pass sends the person back to `/auth/pass` (or `/ar/auth/pass`).
   `POST /api/pass/sign-in` exchanges the code with SAL's client secret and
   checks the id_token. It must be signed with the Pass's keys, be issued by
   the Pass for SAL, be unexpired, and carry the nonce
   (`lib/api/pass.ts`).
3. The SAL account is found by `access.pass_account()`
   (migration `20261026000000_idea_pass.sql`): the account already linked
   to this Pass, else the account whose sign-in address is the Pass's
   verified address, else the account whose sign-in address is the
   verified AUIB address the Pass shared (`student_email`, which people may
   untick). The first match is linked (`access.pass_links`, one Pass per
   account, one account per Pass).
4. The student status the Pass gave (`student_until` on the link) is
   recorded at every sign-in. A current one makes the person a member, as a
   confirmed AUIB address does, and settles a waiting verification request.
   Ballots accept a confirmed AUIB address or a current student status
   (`private.is_auib_member`).
5. The route then answers a one-time token (`auth.admin.generateLink`,
   type magiclink, nothing emailed), and the browser exchanges it for an
   ordinary SAL session (`verifyOtp`). From there everything is as before:
   RLS, roles, and the officers' own second step (their authenticator app,
   `aal2`) are unchanged. The Pass is a first step only.
6. **No account found:**
   - **Create my account** makes one under the Pass's verified address
     (`createWithPass`). A student status makes a member at once; anyone
     else is confirmed by the Council, as before. Setup asks for the rest.
   - **I already have an account under another address** shows the old
     sign-in once. Afterwards `POST /api/pass/link` links that account, so
     every later sign-in goes through the Pass. Members who joined with
     their AUIB address, use another one on the Pass and don't share the
     AUIB address with SAL do this once.

## What the Pass provides

The IDEA's own OpenID Connect provider, live in production:

- Issuer `https://api.theideaiq.com/oidc`; discovery at
  `https://api.theideaiq.com/oidc/.well-known/openid-configuration`.
  Authorization code with PKCE (S256, required), `state`, `nonce` and
  `ui_locales=ar|en`. The id_token is signed with ES256; SAL authenticates
  with `client_secret_basic`.
- Return addresses registered for SAL: `https://auibsal.org/auth/pass`,
  `https://auibsal.org/ar/auth/pass`, `http://localhost:3000/auth/pass` and
  `http://localhost:3000/ar/auth/pass`.
- Scopes `openid email profile student student_email card`. SAL reads:
  - `sub`, SAL's own id for the person (each partner gets its own);
  - `email`, `email_verified`;
  - `given_name`, `family_name`, `locale`;
  - `student`: `{ "verified": true, "university": "auib", "until":
    "YYYY-MM-DD" }` or `{ "verified": false }`;
  - `student_email`, `student_email_verified`: the verified university
    address, used only to find the account a member made with it (an
    `@auib.edu.iq` address only);
  - `card`: the person's Pass card as an SVG (`GET /oidc/card` with the
    sign-in's access token, `?lang=ar` for Arabic), read at each sign-in.
- `student_email` is a sensitive answer: it works while SAL's app is in
  testing, and once live The IDEA reviews it before its consent screen asks
  for it. People can untick any item; whatever isn't shared, SAL does
  without (the linking step finds the account instead).
- People see a consent screen each time, and can disconnect SAL in Pass →
  Settings → Connected sites.

## The card

The IDEA Pass card replaces SAL's membership card (owner, Oct 27, 2026),
and the member perks go: they come with the Pass. It all follows the same
switch as the sign-in, so SAL's card stays until the Pass is on.

- **Today and the welcome screen** show the Pass card picture The IDEA drew
  (an image, no QR; `access.pass_links.card_svg_en`/`_ar`), a link to the
  live card at theideaiq.com/pass, and the member's standing (since, tier,
  vote). No perks, no Google Wallet link, no code reset.
- **The live card on SAL's pages.** Once The IDEA allows it for SAL's app
  (Developers → "Embed the live card", reviewed by The IDEA) and
  `NEXT_PUBLIC_PASS_EMBED=true` is set, Today and the welcome screen frame
  The IDEA's own embed page in place of the picture:
  `https://theideaiq.com/pass/embed?client_id=…` (`/ar/pass/embed` in
  Arabic). It is The IDEA's page, signed in to The IDEA, so the live code
  never reaches SAL; The IDEA sends `frame-ancestors` built from SAL's
  verified domains, and SAL's policy allows `frame-src
  https://theideaiq.com` only while the switch is on. The embed posts
  `{ type: "idea-pass-card", height }` to auibsal.org and SAL sizes the
  frame to it (messages from anywhere else are ignored). The pink card
  looks the same in either theme; the words around it follow the browser's
  setting. "Open your live card" stays as the fallback. The holder's Pass
  settings show "Shown on AUIB Society of Arts and Letters".
- **At the door and on the Typewriter Tour** the officer scans the member's
  Pass. Its QR holds `IDEA:<member number>:<six digits>`, and the digits
  change every 30 seconds.
  1. The browser sends the code to `POST /api/pass/card`. Only someone who
     may scan (`access.can_scan_passes()`: door staff by role or for an
     event, or whoever runs the Tour) gets an answer.
  2. The route asks The IDEA (`POST /oidc/card/check`, with SAL's client
     secret). A live card answers SAL's id for the holder. A Pass that has
     never signed in to SAL answers none, and the officer is told so.
  3. The route records the scan (`access.pass_scans`: whose card, who
     scanned). The officer's own session then spends it within two minutes
     (`events.check_in_pass`, `programmes.record_six_words_pass`,
     `programmes.attach_six_words_pass`), where the permissions are checked
     as before.
  Each check shows in the holder's Pass settings, and The IDEA stops
  answering after 30 failed checks in 10 minutes; the officer then looks
  the member up by name. While the app is in testing, only the cards of
  members of SAL's company in The IDEA Business check out.
- **SAL's own card** is retired: scanning one says so, its check page
  (`/verify/member/...`) says members now show their IDEA Pass, and
  `/api/wallet/google` answers 410. Signing in with the Pass (or linking
  it) expires the member's Google Wallet pass for SAL's card.
- **Partners → Member offers** leaves the Diwan.
- Certificates, `/verify/<code>` for certificates, the partner register and
  member numbers stay. SAL's card tables (`membership.cards`,
  `membership.wallet_passes`, `governance.member_offers`) are removed in a
  later step, once the Pass has been on for a while.

## Turning it on

SAL registers itself; The IDEA sends no credentials.

1. In The IDEA Business (https://spark.theideaiq.com), create SAL's company
   (whoever creates it becomes its owner and can invite the developer as an
   admin), then open **Developers**.
2. Verify auibsal.org: a DNS TXT record `_theidea-pass.auibsal.org` with
   the value `theidea-pass-verification=<the token shown>` (in Cloudflare →
   DNS).
3. Register the app with the four return addresses above and
   `client_secret_basic`. Under **What it asks**, tick exactly Name and
   picture, Email, Verified student, University email and The Pass card:
   SAL asks for those five and nothing else. The client id and secret are shown once: put them
   straight into Vercel, never in a message. After **New secret**, the old
   one keeps working for 24 hours.
4. In Vercel → **auibsal** → **Settings** → **Environment Variables**
   (Production), set the following, then redeploy:

   | Variable | Value |
   | --- | --- |
   | `NEXT_PUBLIC_PASS_ISSUER` | `https://api.theideaiq.com/oidc` |
   | `NEXT_PUBLIC_PASS_CLIENT_ID` | SAL's client id |
   | `PASS_CLIENT_SECRET` | SAL's client secret (server only) |

   Until all three are set, the old email sign-in stays.
5. The app starts in testing: only members of SAL's company in The IDEA
   Business can sign in. Add the officers there and run the checks below,
   then take the app live in Developers. Until it is live, nobody else can
   sign in, so set the variables only once it is (or test on a preview
   deployment).
6. For the live card on SAL's pages: in Developers, turn on **Embed the
   live card** (it works in testing; The IDEA reviews it before live).
   Once it is approved, set `NEXT_PUBLIC_PASS_EMBED` to `true` in Vercel
   and redeploy. Until then the pages show the card's picture.
7. In Supabase → **Authentication** → **Sign In / Providers**, turn off
   **Allow new users to sign up**. SAL still makes accounts itself through
   the API (the admin API isn't affected). Keep the email provider on: the
   one-time sign-in token and the linking step use it.
8. Check:
   - sign in as an AUIB member whose Pass uses their AUIB address, as one
     who shares their AUIB address on the consent screen, and as one who
     unticks it (the linking step);
   - sign in as a member outside AUIB;
   - sign in as an officer, and the authenticator code is still asked;
   - start with a new Pass and press **Create my account**.

## Limits

- A member can still request an emailed code for their own address
  directly from Supabase's API. That reaches only their own account, but
  it isn't the Pass. Turning the email provider off would also stop the
  linking step.
- Accounts made through the Pass outside AUIB reach the Council without
  the short statement the old sign-up asked for.
