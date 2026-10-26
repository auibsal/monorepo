# The IDEA Pass

The IDEA Pass is the only way to sign in to auibsal.org (owner, Oct 26,
2026), and the place where students prove their AUIB address. SAL keeps
everything else: accounts, membership, roles, the card, Qirtas, the
records. Only who the person is crosses over from the Pass.

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
   (migration `20261026000000_idea_pass.sql`). It looks, in order, for:
   - the account already linked to this Pass;
   - the account whose sign-in address is the AUIB address the Pass has
     checked (every AUIB member signs in with that address);
   - the account under the Pass's own verified address.

   The first match is linked (`access.pass_links`, one Pass per account,
   one account per Pass).
4. The route then answers a one-time token
   (`auth.admin.generateLink`, type magiclink, nothing emailed), and the
   browser exchanges it for an ordinary SAL session (`verifyOtp`). From
   there everything is as before: RLS, roles, and the officers' own second
   step (their authenticator app, `aal2`) are unchanged. The Pass is a first
   step only.
5. **No account found:**
   - **Create my account** makes one (`createWithPass`). Its address is the
     AUIB one the Pass checked, which makes a member at once. Otherwise it
     is the Pass's verified address, and the Council confirms that account
     as before. Setup asks for the rest.
   - **I already have an account under another address** shows the old
     sign-in once. Afterwards `POST /api/pass/link` links that account, so
     every later sign-in goes through the Pass.
6. **Students who joined with another address** move to their AUIB address
   the first time the Pass vouches for it. The database's own trigger then
   makes them a member, as if they had signed up with it.

## What the Pass must provide

- OpenID Connect discovery at `<issuer>/.well-known/openid-configuration`,
  authorization code with PKCE (S256), a signed id_token and a JWKS.
- A confidential client for SAL with the redirect URIs
  `https://auibsal.org/auth/pass`, `https://auibsal.org/ar/auth/pass`, and
  for development `http://localhost:3000/auth/pass` and
  `http://localhost:3000/ar/auth/pass`.
- Scopes `openid email profile student`.
- Claims SAL reads:
  - `sub`, stable and never reused;
  - `email` and `email_verified`;
  - `given_name`, `family_name` and `locale`, all optional;
  - the student claim:
    `"students": [{ "institution": "auib", "email": "x@auib.edu.iq", "verified_at": "<ISO time>" }]`,
    present only after the person proved the address with a code sent to
    it.

  A verified `email` that is itself an AUIB address counts the same.

## Turning it on

1. At The IDEA Pass, register SAL as above and copy the client id and
   secret.
2. In Vercel → **auibsal** → **Settings** → **Environment Variables**
   (Production), set the following, then redeploy:

   | Variable | Value |
   | --- | --- |
   | `NEXT_PUBLIC_PASS_ISSUER` | the Pass's issuer URL |
   | `NEXT_PUBLIC_PASS_CLIENT_ID` | SAL's client id |
   | `PASS_CLIENT_SECRET` | SAL's client secret (server only) |

   Until all three are set, the old email sign-in stays.
3. In Supabase → **Authentication** → **Sign In / Providers**, turn off
   **Allow new users to sign up**. SAL still makes accounts itself through
   the API (the admin API isn't affected). Keep the email provider on: the
   one-time sign-in token and the linking step use it.
4. Check:
   - sign in as an AUIB member and as a member outside AUIB;
   - sign in as an officer, and the authenticator code is still asked;
   - start with a new Pass and press **Create my account**.

## Limits

- A member can still request an emailed code for their own address
  directly from Supabase's API. That reaches only their own account, but
  it isn't the Pass. Turning the email provider off would also stop the
  linking step.
- Accounts made through the Pass outside AUIB reach the Council without
  the short statement the old sign-up asked for.
