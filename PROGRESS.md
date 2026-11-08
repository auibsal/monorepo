# SAL platform: progress

The working checklist for auibsal.org. Every session starts here, after
`claude/decisions.md`, and continues from the first open item. What is
done lives in git and the merged pull requests; this file keeps only what
is still open.

Rewritten on Saturday, November 7, 2026, against the decisions of Nov 6
and 7, with every older item checked against the code and production:
- **Done:** a done item was ticked.
- **Retired:** an item about something retired was closed (charity
  campaigns and the ledger, the Awards, the Apprenticeship and First Ink,
  rotas, prompts, book votes, Launch Night, programs and series, ads,
  Sign in with SAL, the native-review lists).
- **Superseded:** an item a later decision replaced was closed.

Branch: `claude/new-session-qosn60` (PR #238: both audits of Nov 7,
Part A first).

## Launch day (Sunday, November 8)

- [x] **Production is on** (unpaused Nov 7).
- [x] **The spring 2026 Tour invitation** went out on November 7 as one
  Resend Broadcast per kind. The invitation list is deleted on
  **December 7**.
- [ ] **Test the Tour's station at the Dec 1 event** (decisions §12): the
  event lead adds a "Tour station" shift and confirms the trained
  volunteers; they open `/account/station` during it, attach a page to a
  Member's card, a Guest card and a pending Associate request; the
  Director of Membership approves or declines the request.
- [ ] **The fall 2026 club fair invitation** (Membership → Invitations):
  staff type in the paper sign-ups, send the test to the President, and
  the President says go. That list is deleted thirty days after its own
  send.
- [x] **Merge PR #238 before joining opens** (merged Nov 7). Its migrations, applied by
  CI, change production data once:
  - every published event without a place goes back to draft, and the
    Nov 17 writing workshop is canceled;
  - the 22 News pieces backdated to Oct 14 are unpublished;
  - member and guest numbers are reassigned (the seats first, then by
    join date), then locked; saved Google Wallet passes are patched;
  - perks and offers are dropped;
  - the President's Qirtas and Prize permissions and the Acting
    President role go; the Vice President acts while the President is
    recorded absent.
- [x] **The Library re-sync**, then a check (Nov 8): the sync runs clean
  (its one error, the retired Programs database, is gone with PR #250);
  all 86 pages in the sitemap were read for retired names and codes, and
  the one found, "open nights" in the Company's line, is fixed by a
  migration.

## For the owner: dashboards and secrets

- [ ] **Before merging PR #250: the Deploy Hook.** Main now deploys
  only after its migrations (`apps/web/vercel.json` turns off Vercel's
  own main deploys; `migrate.yml` calls the hook). In Vercel → the web
  project → Settings → Git → Deploy Hooks, create one named "After
  migrations" for the branch `main`; copy its URL into GitHub → Settings
  → Environments → production as the secret `VERCEL_DEPLOY_HOOK`.
  Without it the migrate run fails and nothing deploys.
- [ ] **GitHub → Environments → production:** add `BACKUP_PASSPHRASE`.
  The nightly backup fails without it. Run it once from Actions to check.
- [ ] **GitHub → Actions secrets:** add `NOTION_TOKEN`, then the
  repository variable `REQUIRE_FORMS_REGISTER` = `1`. Until both are set,
  CI skips the forms register check (`bun run check:forms`).
- [ ] **GitHub → Rules:** a ruleset on `main` that:
  - requires a pull request;
  - requires the checks "Lint, typecheck, test", "Build apps", "Database
    (migrations, RLS, integration)" and "End-to-end (Playwright + axe)";
  - blocks force pushes and deletion.
- [ ] **GitHub → Code security:** the dependency graph, secret scanning
  and push protection are on (Nov 8). Add the repository variable
  `DEPENDENCY_REVIEW` = `on`.
- [ ] **Now that PR #249 is merged, reconnect Hudhud** (Diwan → Desk →
  Connected → Hudhud), so Telegram calls `/api/hooks/telegram`. Wallet
  moves by itself to `/api/hooks/wallet`, unless its callback was set by
  hand in the Google Pay console: then change it there.
- [ ] **The Notion webhook** (optional; the 15-minute sync runs anyway):
  subscribe `https://auibsal.org/api/hooks/notion` in the “SAL Platform”
  connection, copy the verification token from the Vercel log into Notion
  and into `NOTION_WEBHOOK_SECRET` (`docs/platform/notion.md`).
- [ ] **Supabase → API → Exposed schemas:** remove `charity`. The schema
  has been empty since Nov 7; a later migration drops it.
- [ ] **Supabase → Authentication → OAuth Server:** off. The database
  already refuses app tokens.
- [ ] **Supabase → Realtime → Settings:** turn off "Allow public access".
- [ ] **Supabase → Authentication → Emails:** confirm the eight templates
  and subjects match `packages/database/supabase/templates`.
- [ ] **Cloudflare DNS for auibsal.org:** add CAA records (still none on
  Nov 8):
  - `0 issue "letsencrypt.org"`
  - `0 issue "pki.goog"`
  - `0 issue "sectigo.com"`
  - `0 iodef "mailto:hello@auibsal.org"`
  (auibsal.org is already on the HSTS preload list.)
- [ ] **Cloudflare:** turn off Web Analytics' automatic setup if it is
  still on (the CSP blocks its beacon).
- [ ] **Vercel, auibsal:** remove the Sentry and Arcjet variables if they
  are still there:
  - `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`,
    `SENTRY_AUTH_TOKEN`, `ARCJET_KEY`;
  - also `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_WEB_URL` and
    `NEXT_PUBLIC_API_URL`;
  - and the GitHub secret `BACKUP_HEARTBEAT_URL`.
  Then delete the old `sal-emails` project.
- [ ] **Accounts and hosting** (decisions §6): move the Vercel and Supabase
  projects to the Society, owned by hello@auibsal.org with two officer
  admins, out of The IDEA's team.
- [ ] **Google Wallet console:** request publishing access. Until Google
  approves, only test accounts can save the card, and passes say "[TEST
  ONLY]".
- [ ] **Notion → Connections → SAL Platform → Capabilities:** confirm
  "Read user information including email addresses" is allowed. Without
  it the sync can't tell who set Ready to publish.

- [ ] **Vercel → Environment Variables (Production):** add
  `TURNSTILE_SECRET_KEY` (the widget's secret) and `RESEND_WEBHOOK_SECRET`;
  remove `RESEND_FROM` and any Google Tag Manager or Analytics variables.
  Turn on Web Analytics in the project.
- [ ] **Resend → Webhooks:** add `https://auibsal.org/api/hooks/resend` for
  `email.bounced` and `email.complained` (none is set up on Nov 8); its
  signing secret goes in Vercel as `RESEND_WEBHOOK_SECRET`. Until then a
  bounced address is written to again.
- [ ] **Telegram:** run the webhook setup again (Diwan → Media → Channels)
  so Hudhud receives `chat_member` updates (people leaving a group).
- [ ] **Backups:** add `RESEND_TOKEN` to the production environment (the
  failure email), and for the second copy a private Cloudflare R2 bucket
  with a write-only token: `R2_ACCOUNT_ID`, `R2_BUCKET`,
  `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY` (lifecycle: 12 months). Add
  the repository variable `SUPABASE_PROJECT_REF`. Run the first quarterly
  restore test (`docs/platform/backups.md`).
- [ ] **Privacy Notice (SAL-GOV-04):** the Governance chat adds the vendor
  list (`docs/platform/vendors.md`), the three cookies and the retention
  rows (`docs/platform/retention.md`), and confirms the periods
  decisions.md doesn't set (drafts, replies, removal requests, devices,
  guest accounts, Prize voters) in SAL-GOV-03.
- [ ] **Channels:** the YouTube and LinkedIn addresses, once they exist,
  go in `packages/config/project.json` (`channels`).

## For the owner: the Society

- [ ] **Recovery codes.** Only one of the six people holding a Council
  role has made a set (still one on Nov 8). Each makes one on Membership → Settings and keeps
  it away from their phone.
- [ ] **Arabic name parts.** Each officer sets their four Arabic name
  parts on Profile. Fajer Ezzet's and Mohammed-Ali Ohmaid's are on record
  (Nov 8); the General Secretary's and the Next Stop host's are not.
- [ ] **Roles on the site.** Assign every holder on record (decisions §4)
  on their member page, the Managing Editor and the Next Stop host among
  them. The Council page and the masthead come only from roles.
- [ ] **Telegram:**
  - the members' group description (decisions §6);
  - the Welcome Message and Aggressive Anti-Spam in the group's
    settings;
  - Student Life's two admins, titled "Student Life", with no
    permissions.
- [x] **Old Telegram columns** (owner's go, Nov 8): dropped by
  `20261108003900_old_telegram_columns.sql`.
- [ ] **The partner memorandum.** The memorandum a partner signs at
  `/partners/apply` is its own words and the Policy Manual's lines. If the
  Society adopts a standard text, it replaces them.
- [ ] **The founding documents in Notion:** amend any text that still
  names retired things before the Founding Meeting (Tue Mar 30, 2027).

## Open in the code

- [ ] **The staging loop.** Create, publish and edit an event and a
  document from Notion, once a staging URL and its keys are in the
  environment.
- [x] **The design system is part of the Diwan** (owner, Nov 8):
  `/diwan/media/design` is a Diwan page with the Diwan's header and menu,
  the design system's sections and entries listed on it, and each entry
  drawn in place at its own address, with no Storybook around it.
- [x] **Readers read the work, never the file** (owner, Nov 8): the
  readers' pledge (F-40, signed on the reading page) before the text; the text on the page and Gallery
  images marked with the reader's card number and the day; no file,
  download or file address to readers; copy, the context menu and print
  off on that page; originals by role, each opening in the submission's
  History (`20261108004100_reader_protections.sql`).
- [x] **Manuscripts read as written** (owner, Nov 8): PDF and Word text
  keeps verse lines, stanzas, paragraphs, headings, italics and Arabic
  order (`lib/text-layout.ts`); test manuscripts read word for word.
- [x] **Gallery images on acceptance** (PR #250): a piece accepted from a
  submission takes the writer's images, stripped of their metadata, with
  one button on its page (`/api/qirtas/images`).

- [x] **Audit F and E5** (PRs #244, #246, #248 and #249): one error
  shape and Bearer helper; Knip with exports and types;
  `noUncheckedIndexedAccess`; Bun and Playwright cached in CI; integration
  suites fail when they run no tests; ADRs in `docs/adr/`; a nonce-based
  CSP for your account and the Diwan; axe on every WCAG 2.1 A/AA rule; the
  public pages on a Pixel and an iPhone; keyboard journeys; signed share
  images; the Notion webhook; webhooks under `/api/hooks/*`.
- [ ] **Audit F, left open on purpose:**
  - F4 (after V1): moving DataTable, Field, ChoiceInput, Table, NavTabs,
    EmptyState, ErrorState and ActionBar into `packages/brand` with
    stories. They read the app's messages, auth and API helpers in 73
    files, so each must first take its labels as props: its own change.
  - F5: deploying only after migrations is done (Nov 8; the Deploy Hook
    is the owner's step above). Cache Components waits until after V1:
    published reads are already cached by tag and refreshed on publish;
    turning it on (tried Nov 8) needs the theme cookie out of the root
    layout and a real record for every dynamic route at build time, or
    the build fails on an empty table (Editions today). The bundle-size
    check is the performance budget the journeys already enforce on a
    mid-range phone (`apps/e2e/tests/performance.spec.ts`).
  - F6: dropping the `charity` schema (empty; after it leaves the exposed
    schemas). `supabase/setup-cli` is not needed: CI runs the CLI pinned
    in the lockfile.
  - F7: coverage minimums are set (PR #250, `vitest.config.ts`): two
    points under Nov 8's coverage.
  - F1: AGENTS.md is cut to the conventions (Nov 8; the domain is in
    `docs/platform/domain.md`). Left: the decisions.md date-line check
    (needs the attached copy's line).

## Content still needed

- [ ] TODO(content): official logo files for AUIB, the Office of Student
  Life, the College of Arts and Sciences and AUIB Press
  (`apps/web/public/institutions/`, then `apps/web/lib/institutions.ts`).
  Their names show until then.
- [ ] The dated events of decisions §7 (the pilots on Nov 17 and Dec 1,
  spring 2027's Tuesdays, the al-Mutanabbi Street trip on Apr 23) go into
  Notion's Events once the room and times are confirmed with Student Life.

## Closed in this rewrite (Nov 7, 2026)

- **Notion:**
  - the Meetings database's retired "General Assembly" option is removed
    (no row used it);
  - the Officers database already lists the nine seats;
  - the Programs database stays, unpublished, for history.
- **Production, checked:**
  - every migration through `20261108000000` is applied, so the deploy
    hook is not needed;
  - both Vault secrets are set and `platform.api_url` is right;
  - hello@auibsal.org has Cloudflare Email Routing (MX records present);
  - the founding-voters setting is gone.
- **The sitemap** lists every public page that exists (games, the
  masthead, topics, the archive, Write for Qirtas, Next Stop's episodes,
  the Company, Get involved). A new e2e test requests every address in
  both languages and expects each to be found.
- **Already done:**
  - search grouped by kind;
  - structured data (events, pieces, the site);
  - signed URLs and exports;
  - attendance in a member's year;
  - Next Stop's team from the Director of Media, the producer and the
    host;
  - the logos README.
- **AGENTS.md** is rewritten to the decisions of Nov 6 and 7.
