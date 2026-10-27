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
- Scopes `openid email profile student student_email`. SAL reads:
  - `sub`, SAL's own id for the person (each partner gets its own);
  - `email`, `email_verified`;
  - `given_name`, `family_name`, `locale`;
  - `student`: `{ "verified": true, "university": "auib", "until":
    "YYYY-MM-DD" }` or `{ "verified": false }`;
  - `student_email`, `student_email_verified`: the verified university
    address, used only to find the account a member made with it (an
    `@auib.edu.iq` address only).
- `student_email` is a sensitive answer: it works while SAL's app is in
  testing, and once live The IDEA reviews it before its consent screen asks
  for it. People can untick any item; whatever isn't shared, SAL does
  without (the linking step finds the account instead).
- People see a consent screen each time, and can disconnect SAL in Pass →
  Settings → Connected sites.

## Turning it on

SAL registers itself; The IDEA sends no credentials.

1. In The IDEA Business (https://spark.theideaiq.com), create SAL's company
   (whoever creates it becomes its owner and can invite the developer as an
   admin), then open **Developers**.
2. Verify auibsal.org: a DNS TXT record `_theidea-pass.auibsal.org` with
   the value `theidea-pass-verification=<the token shown>` (in Cloudflare →
   DNS).
3. Register the app with the four return addresses above and
   `client_secret_basic`. The client id and secret are shown once: put them
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
6. In Supabase → **Authentication** → **Sign In / Providers**, turn off
   **Allow new users to sign up**. SAL still makes accounts itself through
   the API (the admin API isn't affected). Keep the email provider on: the
   one-time sign-in token and the linking step use it.
7. Check:
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
