# SAL platform — progress

Working log for the AUIB Society of Arts and Letters platform (auibsal.org).
Every session starts here and continues from the first unticked item. The
brief is `sal-platform-claude-code-prompt.md` (uploaded at the start of the
first session); section numbers (§) refer to it.

Branch: `claude/new-session-qosn60`.

## Blocked — needed from the user

- [ ] **The IDEA Pass (2026-10-26), the only way to sign in:** the SAL side
      is built and off until three variables are set
      (`docs/platform/idea-pass.md`). The IDEA's provider is in
      theideaiq/monorepo PR #1013 (issuer `https://api.theideaiq.com/oidc`).
      Once it is live, The IDEA registers SAL and gives you the client id and
      secret privately. Then set `NEXT_PUBLIC_PASS_ISSUER`,
      `NEXT_PUBLIC_PASS_CLIENT_ID` and `PASS_CLIENT_SECRET` in Vercel and
      redeploy, and in Supabase turn off **Allow new users to sign up**.
      Record the Council's decision and the conflicts-register entry, and
      amend the privacy policy to name The IDEA Pass (adopted text isn't
      edited in place).
- [ ] **Program sessions (2026-10-25):** programs now live in What's on
      (`/events/<program>`; `/programs` is gone, no redirects). The calendar
      fills only once each program has a repeat rule: in the Diwan,
      Programs → Sessions, set the first date, time, place, way in and how
      often (the Evenings take turns: every four weeks each), save, then
      "Add the sessions" up to the term's end. Single dates are edited or
      canceled in Events.
- [ ] **Platform policy text (2026-10-25):** the adopted platform policy on
      photo removal still names `auibsal.org/programs/side-quest/care`;
      Next Stop's promise is now at `/events/next-stop/care`. Adopted text
      isn't edited by the platform: amend it when the Council next adopts.
- [ ] **Recovery codes (2026-10-25):** every officer whose role needs
      two-step sign-in makes a set from the Diwan's overview and keeps it
      away from their phone.

- [x] **Sign-in and email (2026-10-25), done by the owner (Oct 25):** members report the
      Cloudflare check spinning on sign-in, and no Society sign-in or
      confirmation email has gone out since Oct 21. The site now says when
      the check fails or stalls (with "Try again" and the error code), and
      every sign-in and confirmation email carries a code as well as a link.
      In the dashboards (steps in `docs/platform/email.md`):
      1. **Supabase → Authentication → Emails → SMTP:** a Resend key from the
         account where `auibsal.org` is verified now (added again on Oct 24);
         host `smtp.resend.com`, port 465, user `resend`, sender
         `hello@auibsal.org`.
      2. **Supabase → Authentication → Emails:** paste all eight templates
         and subjects from `packages/database/supabase/templates` (the last
         confirmation email sent still linked to `nexus.auibsal.org`, which
         no longer exists) and turn on the four security notifications.
      3. **Supabase → URL Configuration:** Site URL `https://auibsal.org`,
         Redirect URLs `https://auibsal.org/**`. **Rate limits:** emails per
         hour 60 or more.
      4. **Cloudflare → Turnstile:** the widget's hostnames include
         `auibsal.org` (and `www.auibsal.org`); its secret is the one in
         Supabase → Attack Protection. **Cloudflare → Security:** no
         full-page challenge on `/sign-in`, `/sign-up`, `/forgot-password`,
         `/auth/*`, `/api/*`.
      5. **Resend:** the free plan's 100 a day is shared with another
         project on the same account; give the Society its own account or a
         paid plan before the member list passes about 60.
      6. **DNS (optional):** `_dmarc.auibsal.org` could use `aspf=r`; mail
         passes on DKIM today, relaxed SPF alignment adds a second pass.
- [ ] **Google Wallet (2026-10-25):** set up and working (owner): the
      issuer, the Generic class `sal-membership` with the callback, the
      service account `membership@auibsal.iam.gserviceaccount.com` and the
      three Vercel variables; a test pass saved and the card says "In your
      Google Wallet". Left: **Request publishing access** in the Wallet
      console (until Google approves, only test accounts can save, and passes
      say "[TEST ONLY]").
- [x] **Membership at `/membership` (2026-10-25), done by the owner (Oct 25):** in BotFather, change the
      Telegram Login redirect URIs to `https://auibsal.org/membership/profile`
      and `https://auibsal.org/ar/membership/profile`, then run
      `POST /api/telegram/setup` once so Hudhud's /me reads "membership".

- [ ] **Member pages and the card (2026-10-25), for the owner:**
  - **Public pages for members:** a proposal, nothing built yet (see
    "Proposal: members' public pages" under Decisions). Say yes, no or
    which parts.
  - **Existing members** are asked for their first and last name in both
    languages the next time they open their account (the setup step).
  - **Native review** of the new Arabic below (card, sign-up names, More
    about you, the Qirtas writing page, the insights page).

- [ ] **The brand, Version 1 (2026-10-25), what is left for the owner:**
  - **Supabase → Authentication → Emails:** paste the four templates again
    (`packages/database/supabase/templates`): each now goes out in one
    language, Arabic when the member signed up in Arabic. The subjects stay
    in both languages (Supabase subjects can't choose a language).
  - **@BotFather `/setuserpic`** with `brand/mascot/hudhud-avatar.png` if
    the bot's picture isn't that file yet.
  - **The sticker set** is t.me/addstickers/auibsal (owner, Oct 24), so the
    handoff's `hudhud_sal` set is not needed.
  - **Redirects** from `/waraq` and `/nexus`: none (owner's decision, Oct 24).
  - **Native review** of the new Arabic listed under needs-native-review.

- [ ] **Brand (2026-10-24), what is left for the owner:**
  - **Supabase → Authentication → Emails:** paste the four updated
    templates and subjects from `packages/database/supabase/templates`
    (they now link to `/auth/confirm` on the site; the old `/diwan/auth/…`
    links forward meanwhile).
  - **Members' pages left the Diwan (2026-10-24), three settings to move:**
    BotFather → Bot Settings → Login Widget → OpenID Connect → Redirect
    URIs (now `/membership/profile`, see the Membership item above); Supabase →
    Authentication → OAuth Server → authorization path `/oauth/consent`;
    BetterStack's sign-in monitor → `https://auibsal.org/sign-in`.
  - **BotFather → Edit Bot → Description picture:**
    `brand/mascot/hudhud-description.png`, then *Connect the bot to
    Telegram* in the Diwan so the descriptions update.
  - **The Company's kind:** stored as `series`; say if you want a
    `company` kind.
  - **Published pieces keep their text** (the launch article, the
    crossword's NEXUS); the governance documents keep the old names until
    amended.
  - Done (owner, 2026-10-24): redirect URLs (`https://auibsal.org/**`),
    the Telegram login redirect URIs (`/diwan`, `/ar/diwan`), the bot's
    picture, the sticker set t.me/addstickers/auibsal (the bot reads it
    itself), and the native review of all Arabic. No redirects from
    `/waraq` or `/nexus` (owner's decision).

- [ ] **Environment variables on Vercel (2026-10-24):** the one project is
      `auibsal`. Set on 2026-10-24 (Production; secrets sensitive):
      `RESEND_TOKEN` (a new sending-only key for auibsal.org, "auibsal
      (Vercel, one app)"), `ARCJET_KEY` (site sal-api), `TELEGRAM_BOT_USERNAME`,
      `TELEGRAM_WEBHOOK_SECRET` (generated), and a new Web Push pair
      `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`. Left for the owner:
      | Variable | Where to get it | Without it |
      | --- | --- | --- |
      | `DATABASE_WEBHOOK_SECRET` | Set (checked 2026-10-25) | |
      | `CRON_SECRET` | Set (checked 2026-10-25) | |
      | `TELEGRAM_LOGIN_CLIENT_SECRET` | Set (checked 2026-10-25) | |
      If a Vault secret is missing, make one value with a password generator
      (64 letters and digits, no symbols) and save it in both places. Then
      delete `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_WEB_URL` and
      `NEXT_PUBLIC_API_URL` (nothing reads them), redeploy, and press Nexus →
      Settings → Telegram → *Connect the bot to Telegram* (it registers the
      new webhook secret). Keep `NEXT_PUBLIC_AUTH_COOKIE_DOMAIN`
      (`.auibsal.org`: the members' sessions carry it,
      `packages/auth/cookies.ts`). The Supabase integration's own variables
      are unused but harmless. Resend's click-tracking CNAME (`links`) fails
      verification; tracking is off, so it does not affect sending. Check
      `platform.api_url` in Supabase → Table Editor → core.settings reads
      `https://auibsal.org/api` (migration `20261024000600`).
- [ ] **After the one-app cutover (2026-10-24):** the owner removed the
      sal-nexus, sal-api and sal-design projects and their hosts and set up
      Supabase (Auth URLs, templates). Left: **Telegram:** BotFather → Login
      Widget → OpenID Connect: Redirect URIs
      `https://auibsal.org/nexus/profile` and
      `https://auibsal.org/ar/nexus/profile`. **BetterStack:** monitors on
      `auibsal.org`, `auibsal.org/nexus/sign-in` and
      `auibsal.org/api/health`. **Sentry:** the sal-nexus and sal-api
      projects can go. **Cloudflare:** the configuration rule for the API
      matches "URI Path starts with /api/" (`docs/platform/analytics.md`).

- [ ] **Telegram bot, Hudhud (2026-10-22; in the API routes since 2026-10-23):**
      live as @auibsal_bot since 2026-10-23 (runbook
      `docs/platform/telegram.md`). Left: (1) Telegram's login for linking
      (2026-10-23): in BotFather → Login Widget → OpenID Connect add the
      Redirect URIs `https://auibsal.org/nexus/profile` and
      `https://auibsal.org/ar/nexus/profile`, and put the Client Secret on
      the auibsal project as `TELEGRAM_LOGIN_CLIENT_SECRET` (Production, sensitive),
      then redeploy; (2) the BotFather settings in the runbook (Guest Mode
      and Guard on, Main App = the word game, Bot Management and Threaded
      Mode off, admin rights, privacy policy URL, description picture
      `brand/mascot/hudhud-welcome.png`), then *Connect again* in Settings →
      Telegram; (3) connect the group with a setup code and `/topic` in each
      topic, and in the group's own settings write the Welcome Message
      (TODO(content): the greeting and the group's rules, with the
      Acceptable Use Policy marked as a draft until adopted) and turn on
      Aggressive Anti-Spam. The privacy notice and SAL-PLT-04 should
      mention the Telegram link and what the bot keeps (TODO(content)).
- [ ] **Telegram leftovers in the database (2026-10-23):** Telegram now
      does welcomes, rules, moderation and the word game, so
      `core.telegram_word_plays`, `core.telegram_groups.join_policy`,
      `core.telegram_members.warnings` and `joined_at`, and the settings
      `telegram.rules_en`/`_ar` are unused. Dropping them deletes their
      data: waiting for the owner's go-ahead.
- [x] **Vercel variables to delete (2026-10-23):** `NEXT_PUBLIC_DOCS_URL`
      and `FLAGS_SECRET` are gone with the old projects (checked
      2026-10-24). The one app sends email, so `RESEND_TOKEN` and
      `RESEND_FROM` belong on it (see the first item).

- [ ] **Analytics (owner, 2026-10-15: GA4 and GTM through the Google tag
      gateway):** live since 2026-10-16 (GTM-PWRQNN7H, gateway at
      `/metrics`). Consent is the site's own card alone (2026-10-16). Done
      2026-10-17 (owner): Zaraz and its consent off in Cloudflare, the
      `NEXT_PUBLIC_ZARAZ_*` variables deleted from Vercel; Cloudflare's HSTS
      set to 12 months with includeSubDomains and preload (checked live:
      `max-age=31536000; includeSubDomains; preload`, nosniff on);
      `BACKUP_PASSPHRASE` being added to the GitHub production environment.
      Left: turn off Cloudflare Web Analytics' automatic setup, if still on
      (the CSP blocks its beacon).

- [ ] **Ads in Waraq (owner, 2026-10-16: Society and sponsor ads plus
      Google AdSense, none for signed-in visitors):** the code is in; Society
      and sponsor ads work as soon as officers write them (Nexus →
      Administration → Ads). AdSense stays off until you follow
      `docs/platform/ads.md`: apply at AdSense, block the sensitive categories
      the Policy Manual rules out (11.3), then set
      `NEXT_PUBLIC_ADSENSE_CLIENT` and `NEXT_PUBLIC_ADSENSE_SLOT` on the auibsal project (both set). The Council decides who
      receives AdSense payments and records it.

- [ ] **Platform policies (2026-10-17):** eleven drafts on auibsal.org/documents
      (SAL-PLT-01 to 11: terms of use, acceptable use, cookies, data retention,
      submissions and AI, advertising, accessibility, security, complaints,
      API terms, email). They apply the Policy Manual and AUIB's Student
      Engagement and Organizations, Student Conduct and Community Standards,
      and Student Rights and Responsibilities policies. The Council reviews
      and adopts them (record the date in Administration → Documents);
      Student Life may want to see them. TODO(content): retention periods for
      logs, error reports, email records and backups (SAL-PLT-04); known
      accessibility issues after a manual audit (SAL-PLT-07); Arabic text of
      all eleven.

- [x] **Old news table:** dropped (owner, 2026-10-17), migration
      `20261017000100_drop_news_posts`.

- [ ] **Waraq masthead (Notion: decide by Oct 22):** confirm the name (it is
      the `journal.name_*` setting, Waraq now). In Administration → Members
      give the roles: Editor-in-Chief, Managing Editor, Submissions Manager,
      News, Letters, Gallery and Video Editors (Ali Hayder is named Video
      Editor in Notion), Copy Chief, readers. Set Edition 1's launch time
      (Administration → Waraq → Editions) once Launch Night's hour is known.

- [ ] **Notion connection can read emails:** Notion → Settings → Connections →
  SAL Platform → Capabilities → allow "Read user information including email
  addresses". Without it the sync cannot tell who set Ready to publish, so it
  publishes nothing (`docs/platform/notion.md`).
- [ ] **Protect `main` (GitHub → Settings → Rules → New branch ruleset):** target
      `main`; require a pull request; require the checks "Lint, typecheck,
      test", "Build apps", "Database (migrations, RLS, integration)" and
      "End-to-end (Playwright + axe)"; block force pushes and deletion.
- [ ] **Email to hello@auibsal.org bounces (no MX record):** Cloudflare →
      auibsal.org → Email → Email Routing → enable, then route
      `hello@auibsal.org` to the inbox that should read it.
- [ ] **Turborepo remote cache for CI (optional, faster CI):** Vercel →
      Account Settings → Tokens → create one; GitHub → Settings → Secrets and
      variables → Actions: secret `TURBO_TOKEN`, variable `TURBO_TEAM` =
      `theideaiq`.
- [ ] **Zero-cost plans (owner, 2026-10-08):** nothing paid. Vercel moves
      back to Hobby when the owner chooses (Settings → Billing → Downgrade);
      everything else is already on a free plan. Resend Free sends 100 emails
      a day: the outbox now holds anything over the limit until it resets
      instead of dropping it.
- [x] **Passkeys (done by the owner, Oct 25):** Supabase → Authentication → Passkeys: on; Relying Party
      ID `auibsal.org` (never change it after members register passkeys);
      origins `https://auibsal.org`; display name `AUIB Society of
      Arts and Letters`. The Nexus shows the passkey button and the Profile
      card already; see `docs/platform/accounts.md`.
- [ ] **Partnerships (P11):** in Administration → Members, give the
      Director of Partnerships & Outreach role to whoever holds it (the VP
      covers it while vacant). For each partner already working with the
      Society (antiq_typewriter's member discount first), add it to
      Administration → Partners, draft its memorandum (F-26) and have the
      President sign it with the signed PDF: an offer reaches members only
      while a signed memorandum grants it. Role holders sign their
      Conflict of Interest Declaration (F-18) under Account → Declarations;
      the platform owner's own organizations (Baghdad College Foundation,
      The IDEA IQ, which hosts the Vercel team) belong on it, and whoever
      declares a conflict with a partner cannot sign its memorandum.
- [ ] **Recognition (B4):** the Faculty Advisor needs a Nexus account with
      the `faculty_advisor` role to countersign certificates (B4.5: signed
      by the President and the Faculty Advisor). Decide in Council whether
      volunteers (hours, not a term) get certificates; if yes, switch on
      `features.volunteer_certificates` in Administration → Settings.
      Approve the certificate wording for the kinds the Printables do not
      cover (Honorary Membership, volunteer, production, partner).
- [ ] **Backups:** add `BACKUP_PASSPHRASE` (a long random passphrase kept in
      your password manager) to the GitHub `production` environment. Then
      `.github/workflows/backup.yml` stores an encrypted dump every night
      for 30 days. Run it once from Actions to check it.
- [ ] **Leave Mintlify (owner, 2026-10-09):** `apps/docs` is gone. Ask me
      before each DNS change; the steps:
      1. Vercel → auibsal → Settings → Domains → add `docs.auibsal.org`, then
         in Cloudflare point the `docs` CNAME at Vercel instead of Mintlify.
         (The old-link redirects were removed on Oct 14, 2026: the owner
         wants no redirects, so old docs links no longer forward.)
      2. Delete the Mintlify deployment `theideaiq` (Mintlify dashboard), and
         the Liveblocks account.
- [x] ~~Design system behind our sign-in~~: the design system runs locally
      only since 2026-10-24 (`packages/storybook`); design.auibsal.org and
      its project are gone.
- [ ] **Co-editing on Supabase Realtime:** Dashboard → Realtime → Settings →
      turn off "Allow public access" (only private, checked channels).
- [ ] **Code security:** in GitHub Settings → Code security, turn on the
      dependency graph, secret scanning and push protection; then add the
      repository variable `DEPENDENCY_REVIEW` = `on` (Settings → Secrets and
      variables → Actions → Variables) so CI's dependency review runs.
- [ ] **sal-emails** has no app since PR #64: delete it in Vercel
      (Settings → Advanced → Delete Project).
- [ ] **Founding voters in the Constitution:** the first-100 rule departs
      from Constitution 3.3(b) and Bylaws B3.3. Add a transitional provision
      (for example "For the founding year, ending May 13, 2027, the first one
      hundred Members are Voting Members from the day they join") before the
      Constitution is adopted on Charter Day (October 13), or by amendment
      after it.
These stop parts of the work. Everything else continues around them.

- [x] **`brand/`** (2026-10-05): the design-system export (BRAND-BOOK.md
      from its README, tokens.json/css, Ubuntu Arabic, components, the 13 logo
      SVGs, the retired Key for reference) and the guide PDF
      (SAL-BRD-01).
- [x] **`docs-source/`** (2026-10-05): the six public founding documents
      (SAL-GOV-01, GOV-02, GOV-03, POL-01, STR-01, MEM-01). The repo is
      public, so the restricted ones are **not** committed: the Founding
      Proposal (Council only), Operations Playbook, Templates & Forms,
      Printables and the Operations Tracker go to the private `library`
      bucket through the Nexus library. **Still missing:** the Journal
      Submission Guidelines, Editorial Rubric, Masthead Handbook,
      Publication Agreement, Issue Playbook, the Charity (Second Chapter)
      Playbook and Operations Kit, and the Side Quest care rules — unless
      they are sections of the documents above (to check while converting).
- [x] Founder bootstrapped (global `president`, 2026-10-04).
- [x] Supabase project `auibsal.org` (`fghzahtzgelqnpwdhwjo`, eu-central-1):
      migrations applied, SAL schemas exposed, Auth site and redirect URLs
      set, email sign-up only.
- [x] Vercel team `theideaiq`: sal-web (auibsal.org, www), sal-nexus
      (nexus.auibsal.org), sal-api (api.auibsal.org), functions in fra1.
- [x] Resend set up by the owner (2026-10-05); verify RESEND_* on sal-api and
      Supabase SMTP with a real sign-up.
- [x] sal-web holds only public values and `REVALIDATE_SECRET` (checked
      2026-10-07); the server secrets the integration copied are gone.
- [x] Semesters (owner, 2026-10-06): Fall 2026 Sep 6 – Dec 17, 2026; Spring
      2027 Jan 24 – May 13, 2027, entered in production. Exam weeks: still
      to come.
- [ ] **Supabase Auth email (dashboard only):** Authentication → SMTP:
      `smtp.resend.com`, port 465, user `resend`, password a Resend API key
      (sending access, auibsal.org), sender `hello@auibsal.org`, name "AUIB
      Society of Arts and Letters". Authentication → Email Templates: paste
      the four files in `packages/database/supabase/templates` with the
      subjects in `subjects.txt`. (Local stacks load them from `config.toml`.)
      Since 2026-10-24 the links go to `{{ .SiteURL }}/nexus/auth/confirm`
      (`/ar/nexus/auth/confirm`), so the Site URL must be
      `https://auibsal.org`.
- [x] ~~Liveblocks secret~~: Liveblocks replaced by Supabase Realtime (2026-10-09).
- [x] **Knock and Upstash removed** (owner, 2026-10-08): packages, env keys
      and CSP hosts are gone. Delete the two accounts at will.
- [x] **Migrations through CI:** the owner added `SUPABASE_ACCESS_TOKEN` and
      `SUPABASE_DB_PASSWORD` to the GitHub `production` environment
      (2026-10-08); `migrate.yml` applied 20261008000200–0700 the same day.
      Council members, the Treasurer and the Elections Committee enroll an
      authenticator app the next time they open Administration.
- [ ] **HSTS preload:** the header now carries `preload`; submit
      auibsal.org at hstspreload.org once the deploy is live.
- [ ] **Supabase Auth → MFA:** confirm TOTP is enabled (on by default).
- [ ] **Sign in with SAL (for the Journal team's app):** Supabase →
      Authentication → OAuth Server: on, path `/nexus/oauth/consent`, dynamic
      registration off; URL Configuration → Site URL
      `https://auibsal.org`; for OpenID Connect ID tokens, Settings →
      JWT Keys → asymmetric keys. Then register the team's app (OAuth Apps →
      Add), send them the client id privately, and approve it in Nexus →
      Settings → Third-party apps with "Name and language" and "AUIB
      Literary Journal". Steps: `docs/platform/api.md`.
- [x] **Phone notifications (Web Push) keys** (set on the auibsal project
      2026-10-24; this item kept for the record): run
      `bunx web-push generate-vapid-keys` once (or reuse the pair from
      sal-api). Put the public key in `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and the
      private key in `VAPID_PRIVATE_KEY` (sensitive) on the auibsal project,
      then redeploy. Until
      then the Profile section says the browser can't show notifications and
      everything still goes by email.
- [ ] **Owner dashboard steps** listed in the SAL Platform Master Guide
      (claude.ai/code/artifact/4f305659-631a-4244-adbd-18b93a8e10a1): `SENTRY_AUTH_TOKEN` on the
      auibsal project (source maps), Cloudflare Email Routing for
      `hello@auibsal.org` (no MX record today, so replies bounce), Vercel Bot
      Protection on the auibsal project in Log mode.
- [x] Cancelled by the owner (2026-10-08): leaked-password protection (a
      paid Supabase feature; everything stays on free plans) and the AUIB IT
      allowlist (mail already reaches AUIB inboxes).
- [x] AUIB calendar: `https://auib.edu.iq/events/list/?ical=1`. Cloudflare
      answers this sandbox with a bot challenge (403); test from the cron.
- [x] Cost per winter set: not final; the UI uses the 40,000 IQD placeholder
      setting (`charity.cost_per_set_iqd`), marked as a placeholder.
- [x] ~~`docs.auibsal.org` on Mintlify~~: replaced (2026-10-09, decision below).
- [x] GA4: later; the code stays behind `NEXT_PUBLIC_GA_ID`.
- [x] Collaboration is back in scope (owner, 2026-10-05); on Supabase
      Realtime since 2026-10-09 (decision below).

## Decisions

- **Partners, one register** (owner, 2026-10-25: "go for everything"): the
  Diwan's Partners section keeps the only list; campaigns name their
  partner from it; a partner's verified members are "Guest of [partner]"
  and can open Qirtas, Profile, Record and Settings. The public "who we
  work with" page (`/partners`) lists listed partners as before; perks are
  on the card.
- **The account** (owner, 2026-10-25: "go for everything"): the menu is
  Today · My calendar · Callboard · Society · Record · Settings. Profile
  (what members tell us about themselves) is split from Settings (how the
  Society reaches them and how they sign in); Requests and reports open
  with "Raise a concern", in confidence; Record is service and
  certificates; voting eligibility moved to Society; the offers page is
  gone (perks are on the card).
- **The Callboard** (owner, 2026-10-25: "go for everything"; the name "The
  Callboard", the link "Get involved"): roles, shifts and auditions on one
  members' board, matched to the skills in Profile, with the hours given
  counting toward the service record. The header is About · What's on ·
  Qirtas · Get involved · Join; Programs moved to the footer.
- **Qirtas, two doors** (owner, 2026-10-25: "go for everything"): the
  newsroom is always open; the Edition takes work only during a call (two
  a year), and members can ask to be emailed when the next one opens.
  Fewer types: Letters take poetry, prose, drama and translation; Gallery
  takes art and photography, and comics and photo essays. Six Words are
  never sent from the site: officers transcribe Tour cards in the Diwan and
  attach them to their writers by scanning the writer's membership card.
  Then (owner, same day: "merge qirtas write and qirtas submit"): one
  page, `/qirtas/write`; a type opens its form there (`?type=`), and
  `/qirtas/submit` is gone (no redirect).
- **What's on** (owner, 2026-10-25: "go for everything"): programs and
  events are one calendar at `/events`, shown a month at a time with each
  program as a series to filter by, and a page per series
  (`/programs/<slug>`). Each event has one way in: just come (with "Remind
  me", an email the day before), book a place, or by invitation (invisible
  to everyone not invited). The public see members-only events as a title,
  a time and "For members". The subscribe link stays, now secondary; each
  event keeps "Add to calendar". The header reads About · What's on ·
  Qirtas · Programs · Join until the Callboard ("Get involved") replaces
  Programs.
- **The live card** (owner, 2026-10-25: "go for everything"; no member
  pictures; the pattern; Google Wallet for now): the QR changes every 30
  seconds (TOTP of a per-card secret), a clock ticks under it and a sheen
  drifts across the card, so a screenshot is plain to see and stops
  working at the door within a minute. A line pattern (guilloche) drawn
  from the card number makes each card distinct. "Add to Google Wallet"
  carries the same live code. The check page says whether a code is live
  and, for partners, that the member may use member perks; perks show on
  the card. "Lost your card?" is gone: Card security offers "Reset the
  card code" (new code and secret; earlier codes and passes stop).
  Then (owner, same day: "yes to all, certificates on card off by
  default"): the rosette shows clearly on the card and is drawn again on
  the card's check page and as the Wallet pass's banner, for comparison;
  certificates get their own rosette (from the serial) and a QR to their
  check; `/verify` checks either a certificate or a card code; a card's
  check lists the member's certificates only when they turn it on.
  Then (owner, same day: "go ahead with all of it"): the pass carries
  links to the account and What's on; Google's save and removal messages
  (signed, checked) mark the pass in `membership.wallet_passes`, so the
  card says "In your Google Wallet" and the Diwan's member insights count
  them; a reset card, an ended membership or a deleted account marks the
  old pass expired in Wallet (outbox `membership.wallet_expire`); adding
  the card again refreshes a pass the member already holds. No NFC: Smart
  Tap needs certified readers, and the QR is already live.

- **Personal emails are verified; one address, one person** (owner,
  2026-10-25): the personal email stays optional (it is for keeping in
  touch after graduation; asking everyone for it would mostly collect
  addresses we never use). A member adds it in Profile; it counts only
  after they press the link sent to it (seven days). It can't be an AUIB
  address, anyone's sign-in address (their own included) or another
  member's verified personal email, and a new account can't sign up with a
  member's verified personal email. Addresses saved before this stay,
  unconfirmed and unused, until their owners confirm them from Profile.
  **No phone numbers** until they can be verified: the field and the
  column are gone.

- **The membership card works** (owner, 2026-10-25: "make the QR code
  actually functional"): each member has a card number (in the order they
  joined) and an unguessable code. The QR is a link,
  auibsal.org/verify/member/<code>: any phone camera opens a page saying
  whose card it is and whether the membership stands today (read live,
  never cached). Officers at the door scan the same QR in the check-in
  screen (`events.check_in_card`). A member can replace the code from
  their card ("Lost your card?"); the old link then stops working. The old
  QR (`sal:member:<user id>`) is gone: it exposed the account id and could
  not be withdrawn.

- **Names in both languages, and what members tell us** (owner,
  2026-10-25): sign-up asks for the first and last name in English and in
  Arabic, all four required; the full names are built from them. Members
  who joined before are asked at their next visit. "More about you"
  (setup and Profile) asks, all optional: who they are at AUIB, ID number,
  college, major, level, graduation year, year of birth, gender, phone,
  city, languages, interests, skills, volunteering, how they heard of the
  Society, and whether their answers may be counted in anonymous reports.
  Only the member and members.manage read them (RLS); the Diwan's "What
  members tell us" shows counts from consenting members only, hiding any
  group under five; the members export adds the columns for
  members.manage.

- **Qirtas is one place** (owner, 2026-10-25): in the Diwan, one Qirtas
  section (the newsroom and the blind review were two); the blind review
  is a tab (`/diwan/journal?tab=review`, entries at `/diwan/journal/entry`
  and `/diwan/journal/submission`). For members, `/qirtas/write` lists
  every desk and type; the type decides the process (`/qirtas/submit?type=…`:
  desk types are edited with the author, Edition types are read blind), and
  "Your work" lists submissions and pieces together.

- **Proposal: members' public pages** (for the owner to decide; not
  built). An opt-in page per member at auibsal.org/members/<slug>, off by
  default, the member choosing each part:
  - the name in the page's language, a photo, a short bio (already in
    Profile) and pronouns if they want;
  - their published Qirtas pieces and credits in productions (already
    public, gathered in one place; Qirtas already has author pages, which
    this would extend);
  - their roles and years of service, Fellowship and certificates (each
    verifiable);
  - a reading shelf: books they are reading, have read and recommend, with
    a line each (a "Shelf" the Register could feature, and a reading
    group could start from);
  - their six words (already written for the Register), favorite poem or
    line, and the programs they come to;
  - links (a personal site, Instagram).
  Not on the page: email, phone, ID number, year of birth, attendance
  counts or anything from "More about you". Camera-shy members never show
  a photo. A Council setting can switch the feature off; Arabic and English
  pages show only that language's name and text. Cost: one table
  (`core.member_pages` with the shelf as rows), RLS for owner write and
  public read when published, one public page, one Profile section.

- **The brand is SAL-BRD-01, Version 1** (owner, 2026-10-25; the brand
  handoff): one version, no earlier ones. The Bookmark is only ever the
  logo (no markers before titles); titles stand alone (no kicker, eyebrow
  or label above them); one language per page, email, share image and post,
  with the Arabic lockup on Arabic pages; Qirtas is the paper, not a
  program (its row unpublished); programs grouped as Flagships, the
  Evenings and the Specials. News pieces keep the site's type (owner, Oct
  24); Literata stays for literary pieces, as in the article reference.

- **The Diwan is for officers only** (owner, 2026-10-24): "Diwan should be
  just for admins. Though users can sign up/in. All public features should
  become outside of diwan." Sign-in, sign-up and every member page moved to
  the site, in its header and footer: `/sign-in`, `/sign-up`, `/account`
  (overview, profile, requests and reports, service, offers, certificate),
  `/events/book`, `/programs/shifts`, `/programs/productions/auditions`,
  `/qirtas/write` (submit, submissions, work), `/society`. The Diwan keeps
  the administration at `/diwan/<module>` (no more `/diwan/admin`), the
  library and declarations, and opens only for role holders; everyone else
  is sent to `/account`. Old member addresses under `/diwan` forward to the
  new ones (emails already sent, the sign-in emails until they are
  re-pasted).

- **The Diwan overhaul, documents and one language per page** (owner,
  2026-10-24): every document adopted as Version 1, codes and statuses for
  admins only; forms woven into the sections they belong to with plain
  actions and no codes (Requests and reports at `/diwan/forms`); no Arabic
  on English pages and no English on Arabic ones; news pieces in Qirtas in
  the site's type (Literata stays for stories and poems); the home page
  without the kicker and the extra rules. The Diwan has Home in its five
  sections, a single Account menu, and one page frame (`DiwanPage`).

- **Brand and the new names** (owner, 2026-10-24; the brand handoff,
  START.md and NAMES.md): Light headlines, hairlines in place of boxes, one
  accent button per view, six colors, the Bookmark before section titles,
  Literata for Qirtas articles. Waraq is Qirtas at `/qirtas`, the Nexus is
  the Diwan at `/diwan`; every other rename is in AGENTS.md ("Renames").
  The code keeps its names (`waraq`, `journal`, `nexus`, `side-quest`).
  Programs are grouped as five flagships, one evening a week (a four-week
  cycle) and three specials; Gallery Wall is unpublished, kept.

- **Dark mode and one frame** (owner, 2026-10-24, "add a dark mode across
  the board … unify the UX between web and nexus"): dark mode is the brand's
  ink theme on the whole page, from the system setting or the words-only
  toggle in the header (cookie `sal_theme`; `apps/web/lib/theme.ts` runs
  before the first paint, and pages print light). Certificates, letters and
  form printouts stay paper. The site and the Nexus share one masthead and
  one footer; the Nexus adds its name beside the logo, its sections, the
  Account menu and the phones' tab bar, and the sign-in pages carry the
  site's own header. This replaces "light everywhere" of the same day. The
  old hosts' redirects are gone with the hosts.

- **One app** (owner, 2026-10-24, "a simple project with one app … all will
  be on web, but there would be /nexus and still sign in and so on"): the
  public site, the Nexus and the API are one Next.js app, `apps/web`, on one
  origin. The Nexus lives at `/nexus` (`app/[locale]/nexus`, client-rendered
  as before; `@/lib/nexus/navigation` adds the prefix so its code still
  names pages by their own path), the API at `/api` (`app/api`, `lib/api`),
  the developer pages at `/developers` (English only, like the runbooks).
  Secrets stay server-only: route handlers and `lib/api` read them, CI greps
  the client bundle. One deployment, one set of variables
  (`NEXT_PUBLIC_SITE_URL` replaces the three URLs), no cookie domain, the
  outbox revalidates the cache in process. The old hosts redirect from
  `next.config.ts`, the one exception to "the apps configure no redirects".
  Storybook moved to `packages/storybook` and runs locally only; its gate
  and the design host are gone.

- **One ground** (owner, 2026-10-24, "improve the UI/UX … especially nexus
  vs web"): the Nexus is light like the site; ink stays for the "why" pages
  and the Open Call. One attribute (`data-theme` on the Nexus `<html>`)
  reverses it. The shell paints before the data: the header, navigation
  and footer render at once and the gates spin inside `main`.
- **Fewer gates to print** (owner, 2026-10-24, "many steps require too
  much bureaucracy"): a piece on a named desk (News, Video, Voices)
  publishes on the desk editor's approval; an Edition piece (Letters,
  Gallery) needs the desk editor and the Editor-in-Chief or Managing
  Editor, two people; the Copy Chief's style check is recorded, never
  required (`private.required_approvals`, migration `20261024000400`).
  The author's approval and the agreement on submitted work stay.
- **Forms without paper codes** (2026-10-24): members see forms by what
  they do ("Certificate of Service"), never by F- or L- number; the codes
  stay in the database and on the printed form for the Policy Manual.

- **Telegram bot and mascot** (owner, 2026-10-22: "a Telegram bot … our
  mascot … do what you think is best"): the mascot is Hudhud (هدهد), a
  hoopoe carrying the SAL symbol as a letter (native to Iraq, the messenger
  of the old stories, the guide in The Conference of the Birds), drawn in
  the brand colors only (`brand/mascot`). The bot lives in apps/api (owner,
  2026-10-23: one app holds the secrets; first built as apps/bot): it acts
  for members only through `core.telegram_*` functions under their own
  claims at aal1,
  so roles that need two-step sign-in never count in Telegram. Linking
  starts in the Nexus with Telegram's login (OpenID Connect, verified by
  apps/api; the bot's one-time code is the fallback), and connecting a
  group with a one-time code. Telegram never signs anyone in to the Nexus:
  sign-in is email only (owner, 2026-10-23). Where Telegram has its own
  feature the bot doesn't duplicate it (owner, 2026-10-23): the group's
  welcome message and rules, anti-spam, moderation and its log, join
  checks (Guard mode answers; admins decide the rest), the menu button,
  and the daily word (the web game as the bot's Main App). The bot keeps
  only what needs the Society's data. No emoji in
  the bot (brand rule); the daily word's marks are ● ○ ·.

- **The President has access to everything** (owner, 2026-10-15) except
  the checks on the President, which stay with other officers: concerns
  about the President (F-20), blind reading and author identities (only the
  Submissions Manager), running elections (the Elections Committee), the
  Treasurer's countersignature and ledger sign-off, and the Faculty
  Advisor's countersignature. Migration `20261015000100`; `rbac.test.ts`
  fails if a new permission is not given to the President.

- **Public newsletter** (owner, 2026-10-14: "a public subscription, and
  maybe the Sunday Paper should be members only"): "The Month in Waraq",
  one email on the 1st of each month (9:00 AM Baghdad), with the month's
  published pieces and the coming public events. Anyone signs up at
  auibsal.org/newsletter (also on the Waraq front page and in the footer);
  double opt-in, and the confirm and unsubscribe links open a page with a
  button, so mail scanners change nothing. One-click List-Unsubscribe header.
  Rows in `content.newsletter_subscribers`, written only by apps/api
  (`/newsletter/subscribe|confirm|unsubscribe`); content managers see the
  count in Administration → Content. The Sunday Paper stays members-only.
  Emails go through the outbox, so the free plan's 100 a day is respected
  (a long list takes several days to go out).

- **Waraq games** (owner, 2026-10-14: "automatic games, plus the starter
  puzzles, and the games that editors write"): auibsal.org/waraq/games has a
  daily word guess and a daily word search in each language, made in the
  browser from fixed word lists (`packages/sal-data/game-words.ts`) and the
  Baghdad date; editors' crosswords and word searches (`journal.puzzles`,
  Administration → Waraq → Games: answers and clues in, grid laid out for
  them). Four starter puzzles, made with an AI tool from facts already on the
  site (programs, desks, motto), say so on the page. Progress stays in the
  reader's browser; nothing is sent.

- **News into Waraq** (owner, 2026-10-14): the old /news is Waraq's News
  desk everywhere. auibsal.org/news, the Nexus News tab, the "news" search
  kind and the Notion "News post" publishing are gone; Notion News post
  pages are imported to the News desk for editing. `content.news_posts`
  was dropped on 2026-10-17 (owner).
  A separate blog is not needed: News, Voices and the Letters desk cover it.

- **Waraq** (owner, 2026-10-14; Notion project "Waraq: one publication for
  news, letters and art"): the AUIB Literary Journal, campus news, the
  Gallery Wall, Six Words and Side Quest episodes become one bilingual
  paper with five desks (News, Letters, Gallery, Video, Voices). It extends
  the Journal module (schema `journal`): Letters and Gallery answer an
  Edition's call and are read blind as before; News, Video and Voices are
  always open and edited by name. Accepting makes the piece; it publishes
  itself once the author approves the text, the desk editor and the
  Editor-in-Chief or Managing Editor (two people) approve, the Copy Chief
  marks style done and the agreement is signed (`private.publish_check`).
  The spec's `waraq.*` permissions are `journal.edit.<desk>`,
  `journal.approve`, `journal.copy`, `journal.frontpage`; intake is
  `journal.identity.view`, reading `journal.review`. Digital Editor, Art
  Director and Layout Designer are retired (nobody held them). The name is
  the `journal.name_*` setting (decision due Oct 22 in Notion).

- **Third-party apps and the API** (owner, 2026-10-08): a Journal team at
  AUIB wants to sign members in with their SAL account and run the
  editorial flow from its own tool. Sign-in is the Supabase OAuth 2.1
  server (free), the consent page is in the Nexus, and `/v1` on apps/api is
  the public API. Because an OAuth token can do anything the member can,
  the database limits each app to the areas the Society granted it
  (`access.oauth_clients`, a restrictive policy on every table, a
  pre-request check for functions); membership, elections, charity and
  roles are never available to apps, and apps/api's own endpoints refuse
  app tokens (migration `20261008001500`).
- **Phone notifications** (owner, 2026-10-08): Web Push, not Knock or a
  native app; free and vendor-free. Email stays the record.
- **Site-wide Arcjet check removed** (owner, 2026-10-08): the public site
  serves published pages only; Arcjet stays on the public form in apps/api.

- **Online ballots** (owner, 2026-10-08): every election is voted online in
  the Nexus under Bylaws B6: the voter list freezes when notice is given
  (B6.2), only AUIB accounts vote (B6.7), one ballot each, ballots and voter
  lists deleted a year after voting closes (B6.11). The elections flag is on
  (migration `20261008000900`).
- **Staff and voting** (owner asked, 2026-10-08): roles do not make anyone a
  Voting Member. The Constitution (3.3(b)) and Bylaws (B3.3) tie voting to
  two recorded activities this or last semester; Council and team meetings
  count (B3.2) when their attendance is recorded. University faculty and
  staff are Honorary Members and do not vote (3.3(d)).
- **Journal Issue 1 call** (owner, 2026-10-08): open now, from October 8 to
  November 26, 2026 (the close date from the Strategic Plan, SAL-STR-01, a
  draft), at most two pieces each, open theme (migration `20261008001000`).
  The Arabic name is «مجلة الجامعة الأمريكية الأدبية» (owner's choice).
- **Founding voters** (owner, 2026-10-08): until May 13, 2027 (end of Spring
  2027), the first 100 verified Members (not Honorary or Alumni) are Voting
  Members from the day they join; everyone else, and everyone after that
  date, needs two recorded activities. Both values are settings
  (`membership.founding_voters`, `membership.founding_voters_until`;
  migration `20261008001100`).
- **American English** (owner, 2026-10-08) for all copy, comments, commits
  and docs; verbatim quotes from the Society's documents keep their spelling.
- **Screens** (owner, 2026-10-08, Option B of the audit): square corners,
  a 2px frame, one solid offset elevation, tracked capitals only for
  kickers, navigation and buttons (never Arabic), the Nexus on ink. Print is
  unchanged. Recorded in `brand/BRAND-BOOK.md` ("Screens") and the Design
  System artifact.
- **Public site populated** (owner, 2026-10-12): "Home and partners" on the
  home and Partners pages (AUIB as home institution, recognition by the
  Office of Student Life per Constitution 1.2, the College of Arts and
  Sciences and AUIB Press as institutional partners, named by the owner),
  the register's listed partners on the home page, al-Mutanabbi's line
  (the Constitution's motto), "A Society of Arts and Letters programme" on
  program cards, a footer with copyright, recognition, colophon and
  Instagram, a literary 404 and a console note.
- **Password first at sign-in** (owner, 2026-10-12): every address,
  AUIB included, signs in with a password by default; "Email me a sign-in
  link instead" stays one click away. Each link is an email against
  Resend's free 100 a day.
- **Human check at sign-in** (owner, 2026-10-12): Cloudflare Turnstile on
  Nexus sign-up, sign-in and password reset, through Supabase Auth's
  captcha protection (the secret is in Supabase; the public site key is
  `NEXT_PUBLIC_TURNSTILE_SITE_KEY` on sal-nexus). Arcjet stays on apps/api's
  public form; the two don't overlap (sign-in goes straight to Supabase,
  which Arcjet never sees). Cloudflare Email Routing forwards
  hello@auibsal.org; R2 is on but unused.
- **Monitoring and protection on free plans** (2026-10-08): Sentry (projects
  sal-web, sal-nexus, sal-api; 10% traces, no replays), BetterStack uptime
  (three monitors), Arcjet on apps/api's public form endpoints only (fails
  open; not on page views).

- **Public repository:** auibsal/mono is public, so `docs-source/` holds
  only documents the brief lists as public. Restricted documents live in the
  private `library` bucket, reached through signed URLs.
- **Our own sign-in everywhere, no vendor branding** (owner, 2026-10-09).
  Mintlify's free plan keeps its branding and has no member-only pages, and
  the repository is public anyway, so: documents stay on auibsal.org, the
  officer handbook lives in the Nexus (`governance.handbook_pages`, officers
  with `library.read`, edited by `governance.manage`), runbooks are Markdown
  in `docs/platform`; docs.auibsal.org is retired. The design system
  (Storybook, rebranded) sits behind a gate that accepts the Nexus session.
  Live co-editing moved from Liveblocks (its badge only comes off on a paid
  plan) to Supabase Realtime (migration `20261008001600`).
- **Tokens come from `brand/tokens.json`** (generator + tests). Two platform
  additions, both existing tones: the `rule` role (light `rule`, ink
  `ink-70`) and captions on crimson-50/paper switch to `ink-70`, as the
  brand's contrast table requires.

- `bun run init` kept notifications, feature-flags and rate-limit; removed
  cms (BaseHub, not Supabase-backed), collaboration, webhooks and ai.
  `payments`, Capacitor targets, phone OTP and the SMS hook removed by hand.
- The template's tenancy and billing schema was replaced outright (no SAL
  database exists yet, so nothing was dropped from a shared database).
- All SAL schemas are exposed to the Data API; private helpers live in the
  unexposed `private` schema. Production must add the schemas under
  Settings → API (documented in ARCHITECTURE_AND_INTEGRATIONS.md).
- Spending limits are data (`access.roles.spending_limit_iqd`: Director
  50,000, President 250,000), so SQL checks permissions, not role names.
  Above the highest limit an adopted Council resolution is required and the
  Treasurer records it.
- The Advisory Board has its own permission (`journal.advise`) so readers
  (`journal.review`) never see flagged entries by default.
- Blind entries copy title and text at "in review"; the submission ↔ blind id
  mapping (`journal.blind_keys`) is readable only by `journal.identity.view`.
- Elections: RON is offered only on uncontested races (as the brief says);
  ties for last place are broken by fewer first preferences, then by id
  (recorded in the rounds). **Check against the Elections Code (B-series)
  when the Bylaws arrive.** The founder's pre-election presidency
  (`note = 'founder-pre-election'`) does not count towards the two-term limit.
- Feature flags are rows in `core.settings` (`features.*`), not PostHog:
  the Nexus is static and the database must enforce `features.elections`.
- Analytics: GA4 only (`NEXT_PUBLIC_GA_ID`), on apps/web only; Meta, TikTok,
  PostHog, GTM, Vercel Analytics and server conversions removed.
- The Nexus is no longer a static export (owner, Oct 14, 2026): its pages
  are client-rendered with one locale proxy and no secrets. Security headers
  are in `apps/app/vercel.json`. Routes with ids still use query strings.
- English URLs have no prefix (`/events`); Arabic ones do (`/ar/events`),
  in both apps. Old `/en/…` links are forwarded by the locale proxy. Owner:
  in Supabase → Authentication → URL Configuration, keep
  `https://nexus.auibsal.org/**` in Redirect URLs; paste the updated email
  templates (`packages/database/supabase/templates`) so the Arabic buttons
  open `/ar/…`.
- Members-only piece text lives in `journal.piece_bodies`, so piece metadata
  can be public (with a sign-in prompt) while the text stays members-only.
- Partnerships (Oct 9, 2026): one generic Partners module, no code per
  partner. Tables live in the `governance` schema (a new schema would need
  a dashboard change to expose it). What a partner may do on the platform
  comes only from the grants of a signed memorandum in force; signing goes
  through `governance.sign_partner_agreement`, which refuses anyone with a
  declared conflict (P8.3). Partners are public only while active, listed
  and under a signed memorandum. Member offers are display-only (no
  payments). `charity.partners` stays for campaign pages.
- Recognition (Oct 9, 2026): recorded service is
  `membership.service_records` (Form F-16): shifts a program manager marks
  as worked, event staff hours, and members' own entries, always confirmed
  by someone else. Certificates (F-28, Fellowship, Honorary Membership)
  issue only after the President signs and the Faculty Advisor
  countersigns (`membership.sign_certificate`), take the year's next
  serial, and are checked at auibsal.org/verify. The PDF is the browser's
  print of the Nexus certificate page (Arabic shaping stays correct; no
  PDF library or cost).
- Journal partner pathway (Oct 9, 2026): a call names partners
  (`journal.call_partners`) whose verified members may submit, only while
  the partner's signed memorandum grants `journal_submissions`; the same
  pledges, limits and blind review apply. `journal.submissions.partner_id`
  is identity-side (never on blind entries). `assign_reader` refuses a
  reader with a declared conflict with that partner (P8.3). People
  verified as a partner's members get a guest Nexus (Journal, profile,
  service, certificates). The Guest Editor role (issue scope) goes only to
  a partner's member whose memorandum grants `guest_editing`.
- Productions (Oct 9, 2026): `programmes.productions` with stages from
  proposal to closed. No production reaches performances, and no
  performance (a SAL event) is linked, until the script's rights are
  cleared by someone other than whoever recorded them; a licensed script
  needs the license on file (library/productions, opened through apps/api
  `/files/rights`). Audition notes are never readable by the person
  auditioning. Members choose whether their credit is public. Partners
  co-produce only under a memorandum granting `productions`. A new
  `production` scope and the Production Lead role run one production;
  hours become recorded service, a closed production drafts certificates
  for its credited members, and the lead signs the Program Report (F-25,
  section B). Public page: auibsal.org/programs/productions (footer, and linked from Programs).
- Forms (Oct 9, 2026): one engine for every form not built into its own
  module (F-03, F-04, F-06, F-09, F-10, F-11, F-13, F-14, F-17, F-19, F-20,
  F-24, F-25 A, F-27, F-29). `governance.form_types` says who may fill
  each in and which permission (held Society-wide) handles it; fields are
  defined in `@repo/sal-data/forms`, transcribed from Templates & Forms.
  Submissions are written only through `governance.save_form` and
  `governance.handle_form`. Incident reports go only to Society-wide
  events managers. Concerns (F-20) may be anonymous (no account stored)
  and are routed by permission: one about the Vice President never
  reaches the Vice President, one about the President never reaches the
  President. Form submissions have no activity-log trigger (it would
  record who sent an anonymous concern). Expense claims record what is
  owed; the Society still makes no online payments. Forms already part
  of other modules are linked from Account → Forms. The standard letters
  (L-01 to L-10, F-05) are fill-in-the-brackets templates in Admin →
  Forms and letters, quoted verbatim.
- Documents (Oct 10, 2026): the foundational documents are text in
  `governance.society_documents`, converted word for word from the PDFs in
  docs-source/. Public ones render on auibsal.org/documents (cached under
  the `documents` tag, refreshed on save); internal ones exist only in the
  Nexus. The PDFs are no longer published. Arabic text that the PDFs could
  not give back is TODO(content).
- Role rules (Oct 10, 2026): `access.assign_role` refuses a second
  Council seat (Constitution 6.6; so never President and Treasurer, B9.8),
  any other role for the Faculty Advisor (9.1), the same role twice, and a
  third role or second leadership role (B5.5) unless an adopted Council
  resolution grants a founding-term exception. Existing assignments are
  left as they are; the public Council roster lists each person once per
  office.
- Notion (Oct 10, 2026, owner; migration `20261010000300`,
  `docs/platform/notion.md`): the officers' team work lives in the Notion
  workspace (Plus for education clubs): projects, tasks, meetings, the
  content calendar, the handbook and the internal documents. Events and
  news are written in Notion and published by apps/api when Status is
  Ready to publish, after checking that the page's last editor (matched by
  AUIB email) holds events.manage or content.manage; roles needing two-step
  sign-in count only for accounts with a verified second factor, since a
  Notion session is not ours. Notion gets read-only copies of officers,
  programs, the document and minutes registry and Journal counts (numbers
  only). Members, RSVPs, ballots, submissions, the ledger, certificates and
  confidential forms never leave the Nexus. Officers sign in to Notion with
  their AUIB address (Notion SSO needs Business or Enterprise), which
  narrows the Oct 9 "our own sign-in everywhere" decision for this
  workspace only. Invite-only; the auib.edu.iq allowed-domain setting stays
  off; volunteers are guests on their project's pages.
- Handbook and internal documents in Notion only (Oct 10, 2026, owner;
  migration `20261010000400`): the nine handbook pages were copied to
  Notion word for word (the charity page no longer names the deleted
  Second Chapter 2026 draft; the events and news pages now say how to
  publish from Notion). The Nexus links there (Account → Officer
  handbook; `/handbook?page=…` forwards to the same page in Notion) and
  `governance.handbook_pages` is read only. Internal documents keep their
  registry entry and status in the Nexus and their text in Notion
  (`society_documents.notion_url`).
- Rows deleted directly in production (the Second Chapter 2026 campaign,
  Journal Issue 1 and its call, Mohammed Ali Ehsan's Editor-in-Chief role):
  the owner deleted them on purpose and does not want them back (Oct 10,
  2026). Their copies stay in `core.activity_log` as usual.
- UX pass (Oct 10, 2026): setup asks for the member's name (accounts made
  by a sign-in link had none, so they showed blank across the Nexus), and
  members without one are sent back to setup once. Admin sections are in
  five groups; below `lg` they open from one "Administration" button. Admin
  tables stack into labelled rows below `md` (nothing scrolls sideways).
  The member home shows notices only when there are some; the calendar
  feed moved to Profile and privacy. `FormHeader` follows its page's theme
  (white symbol on ink) through the `on-ink` variant. The public home
  shows the flagship programs.
- Owner cleanup (Oct 9, 2026, migration `20261010000200`): Shaheen Farjo
  keeps only the President seat held since Oct 4; his other assignments
  are ended. Test content is removed (the "Hey" news draft, the two test
  journal submissions, a duplicate member offer, a test verification
  request). The manuscript file of the withdrawn test submission stays in
  the `submissions` bucket until deleted in the dashboard.
- Reference data after the first migration: later migrations may add
  permissions, roles and grants with plain inserts; `@repo/rbac`'s mirror
  test reads every migration in order.
- Passkeys (Oct 9, 2026): Supabase Auth's own WebAuthn, no extra service.
  Relying Party ID `auibsal.org`; a passkey sign-in is a first factor, so
  roles with `requires_mfa` still ask for the authenticator code.
- Side effects (emails, revalidation) are queued in `core.outbox` inside the
  transaction; an insert trigger hands each to apps/api (pg_net), and a
  drain every ten minutes retries what failed.
- Supabase advisor (Oct 9, 2026): fixed the media bucket listing and the
  always-true sign-up check (migration `20261009000000`). Oct 24, 2026
  (owner: "not a single advisor warning"): every RPC entry point is now a
  SECURITY INVOKER wrapper around its body in `private`, overlapping
  permissive policies are merged, every foreign key is indexed, the
  hand-made `rls_auto_enable` is dropped, and `00_advisors.test.sql` keeps
  all of it true. The one row left, leaked-password protection, is a
  dashboard setting on the Pro plan.

## Checklist

### Sign-up in fewer steps (2026-10-25)

- [x] Sign-up with an AUIB address asks only the address and a password;
      an outside address also gives the four names and a few words (the
      Council confirms those accounts)
- [x] Setup one question per screen: English name, Arabic name, each
      pending pledge, photos (yes or no), then "Welcome, {name}" with the
      card; "Step X of Y", Back and the browser's Back, Enter moves on,
      saved as answered, focus without scrolling (iPhone). Language follows
      the sign-up page and email notices start on. A renewed pledge asks
      only the pledge
- [x] "Tell us more" at `/membership/more`: the optional details a question
      at a time with Skip and tap-to-choose chips; offered on Today while
      there are no interests or skills; the full form stays in Profile
- [x] What's on: an empty month says what comes next; the Diwan says "That
      address belongs to a program; choose another." on a slug clash
- [ ] iPhone retest of sign-up and setup (owner)

### Partners (2026-10-25)

- [x] Migration `20261025000800_one_partner_register`: charity partners
      folded into the register, campaigns follow; `governance.partner_names()`;
      pgTAP in `50_charity` (20)
- [x] Diwan Charity: campaigns pick from the register; the charity's own
      partner list removed
- [x] "Guest of [partner]" for a partner's verified members; Settings open
      to guests

### The account (2026-10-25)

- [x] Menu: Today · My calendar · Callboard · Society · Record · Settings
- [x] `/account/settings` (personal email, notifications, Telegram,
      passkeys, apps, deletion); Profile keeps names, bio, details,
      affiliations and photo consent
- [x] Requests open with "Raise a concern" (in confidence); Today shows the
      latest requests; voting eligibility on Society; calendar feed on My
      calendar; `/account/offers` removed (old Diwan link goes to Today)

### The Callboard (2026-10-25)

- [x] Migration `20261025000700_callboard`: openings, replies (managers
      emailed), skills on openings and shifts; pgTAP `99_callboard` (12)
- [x] `/callboard`: roles, shifts and auditions, matched to skills; the
      header's "Get involved"
- [x] Diwan, Programs › Roles: post, see replies, close; skills on shifts
- [ ] Next: the account restructure, then partners

### Qirtas two doors and Six Words on the Tour (2026-10-25)

- [x] Migration `20261025000600_qirtas_doors`: `prose`, retired types,
      call alerts and the "call opened" notice, Six Words only from the
      Tour (transcribe, attach by a live card); pgTAP `99_qirtas_doors` (14),
      journal and programmes tests updated
- [x] `/qirtas/write`: two doors, the next call and "Tell me when"
- [x] Email "A Qirtas call is open" (and its Storybook story)
- [x] Account: Six Words read-only, pointing to the Typewriter Tour
- [x] Diwan, Programs › Six Words: type a card, scan to save or attach,
      take down; the camera scanner shared with check-in
- [ ] Owner: open the two calls a year (nothing enforces the number)

### What's on (2026-10-25)

- [x] Migration `20261025000500_whats_on`: ways in (`entry`), invitations,
      reminders, `events.calendar`, booking and Hudhud honoring invitations,
      the day-before reminder to those who asked; pgTAP `99_whats_on` (17)
- [x] `/events` as a month calendar (grid on wide screens, list on phones),
      series filter, previous and next month; `/programs/<slug>`
- [x] Event pages: the way in, "Remind me" or "Book a place"
- [x] Members' events page: "Remind me", "By invitation"
- [x] Diwan event editor: Way in, and Invitations for invitation-only events
- [x] Feeds: invitation-only events only in the invited member's feed
- [x] Header: What's on second
- [ ] Signed-in visitors see the public calendar; members-only and invited
      events in full are on the members' events page (a members' layer on
      `/events` itself can follow)

### The card, names, details and one Qirtas (2026-10-25)

- [x] Migration `20261025000100_member_card_and_details`: card numbers and
      codes, the public check, check-in by card, name parts, member
      details, member insights; pgTAP `99_member_card` (17)
- [x] The card (paper, the lockup, the name, number, since, tier, vote,
      the QR as a link, full-screen code, new code), `/verify/member/<code>`
- [x] Sign-up and setup: first and last name in both languages; the gate
      sends anyone missing one to setup; More about you in setup and Profile
- [x] The account menu: one line on phones that opens the list; the row
      on wider screens (items no longer overlap)
- [x] Qirtas: one section in the Diwan (blind review as a tab, entries
      moved under `/diwan/journal`); one writing page for members by type
- [x] Diwan: What members tell us (`/diwan/members/insights`); details in
      the members export
- [ ] Owner: decide on the members' public pages (proposal above)

### Brand and the new names (2026-10-24)

- [x] Step 2: brand files (BRAND-BOOK.md, tokens.json, bundle.css, the
      PDF) and generated tokens; fonts (Ubuntu Light, Literata)
- [x] Step 3: one header, footer, buttons, links, inputs, section heads
- [x] Step 4: the public pages and Qirtas as in the reference; dated lists;
      programs grouped; fix: visitors could not read programs or public
      settings (migration 20261024000700)
- [x] Step 5: the Diwan, the emails (both languages) and Storybook
      ("Screens")
- [x] Step 6: the renames (messages, metadata, emails, bot, docs, routes,
      migration 20261024000800)
- [x] Step 7: Hudhud's files, the stickers story, stickers after bot
      replies (file_ids empty until the set exists)
- [x] Step 8: check, typecheck, test, rtl, i18n, placeholders, unused,
      pgTAP and the e2e journeys; screenshots at 1440 and 390 in light and
      dark, nothing sideways at 360
- [x] Owner (2026-10-24): redirect URLs, Telegram login URIs, the sticker
      set, Arabic review; no redirects from the old paths
- [ ] Owner: the auth email templates and the bot's description picture

### One app (2026-10-24)

- [x] Nexus under `app/[locale]/nexus` with `components/nexus`, `lib/nexus`
      and the prefixing navigation module; manifest and service worker at
      the root; `/nexus/[...rest]` not-found
- [x] API routes under `app/api` with `lib/api`; `/api/v1`; the outbox
      revalidates in process; `calendar.ics` reuses the feed route
- [x] Developer pages at `/developers` (guide, reference)
- [x] One `env.ts`, `.env.example`, proxy (Turnstile in the CSP),
      keep-alive cron, Vitest (API tests in the node
      environment), e2e against one server, CI (one build, one bundle grep)
- [x] `@repo/config` paths (`/nexus`, `/api`) and `@repo/internationalization`
      helpers (`nexusPath`, `apiPath`, `siteUrl`, `nexusUrl`, `apiUrl`)
- [x] Storybook as `packages/storybook`, local only
- [x] Dark mode across the site and the Nexus (system setting, toggle, no
      flash, print light); the logo follows the ground
- [x] One masthead and one footer for the site, the Nexus and sign-in
- [x] Old hosts gone: redirects, comments, tests and docs; the database's
      `platform.api_url` moves to auibsal.org/api (migration)
- [ ] Owner: the environment variables and the steps under Blocked

### Version 1 (2026-10-24)
- [x] Rails: the secret grep in CI works, `bun audit` and `turbo boundaries`
      run on every PR, strict Turbo env, dependency review on every PR,
      Next 16.4.3, Storybook 10.6.3, one Ignored Build Step script, the
      journeys against built apps with Realtime (co-editing included)
- [x] Database: zero advisor findings (migrations `20261024000000`–`000200`),
      `00_advisors.test.sql`, the daily cron watch (`sal-cron-health` →
      `platform.cron_failed` → the administrators), Notion mirror every 15
      minutes
- [x] UX: one light ground, shell-first loading, `dir="auto"` on mixed
      lists, six words written from Home, Waraq front page without a gap,
      ads that vanish when empty, newsroom tabs and order, forms without
      paper codes
- [x] Fewer gates to print (`private.required_approvals`)
- [x] Merged as a5c0ca1 (2026-10-23), but the squash message carried the
      literal CI-skip marker from a commit body, so GitHub ran no workflow
      on `main` and Vercel skipped the production builds: the follow-up PR
      gives `main` a clean commit, and `scripts/vercel-ignore.mjs` now reads
      only the subject line. Rule in `docs/platform/releases.md`. The
      follow-up (#116, 818e326) hit the same wall: the branch still carried
      its 24 pre-squash commits and GitHub put their bodies into the squash
      message again. The branch now restarts from `main` after each merge,
      and CI fails a pull request whose commits contain a skip marker.
      #117 (ea35fee) then ran CI and the production migration on `main`
      (the five `20261024*` migrations applied). Vercel built nothing for
      it, rightly: the four production deployments of 818e326 had shipped
      at 19:55 UTC, and ea35fee changed only CI and docs. Production has
      run version 1 since then. `scripts/vercel-ignore.mjs` now builds
      everything except a commit whose subject carries the marker: one
      script fewer to reason about; Vercel's own "skip unaffected
      projects" setting is the way to skip again, if wanted.
- [ ] Owner: the ruleset on `main` (PR #115 names the checks), secret
      scanning's non-provider patterns and validity checks, Copilot review
      off, leaked-password protection when on the Pro plan, then merge #115
- [ ] Owner: the Telegram steps, the Vercel variables and AdSense above

### Telegram (2026-10-22)
- [x] Database: linked accounts, hashed one-time codes, act-as-member
      functions, groups, members, posts, word plays, pg_cron posts and tidy
      (`20261022000000_telegram`, `99_telegram.test.sql`)
- [x] Bot: start, events and RSVP, Waraq, the daily word, /me, inline
      sharing; groups: setup, topics, join policy, welcome, moderation,
      reports, rules, newcomers' links, scheduled posts
- [x] Nexus: Connect Telegram in the profile; Settings → Telegram
- [x] apps/api: Telegram copies of notices
- [x] Linking with Telegram's login (`/telegram/link`,
      `core.telegram_link_account`); Guest Mode answers (2026-10-23)
- [x] Mascot: `brand/mascot`, SAL/Mascot in the Design System
- [ ] Live: the owner's steps above

### Waraq (2026-10-14)
- [x] Database: desks, types, named desks' intake and decisions, the piece
      workflow (author approval, three approvals, publish rule, scheduling,
      unpublish, corrections, front page), pen names, Editions, masthead
      roles, Edition 1 call (Oct 25 – Dec 3; decisions Dec 17)
- [x] Nexus: submit by desk and type, the newsroom, editing with the author,
      approvals, front page, Editions
- [x] auibsal.org/waraq: front page, layouts by type, sections, Editions,
      author pages, both languages (no redirects from the old /journal pages,
      owner, Oct 14, 2026)
- [x] Author letters (received, fix request, acceptance, acceptance with
      edits, decline, edit note, final check, published), decisions held to
      the call's day, the Sunday Paper (Sundays 9 AM), the Notion content
      calendar's "Waraq" kind, Waraq pipeline counts by desk
- [ ] Launch invitation and shortlisted-decline letters (the handbook's
      wording needs the counts and readers' sentences the editors choose)
- [ ] Copy accepted Gallery images from the private submissions bucket to
      the piece (editors upload them in the piece for now)

### Foundation (§3)
- [x] `bun run init`; remove payments, Wayl, commerce config, Capacitor, native auth
- [x] Email auth: password + magic link + reset, AUIB auto-verify, other domains → queue
- [x] Phone OTP off (config.toml), SMS hook removed
- [x] Analytics: GA4 on web only behind `NEXT_PUBLIC_GA_ID`
- [x] `project.json` filled (names, motto, hosts, locales, region, journal defaults)
- [x] Shared session cookie (`NEXT_PUBLIC_AUTH_COOKIE_DOMAIN=.auibsal.org`)
- [x] `@repo/rbac` (with drift test against the SQL seed)
- [x] `@repo/sal-data` (schemas tested against SQL constraints)
- [x] AGENTS.md / README / ARCHITECTURE_AND_INTEGRATIONS.md rewritten for SAL
- [x] check-placeholders clean
- [x] Supabase Auth email templates (bilingual, branded) in `supabase/templates` (production: dashboard, see Blocked)

### Design system (§4)
- [x] Tokens → CSS variables, generated from `brand/tokens.json` (tests: palette, contrast, staleness)
- [x] shadcn variables aliased to role tokens; ink theme via `data-theme="dark"`
- [x] No shadows (theme-level), 8px card radius, hairline/band utilities (print; screens below)
- [x] Screens: `frame` and `offset` roles, `radius-screen` 0, `shadow-offset` (mirrors in RTL, `press` collapses it), `type-label`, Arabic never tracked; buttons and form controls restyled; light islands inside ink
- [x] Screens: public header (five sections, sticky), home, ink footer; Nexus shell on ink; auth on a light sheet
- [ ] Screens: remaining public pages (events list, the Journal, about, join) and admin screens get the framed cards
- [x] Ubuntu / Ubuntu Mono / Amiri / Literata via next/font/google
- [x] Ubuntu Arabic via next/font/local (byte-checked against brand/fonts)
- [x] Type styles from the brand (Display 1.02, Lede 300/1.3, Body 1.5, Caption 1.4, Kicker 0.06em); `:lang(ar)` one step larger, 1.8–2.0 leading, 1.4 at display
- [x] Logos in web/app public/brand (byte-checked), favicon = sal-avatar.svg
- [x] Open Graph images (apps/web `/[locale]/og`; Arabic laid out word by word, since Satori has no bidi)
- [x] Storybook: light/ink themes and an LTR/RTL toolbar; SAL stories
- [ ] Re-theme pass over every shadcn story in both directions (visual check)
- [x] FormHeader, DocumentHeader, DocumentFooter, SocialPost ported from brand/components; SalCard
- [x] Copy formats: `formatLongDate`, `formatClock`, `formatIqd` (tested)
- [x] Skip link, visible focus, reduced motion, functional icons only so far

### Database (§5)
- [x] `core`, `access` (has_permission, assign_role, end_role_assignment, my_permissions)
- [x] `membership` (tiers, versioned pledges, verification queue, activity, voting, calendar tokens)
- [x] `events` (RSVP, capacity, waitlist promotion, check-in → activity, staff, campus cache)
- [x] `journal` (2 per call, 3 per hour, rubric v2, third read, transitions, decisions, reveal, agreements)
- [x] `charity` (append-only ledger, two counters, second-person sign-off, counted totals, Warmth Meter)
- [x] `programmes` (episodes, reels, Six Words, rotas/shifts, removal requests with 24-hour clock)
- [x] `governance` (minutes, resolutions, spending thresholds, library, elections, ranked-choice count)
- [x] `content` (pages, news, media, homepage slots, announcements, document index, published-only search)
- [x] Activity-log triggers (never on ballots or receipts)
- [x] Storage buckets + policies; revalidation and scheduled-publish functions
- [x] Reference data: permissions, roles, bundles, programs, settings
- [x] pgTAP: 176 assertions in 8 files; CI fails on a table without RLS
- [x] Generated types (CI diffs them)
- [ ] pgTAP coverage for the remaining policies one by one (content admin writes, governance minutes, library)
- [ ] Seed production data (semesters, settings) — **blocked on dates/URLs**

### Nexus — member (§7)
- [x] Sign-in (password or magic link), sign-up (return URL), forgot/reset, callback
- [x] Verification-pending screen for non-AUIB accounts
- [x] `/setup`: both pledges (versioned, re-accept on change), language, notifications, camera-shy, personal email
- [x] Home: membership card + QR, next events + ticket QR + cancel + .ics, voting eligibility, notices, the Journal call countdown + my submissions, programs, calendar feed (copy/reset), Six Words
- [x] Profile and privacy, account deletion through apps/api
- [x] Phone notifications (Web Push, free, no vendor): the Nexus is
      installable (manifest, `public/sw.js`); Profile and privacy turns them
      on per device (`core.push_subscriptions`, RLS, `core.save_push_subscription`),
      with a test notice; sign-out removes the device; every outbox notice
      to a member also goes to their devices after the email (`apps/api/lib/push.ts`).
      iPhone needs the Nexus on the Home Screen (iOS 16.4+).
- [x] Sign in with SAL: consent page (`/oauth/consent`), Connected apps in
      Profile and privacy (disconnect), Settings → Third-party apps
- [ ] Sign in with SAL next: file submissions and publishing through `/v1`,
      signed webhooks to apps, an OpenAPI description (`docs/platform/api.md`)
- [x] Events page: browse, book with registration questions, places left, waitlist join/leave, give a place back (tickets stay on Home); the public RSVP button links to the event's card
- [ ] Past attendance on the Events page
- [x] Journal: submit (rich text or files, translation fields, Human Authorship reconfirmed each time), my submissions, revise when returned, withdraw, sign the Publication Agreement (text is `TODO(content)`)
- [x] Programs: rotas with upcoming shifts, places left (`programmes.shift_places`), sign up, give back
- [x] Productions (Programs → Productions): open auditions with sign-up, and for the company their credits (show my name or not) and rehearsals
- [x] Forms (Account → Forms): fill in, save drafts, send, print; anonymous concerns; checklists and dossiers kept up to date by their subject; links to the forms that live in other sections
- [ ] Society (Book of Members, roster, minutes, elections)

### Nexus — admin (§8)
- [x] Shell and module gating by permission (UX only; RLS and RPCs enforce)
- [x] Overview (`core.admin_overview()`), Members (directory, verification queue, tiers, manual activity, roles via `access.assign_role`)
- [x] Events (editor, questions, attendance, camera QR check-in)
- [x] Content (news, pages, announcements, homepage slots, media library; live co-editing on Supabase Realtime)
- [x] Officer handbook in the team's Notion workspace, linked from Account → Officer handbook (until Oct 10, 2026 it was edited in the Nexus)
- [x] Charity (campaigns, ledger with sign-off and reversals, receipts through signed URLs; winter-set cost is a placeholder setting)
- [x] Programs, Governance (minutes co-edited, elections, spending, library uploads), Activity log, Settings
- [x] Productions (`/admin/productions`): stages, rights clearance by a second person, auditions with private panel notes, cast and crew credits, hours as service, rehearsals, performances linked to events, partners, Program Report (F-25 B), drafted certificates; public page auibsal.org/productions
- [x] Forms and letters (`/admin/forms`): a queue per form with acknowledge and answer dates, office-use boxes, print; standard letters L-01 to L-10 and F-05 to fill in, copy and print
- [x] Journal issues, pieces, contributors; accepted work becomes a draft piece; publishing blocked until the agreement is signed
- [x] Journal pipeline (`/admin/pipeline`): per-issue tabs by role — my reading (rubric v2 scoring), intake (return for formatting, send to blind review, originals via `/files/submission`), reader assignment, drag-and-drop board with a keyboard Move menu, selection by average and band, decisions with author reveal, Advisory Board flagged view, calls
- [x] Blind copies: `/files/blind` strips PDF info/XMP/annotation authors, image EXIF, DOCX properties and revision authors; never falls back to the original
- [x] CSV exports through apps/api (members, attendance, ledger, spending)
- [x] Migrations `20261005000000_admin`, `…0100_waraq_publishing` and `…0200_waraq_pipeline` applied to production (2026-10-06)

### Public site (§6)
- [x] Layout (skip link, header, footer, language switch), home (events, the Journal, Warmth Meter, calls, join band), 404
- [x] Revalidation route (cache tags), sitemap (existing pages only, hreflang), robots
- [x] Documents as text (`governance.society_documents`, migration `20261010000100`): the six public documents are pages on auibsal.org/documents with a table of contents and their status; internal ones (Founding Proposal, Operations Playbook, Templates & Forms, Printables) are read in the Nexus (Account → Society documents) by officers who read the internal library; governance managers edit every document in Admin → Documents (tables included). No PDFs are published.
- [x] Events: upcoming and past lists, detail (canceled notice, sanitized body, image, RSVP in the Nexus, add-to-calendar .ics), calendar subscription (webcal)
- [x] Journal: hub (open calls → submit in the Nexus, issues, latest), issue, piece and contributor pages; members-only text stays in the Nexus (`/journal/piece?slug=`)
- [x] About (Constitution preamble, motto, mission and "At a Glance", marked as quoted from the draft; Handbook pillars), Programs (Handbook summaries, migration `20261006000000`), Join (Handbook steps and membership table; the Arabic is the Handbook's own welcome page where it exists)
- [x] Give + transparency (Warmth Meter from signed-off money only, public receipts, impact, P7.5), News (list, post), Contact (channels, concerns), Media kit (name rules, logos as supplied, palette), Privacy (P5 and P6 verbatim, platform facts), Side Quest care + removal form (`apps/api /removal-requests`, rate-limited, honeypot), Search (published rows + document registry), drawn share images (`/[locale]/og`, default for every page)
- [ ] Structured data (JSON-LD)

### API (§11)
- [x] Account deletion; keep-alive cron; iCal: member feed, per-event, public feed
- [x] `/hooks/outbox`: emails + revalidation. An insert trigger calls it via
      pg_net (bearer from Vault); a drain every 10 minutes retries, up to 5
      attempts, recording `last_error`
- [x] Email templates (bilingual, recipient's language first; `@repo/email`
      `Notice` + `copy.ts`) and Resend sending
- [x] Cron (pg_cron): hourly AUIB calendar sync → `core.external_events`;
      daily 7:45 AM Baghdad reminders, agreement reminders, role-expiry
      notices, overdue removal requests; scheduled publishing every 10 minutes
      (a piece without a signed agreement no longer blocks the others)
- [ ] Signed URLs (blind copies with metadata stripped, receipts), CSV exports, removal-request + contact endpoints with rate limits
- [x] Public API `/v1` (me, Journal calls, issues, submissions, reviews and
      scores, entries and decisions), run as the member with RLS; app tokens
      accepted only there
- [x] Web Push sender (`lib/push.ts`) and `/push/test`

### Infrastructure (§12)
- [x] Supabase project, migrations, buckets, exposed schemas, Auth URLs, FK indexes
- [ ] Supabase SMTP (Resend, dashboard); [x] outbox trigger and Vault secrets; 52 "multiple permissive policies" advisor warnings (deferred)
- [x] Vercel projects, env vars, domains, cron, previews
- [x] CI: lint, typecheck, unit, repo checks, tokens check, pgTAP, type diff, integration, builds, client-bundle secret scan
- [ ] CI: Playwright e2e against previews; migrations on merge to `main`

### Acceptance tests (§13)
Covered by automated tests so far:
- [x] No self-promotion by metadata, direct writes or RPCs (pgTAP 10_access)
- [x] Reader's API responses carry no author identity before a decision (sal-data integration)
- [x] No submission or receipt file without a signed URL (storage integration)
- [x] Every table has RLS (pgTAP 00_structure)
- [x] Members-only events hidden from visitors and search (pgTAP 30_events); public feeds filter them (apps/api)
- [x] Ballots unreadable by any client role; one ballot per voter (pgTAP 60_governance)
- [x] Ledger not editable or deletable; unsigned entries excluded (pgTAP 50_charity)
- [x] All categories accepted; third submission rejected (pgTAP 40_journal)
- [x] Rubric limits identical in zod, form and DB; spread > 20 → third read (sal-data + pgTAP)
- [x] Voting eligibility boundary (pgTAP 20_membership)
- [x] Waitlist promotion on cancel (pgTAP 30_events)
- [x] Spending approvals reject over-threshold pairs (pgTAP 60_governance)
- [x] Assignments stop at `ends_at` (pgTAP 10_access)
- [ ] Sitemap lists only existing pages with alternates (e2e)
- [ ] Every page renders in /ar and /en (e2e); check-rtl and check-i18n pass ✓ so far
- [x] Document pages show correct status (registry test: every docs-source PDF registered; none marked adopted before ratification)
- [ ] Emails arrive bilingual and on brand (needs Resend)
- [ ] Secrets absent from builds — CI scan in place; verify on production builds

## Content still needed

- TODO(content): official logo files for AUIB, the Office of Student Life,
  the College of Arts and Sciences and AUIB Press (`apps/web/public/institutions/`,
  then `apps/web/lib/institutions.ts`); and descriptions/links for the
  College and the Press. Their names show until then.
- TODO(content): Arabic versions of the officer handbook pages, written in
  Notion (Handbook and internal documents → Officer handbook).
- The Journal, Second Chapter and Side Quest documents listed above.
- A formal Human Authorship pledge wording: the setup page shows Policy
  Manual P10.1 (English verbatim) until one exists. The Member Pledge is now
  the SAL-POL-01 text verbatim (the manual itself flags its Arabic for a
  native check).
- The Publication Agreement in the Nexus quotes Policy Manual P9.1, P9.2, P9.5
  and P10.1 (no separate agreement exists in the documents); its last line,
  naming the purpose agreed (the Journal online and in print, and the archive), was
  written for the platform — confirm it.
- The Common Room's Telegram link and the Faculty Advisor's name (both
  bilingual where relevant): Nexus → Administration → Settings → Society
  contacts. The Society email is set to `hello@auibsal.org`.
- Founders' Roll names: Content → pages → `about/founders`.
- The care promise for Side Quest beyond Policy Manual 5.3. (Program descriptions now come from the Member Handbook.)
- Traditions (Charter Night, the Ribbon, the Term Card) text: Content → pages → `about/traditions`.
- The first Second Chapter campaign (`second-chapter-2026`, draft, November 1–11): target and cost per set.
- Confirmed cost per winter set.
- The Issue 1 call's theme and eligibility text, if any (open theme until
  then), and the Journal Submission Guidelines it should link to.

- TODO(content): the text of the internal documents (Founding Proposal SAL-PRP-01, Operations Playbook SAL-OPS-01, Templates & Forms SAL-OPS-02, Printables SAL-PRT-01): paste it in the team's Notion workspace (Handbook and internal documents), where those pages wait for it. It stays out of this public repository.
- TODO(content): the Arabic summary of the Constitution and the Arabic welcome page of the Member Handbook (the PDFs' Arabic text layer could not be recovered); enter them as each document's Arabic text.
- TODO(content): Arabic versions of the standard letters (L-01 to L-10,
  F-05); the Templates & Forms has them in English only.
- The Media Release (F-17) is to be reviewed by Student Life before first
  use (as the form says).

## needs-native-review (Arabic written for the platform)

All Arabic written for the platform up to 2026-10-24 was reviewed by the
owner and approved ("reviewed across the board, it's all good"). List new
Arabic here as it is written.

Written 2026-10-26 (The IDEA Pass): `auth.pass.*` (with `unmatchedHint`),
`nexus.settings.passLine`.

Written 2026-10-25 (sign-up in fewer steps): `auth.signUp.outsideAuib`;
`nexus.setup.stepOf`, `back`, `continue`, `nameEn.title`, `nameAr.title`,
`photos.*`, `welcome.*`; `nexus.more.*` (title «أخبرنا المزيد»);
`web.events.nextLabel`, `nextOn`; `nexus.admin.kit.addressProgram`,
`addressEvent`.

Written 2026-10-25 (program sessions): `nexus.admin.programmes.tabs.sessions`
(«الجلسات»), `nexus.admin.programmes.sessions.*`.

Written 2026-10-25 (recovery codes and resets): `nexus.twoStep.lost`,
`recoveryBody`, `recoveryLabel`, `recoveryUse`, `recoveryFailed`;
`nexus.recoveryCodes.*` (title «احفظ رموز الاسترداد»);
`nexus.admin.member.twoStep.*`; the email `twoStepReset`.

Written 2026-10-25 (two-step wording for every role):
`nexus.twoStep.setupBody` («يصل دورك إلى أموال الجمعية أو سجلاتها أو
تصويتها…»).

Written 2026-10-25 (AUIB dates on What's on): `web.events.auib`
(«تقويم الجامعة»), `allDay` («طوال اليوم»), `hideAuib`, `showAuib`,
`auibLink`.

Written 2026-10-25 (partners): `nexus.partnerGuest.guestOf` («ضيف من
{partner}»), `settings`, `service`; `nexus.admin.charity.partnersMoved`,
`partnersLink`.

Written 2026-10-25 (the account): `nexus.nav.today` («اليوم»), `calendar`
(«تقويمي»), `callboard`, `record` («السجل»), `settings`; `nexus.settings.*`;
`nexus.forms.concern.*`; `nexus.events.title`, `lede`, `whatsOn`;
`nexus.service.title`; `nexus.profile.title`.

Written 2026-10-25 (the Callboard): `web.nav.involved` («شارك»),
`nexus.callboard.*` (title «لوحة النداءات»),
`nexus.admin.programmes.callboard.*`, `nexus.admin.programmes.tabs.roles`;
the email `openingReply`.

Written 2026-10-25 (Qirtas two doors): `nexus.journal.write.newsroomTitle`,
`newsroomLede`, `editionTitle`, `editionLede`, `noCall`, `nextCall`,
`tellMe`, `alertOn`, `alertOff`, `deskLines.*`; the categories `prose`,
`short_drama` («مسرح»), `comic` («قصص ومقالات مصوّرة»);
`nexus.home.sixWords.*`; `nexus.admin.programmes.sixWords.*`; the email
`callOpened` (`packages/email/copy.ts`).

Written 2026-10-25 (What's on): `web.nav.events` («ما يجري»),
`web.events.title`, `lede`, `all`, `series`, `everything`, `previous`,
`next`, `aboutSeries`, `noneMonth`, `ways.*`, `remind`, `remindHint`,
`inCalendar`, `dates`, `noDates`; `nexus.events.byInvitation`, `remind`,
`forget`, `notice.reminded`, `notice.forgotten`;
`nexus.admin.event.entry`, `entries.*`, `entryHint.*`, `invitations`,
`invitationsHint`, `noInvitations`, `invite`, `withdraw`.

Written 2026-10-25 (rosettes and one check): `web.verify.title`, `lede`,
`code`, `invalid`, `pattern`, `revokedShort`; `web.verifyCard.pattern`,
`record`; `nexus.home.card.showRecord`, `showRecordHint`;
`nexus.certificate.qr`.

Written 2026-10-25 (the live card): `nexus.home.card.*` (qr, clock,
wallet, perks, security, reset), `web.verifyCard.live`, `notLive`,
`perks`, `nexus.admin.checkIn.cardNotLive`.

Written 2026-10-25 (sign-in and email): `auth.humanCheck.*` (checking,
slow, retry, inApp, code), `auth.code.*`, `auth.errors.invalid_code`,
`auth.signIn.linkSent`, `auth.signUp.checkInboxBody`, `web.stopEmails.*`;
the auth email templates' code lines and the four security notices
(`packages/database/supabase/templates`); in `packages/email`: the
verification emails, the reminder lines, the Sunday Paper's stop line, the
footer and the pages the emails now point to (My calendar, Write for
Qirtas, the piece's page).

Written 2026-10-25 (Today's greeting and the live card):
`nexus.home.greetings.*` («صباح الخير يا», «طاب يومك يا», «مساء الخير يا»,
«أهلًا يا», «جمعة مباركة يا» {name}) and `nexus.home.card.live` («مباشر»).

Written 2026-10-25 (Membership): «العضوية» (`nexus.nav.account`,
`web.nav.account`, the Wallet pass link), «افتح «العضوية»» (emails and
Hudhud), «عضويتي», «عضويتك ومقاعدك» (Hudhud's /me), and the lines that
point to it (`nexus.events.lede`, `notice.booked`, `nexus.programs.yours`,
`notice.signedUp`, `web.privacy.platform.delete`).

Written 2026-10-25 (Wallet passes): `nexus.home.card.inWallet` («في Google
Wallet»), `nexus.admin.members.insights.inWallet`, and the pass's links
(«حسابك», «ما يجري», from the site's navigation) in `lib/api/wallet.ts`.

Written 2026-10-25 (personal email):

- `nexus.personalEmail.*` («البريد الشخصي», the why, states and errors),
  `nexus.setup.personalEmailLater`, `web.personalEmail.*` (the confirm
  page), `auth.errors.email_reserved`, and the confirmation email
  (`personalEmailConfirm` in `packages/email/copy.ts`).

Written 2026-10-25 (the card, names, details, one Qirtas):

- `nexus.home.card.*` (the card: «رقم {number}»، «عضو منذ»، «التصويت»،
  «اعرض الرمز بملء الشاشة»، «فقدت بطاقتك؟ احصل على رمز جديد» and the
  reissue text) and `web.verifyCard.*` (the card's public page).
- `auth.signUp.nameEn` «اسمك بالإنجليزية», `nameAr`, `givenName` «الاسم
  الأول», `familyName` «اسم العائلة», `namesHint`;
  `auth.errors.names_required`; `nexus.setup.name.*`.
- `nexus.details.*` («المزيد عنك» and every choice: affiliations, levels,
  genders, languages, interests, skills, how they heard, the consent).
- `nexus.admin.members.insights.*` («ما يخبرنا به الأعضاء»).
- `nexus.journal.write.*` (the writing page: processes, desk lines, calls),
  `nexus.admin.waraq.lede`, `tabs.review` «القراءة العمياء»,
  `nexus.admin.overview.openPipeline`.

Written 2026-10-24 (the Diwan overhaul):

- `web.about.constitution` «اقرأ الدستور»; «الغرفة المشتركة» (The Common
  Room); «حسابك الجامعي», «بالحساب الجامعي».
- `nexus.forms`: «الطلبات والبلاغات» and its page copy, and the action of
  each request (`defs.*.action`: «تقدّم لدور»، «اقترح بندًا على الجمعية
  العمومية»، «اعرض فكرة برنامج»، «خطّط لفعالية»، «اطلب استرداد مصروفات»،
  «سجّل عدّ النقد»، «إذن التصوير والنشر»، «أبلغ عن حادث»، «قدّم ملاحظة أو
  شكوى»، «جهّز ملف تسليمك»، «اكتب تقرير الفصل»، «أنهِ دورًا عند التسليم»،
  «اكتب ميثاق برنامج»، «قيّم مقابلة»، «استقبل صاحب دور جديد»).
- `nexus.society.takePart`, `nexus.programs.ideas`,
  `nexus.admin.overview.forRole`, `nexus.profile.lede`, `aboutYou` and
  `consent`.
- The members' pages leaving the Diwan: `nexus.nav.overview` «نظرة عامة»,
  `web.nav.account` «حسابك», «افتح حسابك» (emails and the bot), and the
  rewritten lines that no longer send members to the Diwan (`auth.signIn.title`,
  `auth.confirm.title`, `nexus.setup.*`, `nexus.twoStep.*`,
  `nexus.profile.push.*`, `nexus.offers.lede`, `nexus.partnerGuest.body`,
  `web.events.*`, `web.journal.submit`, `web.journal.readInNexus`,
  `web.join.*`, `web.privacy.*`, `web.verify.signedBy`,
  `web.newsletter.members`, and Hudhud's lines in `lib/api/bot/copy.ts`).

Written 2026-10-25 (the brand, Version 1):

- `web.home.lede`, `web.home.title` («والقرطاسُ والقلم.»), `web.home.evenings`,
  `web.home.specials`, `web.programmes.lede`, `weekly`, `weeklyNote`,
  `specials`; the media kit's Arabic lockup labels; `nexus.admin.events.lede`,
  `nexus.admin.settings.emails`.
- The four Supabase auth emails (`packages/database/supabase/templates`),
  the Arabic sample copy in the Storybook stories (SAL/Social, SAL/Screens).
