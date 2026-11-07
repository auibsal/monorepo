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
- [ ] **Merge PR #238 before joining opens.** Its migrations, applied by
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
- [ ] **The Library re-sync**, then a check:
  - run `/api/cron/notion-sync?documents=all` until it reports done;
  - check every public page for retired names and codes;
  - rename any Notion event that still carries a retired name.

## For the owner: dashboards and secrets

- [ ] **GitHub → Environments → production:** add `BACKUP_PASSPHRASE`.
  The nightly backup fails without it. Run it once from Actions to check.
- [ ] **GitHub → Actions secrets:** add `NOTION_TOKEN`. Without it, CI
  skips the forms register check (`bun run check:forms`).
- [ ] **GitHub → Rules:** a ruleset on `main` that:
  - requires a pull request;
  - requires the checks "Lint, typecheck, test", "Build apps", "Database
    (migrations, RLS, integration)" and "End-to-end (Playwright + axe)";
  - blocks force pushes and deletion.
- [ ] **GitHub → Code security:** turn on the dependency graph, secret
  scanning and push protection. Then add the repository variable
  `DEPENDENCY_REVIEW` = `on`.
- [ ] **Supabase → API → Exposed schemas:** remove `charity`. The schema
  has been empty since Nov 7; a later migration drops it.
- [ ] **Supabase → Authentication → OAuth Server:** off. The database
  already refuses app tokens.
- [ ] **Supabase → Realtime → Settings:** turn off "Allow public access".
- [ ] **Supabase → Authentication → Emails:** confirm the eight templates
  and subjects match `packages/database/supabase/templates`.
- [ ] **Cloudflare DNS for auibsal.org:** add CAA records (none are set
  today):
  - `0 issue "letsencrypt.org"`
  - `0 issue "pki.goog"`
  - `0 issue "sectigo.com"`
  - `0 iodef "mailto:hello@auibsal.org"`
  Then submit auibsal.org at hstspreload.org (the header already carries
  `preload`).
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

## For the owner: the Society

- [ ] **Recovery codes.** Only one of the six people holding a Council
  role has made a set. Each makes one on Membership → Settings and keeps
  it away from their phone.
- [ ] **Arabic name parts.** Each officer sets their four Arabic name
  parts on Profile. Fajer Ezzet's and Mohammed-Ali Ohmaid's are not on
  record.
- [ ] **Roles on the site.** Assign every holder on record (decisions §4)
  on their member page, the Managing Editor and the Next Stop host among
  them. The Council page and the masthead come only from roles.
- [ ] **Telegram:**
  - the members' group description (decisions §6);
  - the Welcome Message and Aggressive Anti-Spam in the group's
    settings;
  - Student Life's two admins, titled "Student Life", with no
    permissions.
- [ ] **Old Telegram columns:** `core.telegram_word_plays`,
  `core.telegram_groups.join_policy`, `core.telegram_members.warnings`
  and `joined_at`, and the settings `telegram.rules_en`/`_ar` are unused
  in production. Dropping them deletes their data, so it waits for the
  owner's go-ahead.
- [ ] **The partner memorandum.** The memorandum a partner signs at
  `/partners/apply` is its own words and the Policy Manual's lines. If the
  Society adopts a standard text, it replaces them.
- [ ] **The founding documents in Notion:** amend any text that still
  names retired things before the Founding Meeting (Tue Mar 30, 2027).

## Open in the code

- [ ] **The staging loop.** Create, publish and edit an event and a
  document from Notion, once a staging URL and its keys are in the
  environment.
- [ ] **`/_design` is not behind a sign-in.** The built Storybook files
  load without one; the Diwan's page around them is for staff. Nothing in
  them is private (the press kit shows the same brand), so this stays as
  it is unless the owner wants it gated.
- [ ] **Gallery images on acceptance.** Copy accepted Gallery images from
  the private submissions bucket to the piece; for now editors upload them
  on the piece's page.

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
