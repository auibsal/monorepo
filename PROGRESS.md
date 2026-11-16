# SAL platform: progress

The working checklist for auibsal.org. Every session starts here, after
`claude/decisions.md` and `claude/glossary_ar.md` (the read-only mirror of
the owner's files), and continues from the first open item. What is done
lives in git and the merged pull requests; this file keeps only what is
still open, and the owner's own steps.

Cleaned on Monday, November 16, 2026: the 200 finished items went (they are
in git and the merged pull requests); every open item stays, under the
session that raised it.

Branch: `claude/new-session-qosn60`, one pull request per prompt.

## Now: one job per platform (Nov 16)

The owner's rule: one place for each thing, and a platform's own feature
over the site's copy unless the platform's is capped or the site's is
better. Who does what is in `docs/platform/settings.md` and `secrets.md`.
- [ ] **Owner: Supabase.**
  - Settings → API Keys → **disable the legacy keys** (anon,
    service_role): nothing uses them.
  - Authentication → Emails → **SMTP Settings: turn off and clear.** The
    Send Email hook sends every auth email through the site, so Supabase
    never uses SMTP while it is on.
  - Providers → Email: minimum password length 12, secure password change
    on (above).
  - The GitHub integration's **"Supabase Preview"** check is skipped on
    every pull request (Branching is a paid feature; CI tests the database
    itself): remove the integration, or keep it only if Branching is bought.
- [ ] **Owner: Vercel → Environment Variables, delete** (read by nothing):
  `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_PUBLISHABLE_KEY`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, **`SUPABASE_SERVICE_ROLE_KEY`**,
  **`SUPABASE_JWT_SECRET`**, `POSTGRES_URL`, `POSTGRES_PRISMA_URL`,
  `POSTGRES_URL_NON_POOLING`, `POSTGRES_USER`, `POSTGRES_HOST`,
  `POSTGRES_PASSWORD`, `POSTGRES_DATABASE`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`,
  `VAPID_PRIVATE_KEY`. Vercel's `VERCEL_WEBHOOK_SECRET` is not set, so
  failed deploys reach no one: add the webhook (Settings → Webhooks,
  `https://auibsal.org/api/hooks/vercel`, deployment.error and
  deployment.canceled) and its secret, or rely on Vercel's own email for
  failed deploys and remove the route.
- [ ] **Owner: Resend → API Keys:** delete **"SMTP"** (it served only
  Supabase's SMTP). The keys named for another project are not the
  Society's; whoever owns them decides.
- [ ] **Owner: status.auibsal.org** points at Better Stack but no status
  page claims it (it redirects to Better Stack's home page), and no monitor
  checks auibsal.org (the Better Stack team in use is another
  organization's, its monitors paused). **Delete the CNAME today**; then,
  in a Better Stack team of the Society's own, a monitor on
  `https://auibsal.org` and `/api/health` and the status page, and the
  CNAME back (settings.md).
- [ ] **A decision for decisions.md** (The site): it keeps "Vercel's
  firewall as a second layer (its AI Bots rules on, Attack Challenge Mode
  only during an attack)", but the project has no firewall rules at all,
  and every request has passed Cloudflare first. Proposed: Cloudflare is
  the firewall (WAF, bots, AI crawlers, "I'm Under Attack"); Vercel keeps
  its default protection only.
- [ ] `CRON_SECRET` is shared by pg_cron (the cron routes) and GitHub (the
  workflow-failure hook); a leaked GitHub secret would open the cron
  routes. A secret per caller is the standard: a `WORKFLOW_HOOK_SECRET`
  when the workflows are next changed.

## Now: what is still open outside the code (checked Nov 16, evening)

- [ ] **Urgent: security.txt is 404.** The site's own went with #284;
  Cloudflare → Security → Settings → **security.txt** (fields in
  settings.md).
- [ ] Cloudflare's **managed robots.txt** is not on (robots.txt carries no
  AI crawler lines; "Block AI bots" still enforces).
- [ ] Cloudflare → Edge Certificates → **Minimum TLS Version: TLS 1.2**
  (SSL Labs, Nov 16: TLS 1.0 and 1.1 still accepted, grade B).
- [ ] **status.auibsal.org** still points at Better Stack with no page
  behind it: delete the CNAME.
- [ ] **Owner, after #286 merges:** GitHub → Settings → General → **Allow
  auto-merge** on, and **Automatically delete head branches** on. Under
  Branches, delete the 13 left over: `claude/brand-kit`,
  `claude/join-partners-hudhud`, `claude/mirror-nov16b`,
  `claude/mirror-nov16d`, `claude/pr6b-topics-translations`,
  `claude/qirtas-games-masthead` and the seven `dependabot/…`; close
  #279, #280, #287 and #288, then Insights → Dependency graph →
  Dependabot → bun → **Check for updates**, which opens the one grouped
  pull request.
- [ ] **OpenSSF Scorecard** (6.9; what each check needs):
  - Contributors (6): it finds two organizations (anthropics, theideaiq).
    Make your membership of the **auibsal** organization public (GitHub →
    auibsal → People → your name → Public): three is 10.
  - CII-Best-Practices (0): apply at bestpractices.dev with the repository
    (free, self-certified). Passing is 5, silver 7, gold 10; gold needs two
    maintainers, among other things.
  - Signed-Releases and Packaging: each production deploy is now a release
    with signed SLSA provenance (`release` in ci.yml): Signed-Releases
    reaches 10 after the next deploys. Packaging stays "not detected" (the
    site is not a package); a check that does not apply is not scored.
  - Code-Review (0) and Branch-Protection (3): both measure a second
    person. Code-Review counts the last 30 merges approved by someone other
    than their author; Branch-Protection's top marks need two required
    approvers, code owners' review, stale-approval dismissal, last-push
    approval and up-to-date branches. With one maintainer, requiring an
    approval would stop every merge. The step that counts: a second
    maintainer (an officer with a GitHub account, as decisions.md's handover
    of accounts foresees), then a ruleset on `main` requiring one approval
    with those options; two reviewers for 10.
  - License (9): 10 only with an OSI-approved license. The code is
    proprietary by the owner's choice; an open license (MIT for the code,
    with the brand and Qirtas's content excluded) is a decision, not a fix.
  - Maintained (0): the repository is under 90 days old; from early
    January the steady activity scores it 10 on its own.

## Now: the free standards (Nov 16)

- [ ] **Owner: GitHub → Settings → Code security** (all free): secret
  scanning and **push protection** on; **private vulnerability reporting**
  on (GitHub's own form beside security@, as SAL-GOV-07 allows).

## Now: the platform audit (Nov 16)

Against US practice (OWASP, NIST SP 800-63B, WCAG 2.2 AA, CAN-SPAM and
Gmail/Yahoo's sender rules, COPPA, OpenSSF Scorecard, Core Web Vitals), with
production's own evidence (Supabase advisors and cron, Vercel's runtime log,
the live headers, DNS and the outbox). Fixed in #283:

- [ ] **Owner, first:** add the backup's secrets (above, under the twentieth
  prompt): no off-site copy of the database has been made since Nov 13.
- [ ] **Owner:** Supabase → Authentication → Attack Protection: leaked
  password protection is **off** in production (the advisor says so;
  docs/platform/settings.md expects it on). The site's own check runs in the
  browser, so it can be bypassed by calling Supabase directly; Supabase's
  check runs on the server. Check the CAPTCHA (Turnstile) setting there too.
- [ ] **Owner:** four emails gave up after five tries before the Resend key
  was fixed (two personal-email confirmations of Oct 25 and 30, an opening's
  reply of Oct 31, a role notice of Nov 4): send them again or tell the
  people; the health check now reports such emails once.
- [ ] **Owner:** adopt SAL-GOV-07 (the disclosure policy is "Version 1,
  proposed").
- [ ] **Owner: Cloudflare** (its Security Center, Nov 10; the owner's rule
  of Nov 16, Cloudflare first at the edge; every setting in
  `docs/platform/settings.md`, Cloudflare):
  - **Before merging #284:** Security → Settings → **security.txt**, with
    the fields in settings.md; the site stops serving its own. And the
    **managed robots.txt** (Security → Settings → Bot traffic → AI Crawler
    and Agent access policies → Training: Disallow; Bot Preference Sync
    on): the site's robots.txt no longer lists the AI crawlers.
  - SSL/TLS → Edge Certificates → **Minimum TLS Version: TLS 1.2**. SSL
    Labs (Nov 16) finds TLS 1.0 and 1.1 still accepted on auibsal.org and
    www (grade B).
  - Edge Certificates → **HSTS**: keep it on (12 months, subdomains,
    preload), with **No-Sniff off** (the site sends that header with its
    others); the site no longer sends its own HSTS.
  - **A decision for decisions.md** (The site): it keeps Vercel's
    firewall "as a second layer (its AI Bots rules on)", but with the
    `*.vercel.app` addresses behind Vercel's login every request has
    already passed Cloudflare, whose "Block AI bots" does the same. The
    proposal: AI bots are blocked by Cloudflare and robots.txt only, and
    Vercel's AI Bots rule goes off.
  - Bot Fight Mode stays off (decisions.md, The site). JavaScript
    Detections has no switch on the free plan: it stays.
  - Page Shield's continuous script monitoring stays on (turned back on,
    Nov 16).
  - Speed → Optimization: **Speed Brain off** (the site preloads its own
    pages; Cloudflare's whole-page fetches go unused), **Early Hints on**,
    **0-RTT off**. Email → **DMARC Management** stays on.
  - **A decision for decisions.md** (The site): in an attack, Cloudflare's
    "I'm Under Attack" mode only, not Vercel's Attack Challenge Mode as
    well (every request reaches Vercel through Cloudflare, so the two
    would challenge the same visitor twice).
- [ ] **Owner: production's Auth settings** (read Nov 16): the CAPTCHA
  (Turnstile) is on, refresh tokens rotate, emailed codes are 8 digits.
  Not as AGENTS.md and `supabase/config.toml` say:
  - Authentication → Providers → Email: **Minimum password length 6**, set
    12 (the site checks 12 in the browser, but Supabase takes 6 from
    anyone calling it directly); **Secure password change off**, turn it
    on (a code by email for a change on an old sign-in).
  - Attack Protection: leaked password protection off, and Sessions: no
    30-day time-box. Both need Supabase Pro (the API refused the time-box
    as "Pro Plans and up"); until then the site's own breach check
    (`/api/password-check`) covers the site's forms.
- The notes on COPPA and CAN-SPAM describe US practice; the Society is in
  Iraq, and they are not legal advice: AUIB's counsel, or a lawyer in
  Iraq, decides what applies.

## Now: the twentieth site prompt (Nov 16)

- [ ] **Owner:** the nightly backup has failed since Nov 13 because
  `BACKUP_PASSPHRASE` is not set in GitHub's production environment (nor
  the R2 secrets `R2_ACCOUNT_ID`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`,
  `R2_SECRET_ACCESS_KEY`, nor `RESEND_TOKEN`, so no email went). Add them,
  and `CRON_SECRET` (the same value as on Vercel) so a failed backup,
  migration or deploy posts to the web topic; `VERCEL_TOKEN` is still owed
  for the deploy wait.
- [ ] **Owner:** in the Diwan group, give the new **web** topic a thread
  (Media → Channels) so the web alerts have their own topic; until then
  they go to the brief's or Announcements.
- [ ] **Owner:** Settings → Code security: turn on Dependabot security
  updates (the config groups them).
- [ ] **Owner:** the promo kit's reference design (it replaces the
  interim layout in `components/diwan/admin/events/promo/draw.ts`).
- [ ] Events have no short address of their own (decisions.md lists
  /haven, /tour and /join); the kit prints and encodes the event's own
  address, auibsal.org/events/<slug>, until one is decided.
- [ ] Still in two places: Notion's Meetings rows hold a meeting's date
  (When) beside its event's; the event's day now wins when a row links its
  event, but a meeting with no event row is dated from Notion.

## Now: the nineteenth site prompt (Nov 15)

- [ ] TODO(content): Edition 1's title (its theme), proposed by the
  Editor-in-Chief and approved with the Managing Editor before Mon, Dec 7; the Desk
  shows it as a to-do. Then set Edition 1's deadline on its Call tab and
  publish the call.
- [ ] **Owner:** add `VERCEL_TOKEN` (a read token) to the production
  environment's secrets, so the migrate run follows the hook's build.
- [ ] **Owner:** upload the Iraqi Independent Film Center's logo (one PNG,
  transparent, at least 600 pixels high) on its entry in Partnerships.

## Now: the sixteenth site prompt (Nov 15)

- [ ] **Owner:** fill the Sun Nov 22 screening's "Good to know" in the
  Diwan's event page once this is live.

## Now: the fourteenth and fifteenth site prompts (Nov 15)

- [ ] Logos: see the seventeenth prompt (three entries, the Desk counts
  them).

## Now: the ninth to twelfth site prompts (Nov 14)

All in PR #269.

- [ ] **Owner:** the summaries of the 13 agreements, three lines in each
  language (the Governance chat); the Terms of Use's AI line in Notion
  (GOV); the 13 kinds in SAL-EXB-01's register in Notion; R2's lifecycle
  at 30 days (Cloudflare → R2 → the bucket → Settings); Supabase's session
  time-box at 30 days (Authentication → Sessions, Pro); after this
  deploys, delete `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY`
  in Vercel, and correct the comments that name the Nexus or sal-api
  (`NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`,
  `NEXT_PUBLIC_AUTH_COOKIE_DOMAIN`, `TELEGRAM_WEBHOOK_SECRET`,
  `REVALIDATE_SECRET`).

## Now: one notices model and staff alerts (Nov 12, night)

- [ ] **Owner:** in Vercel (Project → Settings → Webhooks), add a webhook
  to `https://auibsal.org/api/hooks/vercel` for `deployment.error` and
  `deployment.canceled`, and put its secret in Vercel as
  `VERCEL_WEBHOOK_SECRET` (Production).
- [ ] **Owner:** in Media → Channels, set the Diwan group's topics for the
  teams (Council, Qirtas, Media, Events, Membership, Partnerships); a team
  without one posts to the brief's topic.

## Now: Hudhud (Nov 12, night)

- [ ] **Owner:** in both groups, give Hudhud **Add New Admins** (and every
  other right but Remain Anonymous), so it can make the officers admins.

## Now: temporary (Nov 12)

- [ ] **Undo when testing is done:** a migration deleting the 23 grants
  listed there; restore the President test in `lib/rbac/rbac.test.ts` and
  `roles.ts`; drop the set-aside block from `95_journal_pipeline`,
  `99_president_absence`, `99_qirtas_by_the_decisions` and
  `99_two_officers`, and `99_president_temporary.test.sql`; restore
  `private.second_officer()` and `private.has_permission()` and drop
  `private.is_president()`.

## Now: the ninth prompt (Nov 12)

- [ ] **Owner:** save the workspace's invite link in the Desk's Connected
  panel (Notion: Settings, People, Invite link), remove the people on the
  "To remove" list in Notion, then press "Send the invitation".

## Now: the seventh prompt (Nov 12)

- **Governance chat:** the register's seventeen kinds and the templates
  index, in `docs/platform/agreements.md`.

## Now: the fifth prompt (Nov 12, morning)

- **Owner:** SAL-EXB-01 in Notion: F-38 now asks the student's first name,
  family name and email (their account's address); F-39 and F-46 no
  longer ask the student's name or school (the link names the student).
  Update the register's entries when convenient; the CI check passes either
  way.

## Now: the third prompt (Nov 12, the whole review)

Built in this order, one commit per part, in one pull request. Each line
says what changes; **Migrates** says what a migration changes in
production; **Owner** is a step only the owner can take.

### 0. The fourth prompt (Nov 12, late), folded into this plan
Replaces the mirror (decisions.md and glossary_ar.md of Nov 12, late).
First the second prompt's part 2 (7j), then the rest in place.

### 11. Language (first: it touches every part)

### 1. Accounts and sign-in (decisions.md, Members)

### 2. Records, receipts and agreements (decisions.md, Documents and forms)

### 3. Governance (decisions.md, Governance)

### 4. Qirtas (decisions.md, Qirtas)

### 5. Events (decisions.md, Events)

### 6. The frame (decisions.md, The site)

### 7. Pages (decisions.md, The site)

### 8. Email (decisions.md, Channels and email)
- [ ] **Owner:** Resend open and click tracking off; bounce and complaint
  webhooks (in place); one sending-only key per use; Supabase's SMTP set to
  Resend, or the hook's secret (steps in `docs/platform/email.md`).

### 9. Platform and settings
- [ ] **Owner:** ~~news.auibsal.org in Resend~~ (done, Nov 12); a free public
  status page at status.auibsal.org fed by the uptime check; Supabase's
  email confirmation and leaked-password protection on, short token
  lifetimes, network restrictions where the plan allows; Cloudflare's
  settings (WAF, bot protection, DDoS, SSL Full (strict), file caching,
  the real visitor IP passed through; Email Address Obfuscation, Rocket
  Loader and minify off). The exact steps are in `docs/platform/settings.md`.

### 10. Hudhud and Telegram

## Open from earlier prompts

- [ ] **The 15 AUIB pieces** go through the staff lane: each is assigned to
  a staff writer, who writes it anew from the Qirtas chat's fact sheet; it
  runs under the writer's byline, dated on or near its event. The AI text
  is deleted once each is rewritten. Pieces 5 and 15 are the News editor's
  call.
- [ ] **"From the Society": the two notices dated Nov 8** ("auibsal.org is
  open", "The Society's documents are online"): Media posts each from The
  Council → Announcements as post only, dated Nov 8.
- [ ] **Haven, the pilot:** the call closes Sunday, December 6, at 11:59
  p.m. Baghdad time; decision letters on December 13; publication
  Wednesday, December 16 (a draft until the Editor-in-Chief schedules it).
  The call's announcement can go out now that #264 is live.
- [ ] **The copy desk:** until a copy editor is appointed, the
  Editor-in-Chief or the Managing Editor gives the copy edit on text
  pieces.
- [ ] **The writing workshop** moves to Tuesday, December 8, 2:30–4:00
  p.m.: a draft in Notion until its room is confirmed, then Ready to
  publish.
- [ ] **The four director openings** stay closed until the Executive
  Board's approval is recorded on each (Diwan → Membership → Openings).
- [ ] **EDT-02:** confirm the Library no longer lists it after the sync.
- [ ] **GOV-04's text:** the Sunday Paper comes from qirtas@auibsal.org and
  is sent by the Managing Editor.
- [ ] **The team list** as one component: the Council page with covering,
  Our people, the masthead, Next Stop's credits, the Company's playbills,
  an event's lead and team.
- [ ] **The staging loop:** create, publish and edit an event and a
  document from Notion once a staging URL and its keys exist.
- [ ] **Notion's Content calendar:** the Qirtas chat deletes the "Qirtas"
  kind and its Desk and Author fields; the Media chat trashes the four
  "News post" rows. Notion's "Dated" property (Documents) can go.
- [ ] **The sound logo's four MP4s:** Media uploads them on the design page
  (Diwan → Media → Design → Video); they live in the private `brand-kit`
  bucket, never in git.

## For the owner: settings and secrets

Checked against production on Nov 9 and Nov 11 unless a line says
otherwise. The tool accounts stay with the President's AUIB email, with
officers as admins and two-step on (decisions.md, Where things live).

- [ ] **The nightly backup still fails** (data at risk). GitHub → Settings →
  Environments → production: add `BACKUP_PASSPHRASE` (a long generated
  passphrase, kept by the account owner: no backup can be read without
  it) and `RESEND_TOKEN` (a sending key, so a failed backup emails
  hello@). Add the repository variable `SUPABASE_PROJECT_REF`. Run "Back
  up production database" once from Actions; it should turn green. For the
  second copy: a private Cloudflare R2 bucket and a write-only token
  (`R2_ACCOUNT_ID`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`,
  `R2_SECRET_ACCESS_KEY`; a 12-month lifecycle rule). Each quarter, the
  restore test in `docs/platform/backups.md`.
- [ ] **The forms register check:** GitHub → Actions secrets:
  `NOTION_TOKEN` (the SAL Platform connection's secret), then the variable
  `REQUIRE_FORMS_REGISTER` = `1`.
- [ ] **GitHub → Rules:** a ruleset on `main` requiring a pull request and
  the checks "Lint, typecheck, test", "Build apps", "Database (migrations,
  RLS, integration)" and "End-to-end (Playwright + axe)", and blocking
  force pushes and deletion. Add the variable `DEPENDENCY_REVIEW` = `on`.
- [ ] **Vercel → Environment Variables:** delete the eight `POSTGRES_*`,
  `SUPABASE_ANON_KEY`, `SUPABASE_PUBLISHABLE_KEY`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_JWT_SECRET`,
  `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_URL` (nothing reads them);
  fix the old comments on `TELEGRAM_WEBHOOK_SECRET`,
  `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `NEXT_PUBLIC_SITE_URL`,
  `NEXT_PUBLIC_AUTH_COOKIE_DOMAIN` and `REVALIDATE_SECRET`.
- [ ] **Supabase → Authentication → Hooks → Send Email:** HTTPS,
  `https://auibsal.org/api/hooks/auth-email`; its secret (`v1,whsec_…`)
  into Vercel as `SEND_EMAIL_HOOK_SECRET`. Until then, paste the eight
  templates and subjects from `packages/database/supabase/templates`.
- [ ] **Supabase → API → Exposed schemas:** remove `charity` if it is still
  listed.
- [ ] **Zoho and DNS:** Cloudflare → Email → Email Routing → Disable
  (decline its MX records); change the root SPF record to
  `v=spf1 include:zohomail.com ~all`. Leave DMARC, DKIM and Resend's
  records as they are. Send a test from hello@ to a Gmail address: SPF,
  DKIM and DMARC should all pass.
- [ ] **Cloudflare:** turn off Web Analytics' automatic setup (the CSP
  blocks its beacon), and the settings of part 9. (Zaraz off, Nov 16.)
- [ ] **Hudhud:** Diwan → Desk → Connected → Hudhud → reconnect (the
  webhook at `/api/hooks/telegram` and the leaving updates); check with
  `/start` to @auibsal_bot. BotFather → Bot Settings → Main App: URL
  `https://auibsal.org/qirtas/games/word`. If Google Wallet's callback was
  set by hand, change it to `https://auibsal.org/api/hooks/wallet`.
- [ ] **Notion → Connections → SAL Platform:** confirm "Read user
  information including email addresses" (the sync needs it to know who
  set Ready to publish). Optional: the webhook
  `https://auibsal.org/api/hooks/notion` (`docs/platform/notion.md`).
- [ ] **Google Wallet:** request publishing access; until then passes say
  "[TEST ONLY]".
- [ ] **Privacy Notice (SAL-GOV-04):** the Governance chat adds the vendor
  list (`docs/platform/vendors.md`, Zoho Mail among them), the three
  cookies and the retention rows (`docs/platform/retention.md`).

## For the owner: the Society

- [ ] **Two-step before Sunday, November 22:** every officer and every role
  that sees personal data sets up an authenticator app (or signs in with a
  passkey) on Your account → Settings, and makes the ten recovery codes,
  kept away from the phone. Until then they are locked out of what needs
  it; whoever holds `roles.assign` can reset a lost one.
- [ ] **Officers' legal names:** the Director of Membership (the Secretary
  meanwhile) enters the names the owner gave on Nov 8 on each member page
  (Diwan → Membership → the person → Their name), with a reason. The
  names are never kept in the repository. The Editor-in-Chief's English
  parts are still empty.
- [ ] **Roles on the site:** assign every holder on record on their member
  page; the Council page and the masthead come only from roles.
- [ ] **Telegram:** the members' group description (decisions.md), its
  Welcome Message and Aggressive Anti-Spam; Student Life's two admins,
  titled "Student Life", with no permissions.
- [ ] **The club fair invitation** (Diwan → Membership → Invitations):
  type in the paper sign-ups, send the test to the President, who says go;
  then shred the sheets. The list deletes itself thirty days later.
- [ ] **The Tour's station on Dec 1:** the event's lead adds a "Tour
  station" shift; a volunteer attaches a typed page to a Member's card, a
  Guest card and a pending Associate request at `/account/station`; the
  Director of Membership decides the request.
- [ ] **The dated events** (decisions.md, Calendar) go into Notion's Events
  once rooms and times are confirmed with Student Life; the al-Mutanabbi
  Street trip publishes only after Student Life's written approval is
  recorded on its Diwan page.
- [ ] **The partner memorandum:** if the Society adopts a standard text, it
  replaces the Policy Manual's lines at `/partners/apply`.
- [ ] **The founding documents in Notion:** amend any text that still names
  retired things before the Founding Meeting (Tue Mar 30, 2027).
