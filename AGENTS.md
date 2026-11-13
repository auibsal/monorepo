# Agent and contributor guide

Conventions for anyone, human or AI agent, changing this repository: the
platform of the AUIB Society of Arts and Letters (SAL), live at
auibsal.org.

The owner's current decisions (`claude/decisions.md`) and the Arabic
glossary (`claude/glossary_ar.md`) are the source of truth: where this file
or any older document disagrees, they win. Both are a read-only mirror of
the Claude project's copies, replaced whole whenever the owner sends a
prompt and never edited in this repository; propose a change in your
report instead (`bun run check:decisions` checks only the date line).
Start every session from them and from `PROGRESS.md` (the working
checklist, with what is blocked), and continue from the first unticked
item. decisions.md is organized by subject: code cites a decision by its
section's name ("decisions.md, Qirtas"). Before changing a
domain (members, events, Qirtas, Notion…), read its section of
`docs/platform/domain.md`. Where decisions.md is
silent, do what American university student organizations and student
media do.

## Repository map

- `apps/web`: **the one app**, auibsal.org. Three parts, one deployment:
  - `app/[locale]/(site)`: the public site. Published reads only, with the
    publishable key; cached by tag and revalidated on publish; Cache
    Components prerenders each page around what a request needs (the
    time through `roughlyNow`, never `new Date()` in a page).
  - `app/[locale]/(account)`: **your account**, the members' pages on the
    site: `/sign-in`, `/sign-up` (and `/sign-up/guest`), `/auth/*`,
    `/welcome`, `/get-involved` (public), each form at its place in its
    flow (`formPaths` in `lib/data/forms.ts`: `/about/contact/concern`,
    `/consent/<kind>` …; every old `/forms` address redirects),
    `/invite/<code>`, `/partners/apply` and `/partners/dashboard`, and, for
    members, everything under `/account`, in tabs shown by class and role
    (decisions.md, The site; `useAccountLinks` in
    `components/account/member-shell.tsx`): Today, Events (`/events`), Work
    (`/work`: drafts, submissions at `/work/submissions/<id>`, pieces at
    `/work/<id>`), Applications (`/applications`), Saved (`/saved`), Roles and
    service (`/roles`, for those who hold or held a role: roles, handovers at
    `/roles/handover` and `/roles/countersign/<id>`, hours, service letters,
    a year at `/documents/year/<yyyy>`), Documents (`/documents`: signed
    copies at `/documents/signed/<id>`, certificates at
    `/documents/certificates/<ref>`, letters at `/documents/letters/<ref>`),
    Elections (`/elections`, while one is open; standing for a position at
    `/elections/<position>`), Card (`/card`) and Settings (`/settings`,
    `/settings/profile`, `/settings/notifications`, officers'
    `/settings/disclosures`); guests have Today, Events, Work, Documents and
    Settings. With
    what you sent at `/requests` and `/requests/<id>`. Also `/company/auditions`,
    `/qirtas/submit` (public; the forms at `/qirtas/submit/<type>`, a draft at
    `/qirtas/submit/<type>/<draft>`) and `/qirtas/read/<slug>` (a
    members-only piece). The gates are in `components/diwan/gates.tsx`.
  - `app/[locale]/diwan`: **the Diwan**, auibsal.org/diwan, the staff's
    administration only (anyone holding a role, `RequireStaff`), one
    section per Council seat (decisions.md, The site; `adminSections` in
    `lib/rbac`; `DiwanNav` and `SectionTabs` in `admin-shell.tsx`): the
    Desk (`/diwan`: what needs you, quick actions, Waiting, what happened,
    the Connected panel for Notion and email); the Council
    (`/diwan/council`: meetings and their resolutions, requests to Student
    Life, elections, concerns, motions, disclosures, the Library); Qirtas
    (the Newsroom, one page per section, with submissions, Editions,
    contributors, the Prize, Qalam and certificates); Media
    (`/diwan/media`: Next Stop's episodes and reels, Hudhud and its channels at
    `/diwan/media/channels`, the design system at `/diwan/media/design`); the Company (`/diwan/company`); Events
    (`/diwan/events`, each event at `/diwan/events/<slug>` with its
    check-in at `.../check-in`, event proposals); Partnerships
    (`/diwan/partnerships`: applications, the register, memoranda); and
    Membership (`/diwan/membership`: the Register, guests, openings,
    service, the Typewriter Tour). Diwan code names pages by their own path (`/events`); `Link`,
    `useRouter` and `usePathname` from `@/lib/diwan/navigation`
    add the `/diwan` prefix.
  - Your account and the Diwan are client-rendered (`components/diwan`,
    `lib/diwan`); every check in them is UX only. They read and write
    Supabase with the user's token and call the API routes with it
    (`callApi` in `lib/diwan/api.ts`). Shared empty states link through
    `useAppLink` (`lib/link-context.tsx`).
  - `app/api` and `lib/api`: the API routes, auibsal.org/api: email and
    the outbox, Resend Broadcasts (`lib/api/broadcast.ts`), cron, calendar
    feeds, exports, signed URLs, account deletion, Google Wallet, the
    Notion sync (`lib/api/notion`) and Hudhud, the Society's Telegram bot
    (`lib/api/bot`, grammY; webhook `/api/hooks/telegram`;
    `docs/platform/telegram.md`). The only code that reads the secret key.
    The bot acts for a member only through the `core.telegram_*`
    functions, which run the Diwan functions under the member's claims so
    RLS still decides. Bot copy is in `lib/api/bot/copy.ts`.
  - `lib/` holds the app's own code that is not a page or a component:
    `lib/auth` (sign-in, sessions, passkeys), `lib/rbac` (permission
    keys, role bundles, modules and sections, the client mirror of
    `access.has_permission()`, test personas), `lib/data` (zod schemas
    and typed queries per domain, the forms registry `forms.ts` and the
    daily games), `lib/storage`, `lib/telegram`, `lib/security` (headers
    and CSP), `lib/observability` (logging) and `lib/next-config` (the
    environment and the Next config helpers), imported as `@/lib/<name>`.
- `packages/brand`: **the design system**, SAL-MED-02, the single source of
  the brand: the guide (`guide/`, Markdown), the rules in short
  (`BRAND-BOOK.md`), the assets (tokens, fonts, icons, logos, Hudhud, the
  social templates, the printables), and the code the app imports as
  `@repo/brand` (`styles/globals.css`, `components/ui` (shadcn),
  `components/sal`, `lib`; the kit your account and the Diwan are built
  from, DataTable, Field, ChoiceInput and the states, takes its words as
  props). Its stories are the Diwan's own page
  `/diwan/media/design` (Guide, Foundations, Logos, Components, Emails,
  Social, Print; each entry at `/diwan/media/design/<entry>`,
  `components/diwan/admin/system/design.tsx`), drawn in place from the
  build in `apps/web/design` (made by the web build, ignored by git),
  whose files are served to staff only at `/diwan/media/design/kit`
  (`app/api/design`, a rewrite; never indexed). The public sees the brand only on the press page
  (`/about/press`). No PDFs or document files in the repository: print
  is the page printed from the browser.
- `packages/*`: what the app shares with the design system or the
  database tooling, imported as `@repo/<name>` (a fixed internal scope;
  never rename it). Code used only by the app lives in `apps/web/lib`.
  - `@repo/database`: SQL migrations (`supabase/migrations`), pgTAP tests
    (`supabase/tests/database`), generated types.
  - `@repo/email`: the email template and every email's copy
    (`copy.ts`); the design system draws every email from it.
  - `@repo/internationalization`: messages, navigation, formatting.
- `packages/config/project.json`: names, motto, the site URL, the `/diwan`
  (`paths.diwan`) and `/api` paths, locales, region, hello@auibsal.org and
  the AUIB calendar. Read it through `@repo/config`.
- `tsconfig.base.json` and `tsconfig.nextjs.json` at the root: the
  TypeScript settings every workspace extends.
- `docs/platform`: the platform runbooks (Markdown). There is no separate
  docs site.
- `scripts/`: `check-placeholders.ts`, `check-rtl.ts`, `check-i18n.ts`,
  `check-language.ts`, `check-forms-register.ts`.

## Commands

```sh
bun install
bun run dev                 # the app at :3000
bun run check | fix         # Biome (Ultracite rules)
bun run typecheck           # every workspace
bun run test                # Vitest in every workspace
bun run check:placeholders
bun run check:rtl           # physical Tailwind utilities (--fix rewrites them)
bun run check:i18n          # UI text not in the messages files; the language standard
bun run check:forms         # the register's kinds against SAL-EXB-01, by name (needs NOTION_TOKEN)
bun run check:unused        # unused files and dependencies (Knip)
bun run db:start | db:reset | db:test | db:types
bun run --cwd apps/e2e e2e   # Playwright journeys + axe (local stack running)
bun run --cwd packages/brand dev       # the design system, locally
bun run --cwd packages/database db:test:sync     # copy the pgTAP preamble
bun run --cwd packages/brand tokens      # regenerate tokens.css
bun run --cwd packages/brand icons       # regenerate the icon data
```

Run `check`, `typecheck` and `test` before every commit, and `db:test` for
any schema change. Integration tests run against a local stack with
`SUPABASE_INTEGRATION=1` (see `.github/workflows/ci.yml`).

## Security and data

- **RLS first.** Postgres Row Level Security is the security boundary for
  every read and write. Every table has RLS enabled in the migration that
  creates it, and every policy has a pgTAP test; `00_structure.test.sql`
  fails a table without RLS.
- **No third-party apps.** Every table keeps the restrictive policy "No
  third-party apps" (`private.client_allows`;
  `99_no_third_party_apps.test.sql` fails without it, so every new table
  needs it). A token issued to an app reaches nothing, and
  `authenticateRequest` returns no one. The connected platforms are Notion
  and Telegram, reached from the API routes.
- **Permissions, never role names.** Policies and code ask
  `access.has_permission(permission, scope_type, scope_id)`. Roles live
  only in `access.role_assignments`, written only through
  `access.assign_role()`. Never read roles from `user_metadata` or
  `app_metadata`.
- **Atomic multi-step operations are Postgres functions** called by RPC.
  The body is a SECURITY DEFINER function in `private` that checks
  permissions itself; the name the apps call, in an exposed schema, is a
  SECURITY INVOKER wrapper with the same signature. The Supabase advisors
  stay at zero findings (`00_advisors.test.sql`: one permissive policy per
  role and action, every foreign key indexed, no exposed SECURITY DEFINER
  function).
- **Migrations ship through CI.** Add a file to `supabase/migrations`;
  after merge, `.github/workflows/migrate.yml` runs `supabase db push`
  against production once CI passes, then calls Vercel's deploy hook (Git
  auto-deploy of `main` is off, so the site never runs ahead of its schema).
  Never paste SQL into the production database.
- **Accounts (decisions.md, Members; NIST SP 800-63B).** Passwords are 12
  characters or more with no composition rules, checked against known
  breaches by k-anonymity (`lib/password.ts`, `/api/password-check`), with
  a Show button (`PasswordInput`). Sign-up records the Terms and Privacy
  Notice agreement (`core.profiles.agreed_at`) and asks whether the
  student is 18 or older; the Code of Conduct is the only pledge. A password change
  on an old sign-in asks for an emailed code (secure password change);
  deleting the account needs a sign-in from the last 15 minutes
  (`signedInWithin`) and takes effect 30 days later
  (`core.profiles.deletion_requested_at`; signing in restores it, the
  retention job then removes the account and the person's own files).
  Settings lists the devices signed in (`core.my_sessions()`, "Sign out
  everywhere else"); a new kind of device emails the person
  (`core.known_devices`). "Download your data" is `/api/account/export`,
  shown as a page or saved as JSON. Each September members confirm "I'm
  still here" (`membership.renewed_at`; `private.is_active_member()` is
  the active count). The Diwan signs a device out
  after an hour with no use of your account or the Diwan (`IdleSignOut`,
  NIST SP 800-63B-4's AAL2 inactivity timeout). An AUIB sign-in address is not
  changed from the account (`private.keep_auib_address`).
- **One account model (decisions.md, Members).** A class (Member,
  Associate, Honorary, Guest) says whether someone is a member; a role
  says what they do. Outside roles (Faculty Advisor, Student Life,
  Advisory Board, partner roles, Parent, Qalam student) sit on whatever
  account the class gives; a Parent's role is scoped to the child
  (`scope_type = 'member'`). There is no "staff" class.
- **Two-step sign-in (decisions.md, Members).** An authenticator app is
  offered to everyone (Settings). Roles with `requires_mfa` (the Council,
  the Elections Committee and, from Sun Nov 22, 2026, every role that sees
  personal data: `requires_mfa_from`, turned on by the hourly
  `sal-two-step-from` job) count only on a two-step session
  (`private.session_two_step()`: `aal2`, or a passkey sign-in, which is two
  factors on its own); `access.has_permission` enforces it. Don't add
  bypasses. A new role that sees personal data gets `requires_mfa` in its
  migration. A lost authenticator is
  recovered with one of ten recovery codes (`access.recovery_codes`,
  `/api/two-step/recover`) or reset by whoever holds `roles.assign`
  (`/api/two-step/reset`); either is recorded in `access.two_step_resets`
  and emails the person.
- **Secrets are server-only.** The secret key, Resend, the cron and
  webhook secrets and the Telegram token are read only in route handlers
  and `lib/api`; CI greps the client bundle for their names. New env vars
  go in the `keys.ts` beside the code that reads them and in
  `apps/web/.env.example`.
- **Personal data lives only on the site.** Never in Notion, in git or in
  a migration: imports of personal data (such as the spring 2026 Tour,
  `programmes.import_tour`) go from the officer's browser straight to the
  database. The Register is private (the Executive Board and the
  Director of Membership), with no bulk export; members may opt into a
  members-only directory (`in_directory`). The site keeps only what it
  needs: no optional profile details or demographic reports. A member
  under 18 gives the month and year of birth (deleted at 18) and a
  parent's consent by link (`parent-consent`), and nothing shows or names them until
  then. No phone numbers until they can be verified. Never ask for a
  student ID number: the AUIB address is the identifier, never shown
  publicly.
- **Blind review.** Readers never receive an author's identity before a
  decision; verify against network responses, not the UI. Clients never
  read `contributors.user_id`, so a pen name can't be traced. Readers
  read the work, never the file: after signing `confidentiality-agreement` (the readers'
  pledge) on the reading page, the text on
  the page (`journal.entry_text`) and images marked with their card
  number (`/api/files/blind`); originals open by role through
  `journal.open_original`, each opening kept.
- **No third-party monitoring or protection.** Errors and logs go to the
  Vercel runtime log (`lib/observability` prints only); the security
  headers are the app's own (`lib/security`; your account and the Diwan
  render per request with a nonce-based CSP, `apps/web/proxy.ts`, so a new
  page there stays under their layouts and never adds an inline script); public forms are rate
  limited in the database (`withinRateLimit`, `core.take_rate`).
- **Files:** use `lib/storage`. Private buckets are reached only through
  signed URLs issued by the API routes.

## The Society's domain

`docs/platform/domain.md` describes the Society as the code models it:
the Council and the first semester, members and classes, names and titles,
the card, numbers and codes, forms and signatures, events and the
calendar, the Typewriter Tour, partners, guests, governance, Qirtas
(Write for Qirtas, the Newsroom, reading, Editions, Games, the Prize,
Qalam, the Sunday Paper), and Notion, documents, Hudhud and email. Read
the section for the domain you are changing first. Four rules hold
everywhere:

- **Money: none.** No budgets, prices, payments or ads; needs lists only.
- **Nobody types what the site knows:** terms, officers, the Council,
  numbers and codes, names (picked from the register, never typed).
- **One standard event, one standard form page, one letter template,
  one design per thing** in `@repo/brand/components/sal`.
- **One home per piece of information:** Notion for the work, the site
  for people and private records, Telegram for talk.

## The site's practice

- **Standard practice over house rules.** Use the common way when it
  works; keep what helps, change what doesn't, merge what repeats. Counts
  are not rules: sections, tabs and menus hold what is needed.
- **One place for each thing.** Nothing is kept or managed in two places;
  when two views show the same records, merge them. Nothing is kept by
  hand that is known elsewhere (terms, officers, the Council).
- **Lasting addresses.** Pages people share or return to have their own
  path (an event, a piece, an issue); lists are filtered with query
  strings (`/events?month=`, `/qirtas/archive?month=&section=`,
  `/search?q=`). Links point at the current address. An address that was
  shared (in an email, a post, a poster or a QR code) and then changes
  gets a permanent redirect (308, `MOVED` in `apps/web/next.config.ts`);
  one never shared simply changes. The address decides the language
  (`localeDetection: false`), except a person's first visit, which
  follows the browser (`lib/i18n/first-visit.ts`).
- **Big records get pages; small rows are edited in place.** A record
  with its own life (an event, a piece, a production, a partner, a
  memorandum, a document, an election, an opening, a meeting) has its own
  page (`RecordPage`, `NewLink`), "new" for a blank one, ending with its
  History (`RecordHistory`, `core.record_history()`). A small row (a need,
  a shift, a credit, a rehearsal, a role) is added in place with
  `AddInPlace`, never a dialog. A long list acted on together uses
  `SelectableTable`.
- **One layout rule.** Menus, tabs and action buttons sit in rows,
  wrapping on a phone (`flex flex-wrap`); choosing between options is
  always a vertical list (`SelectInput`/`ChoiceInput`, with a find line
  from ten). Never write `<select>`, never stack action buttons in a
  column.
- **One frame.** The public pages, your account and the Diwan share one
  header (`components/masthead.tsx` with `site-header.tsx`). The public
  pages take the four-column footer (`Footer`; Qirtas's pages add its
  line); your account, the partner dashboard and the Diwan take the slim
  one (`SlimFooter`; the Diwan's shows the version and build), chosen by
  address (`FooterSwitch`). The Diwan's seats are a side list on a
  computer and a row on a phone (`DiwanNav`). One main menu:
  Events, Qirtas, The Company, Next Stop, Get involved and About, with
  a Join button (signed in,
  the end of the line opens Membership; the Diwan under it for staff, the
  Partner dashboard for a partner's team, `useWays`). No link appears
  twice among the header, a menu row and the footer.
- **Your account and Diwan pages** are `DiwanPage` with `DiwanSection`s
  and `RowList`s (`components/diwan/page.tsx`); admin pages use
  `AdminHeading`. Every empty state offers one next action. Nothing a
  member does lives in the Diwan. The Diwan's find line (`FindPanel`)
  opens in place with "/" or Ctrl+K.
- **Shelves and motion.** A row of things to browse is `Shelf`, always
  with the same items as a plain list at its own path. Movement follows
  the brand book's Motion section (native CSS, the duration and easing
  tokens), nothing with reduced motion.
- **Performance and accessibility.** The public pages keep to a
  performance budget on a mid-range phone
  (`apps/e2e/tests/performance.spec.ts`) beside the axe checks.

## Language and copy

- **English:** American, following the Chicago Manual of Style (with
  Merriam-Webster), no exceptions, in UI copy, emails, comments, commits,
  docs and the database's text: curly quotes and apostrophes, the serial
  comma, en dashes for ranges, the ellipsis character, sentence case for
  interface labels. Code identifiers may stay (`programmes`,
  `cancelled`).
- **Arabic:** Modern Standard Arabic for the site, your account, the
  Diwan, emails, documents, certificates and Qirtas, written by Claude
  with no native-review gate; Iraqi Arabic (with گ، چ، پ) only where the
  Society chats: Hudhud's chat, reminders and Sunday note, social captions
  and stories, signs at the door; Hudhud's removals, consents and appeals
  are standard. Never both in one message. Latin digits, the Iraqi month
  names (`ar-IQ`), ، ؛ ؟ and «», tanween al-fath on the letter before the
  alif (شكرًا) and no other tanween, no tatweel, Latin addresses isolated
  (⁦…⁩ or `<bdi>`), one word per term (`claude/glossary_ar.md`).
  `scripts/check-language.ts` enforces it.
- **One language per page.** The English pages carry no Arabic and the
  Arabic pages no English, except the language switcher, fields meant for
  the other language, an original beside its translation, and AUIB's
  English-only dates.
- **Retired names** (decisions.md, Retired names) never appear in copy;
  `scripts/check-language.ts` refuses them. "Your account" («حسابك») names
  the members' pages; "the Diwan" names staff spaces only.
- **How the Society names itself:** "AUIB Society of Arts and Letters" on
  first formal use, then "the Society" or "SAL", never "the club". The
  motto "The paper and the pen." is the short line; the endorsement line
  is "a Society of Arts and Letters program". Every email and the footer
  carry "Paperless by default. Books reused through Second Chapter."
- **Content.** Don't invent names, dates, figures or quotes. Missing text
  is a `TODO(content): …` placeholder listed in `PROGRESS.md`.
- **Formats.** Dates as "Tuesday, October 13", times as "6:00 p.m.": use
  `formatLongDate` and `formatClock` from
  `@repo/internationalization/format` (Latin digits, Baghdad time). Store
  times as `timestamptz` (UTC). Translatable columns come in pairs
  (`title_en`, `title_ar`).

## The brand (binding, `packages/brand/BRAND-BOOK.md`)

- Six colors do the work (white, ink, crimson, paper, stone, ash);
  components use only the role tokens (`surface`, `surface-reading`,
  `text`, `text-secondary`, `accent`, `on-accent`, `line`, `band`,
  `on-band`, `footer`). Never add a color.
- Headlines are Light and one color, text Regular, labels Medium tracked
  capitals; never bold headlines. Titles stand alone (`SectionHead`): no
  kicker, eyebrow or label above a headline. No exclamation marks in
  headings. The body of Qirtas's pieces is set in Markazi Text, both languages
  (`reading`); the typeface is Ubuntu in both languages, never "Ubuntu Arabic".
- Hairlines in place of boxes and cards; square corners; no shadows. One
  solid accent button per view, everything else a text link. At most one
  crimson band per page; crimson never on ink.
- Light and dark mode: dark is the brand's ink theme, `data-theme="dark"`
  from the system setting or the header toggle (cookie `sal_theme`).
  Never test the mode in code: the role tokens switch, `on-ink:` styles
  what sits on ink, and paper (certificates, letters, printouts) keeps
  `data-theme="light"`.
- Logos exactly as supplied in `packages/brand/assets/logos`; the Bookmark
  is only ever the logo. Icons only from the Society's set through `Icon`
  (`@repo/brand/components/sal/icon`), never `lucide-react`: alone with a
  `label` when the meaning is plain, beside a word when it could be
  misread; never in a headline, as a bullet or as decoration; no emoji.

## General rules

- **Package manager:** Bun with the hoisted linker (`bunfig.toml`).
  Declare every dependency a workspace imports; keep versions aligned. Bun
  installs and runs scripts; Next.js runs on Node.
- **Auth:** email and password (AUIB address first), a passkey as an
  optional other way in; no sign-in link by email (email only confirms the
  address and resets a password). In
  your account and the Diwan, query with `useAuth().supabase` so RLS
  applies. In the API routes, identify callers with
  `authenticateRequest` and re-check permissions with `hasPermission`
  (`lib/api/permissions.ts`). The admin client (`@repo/database/admin`)
  bypasses RLS: webhooks, cron and trusted server code only.
- **URLs.** English has no prefix (`/events`, `/diwan/events`); Arabic
  does (`/ar/events`). API routes carry no language. Build links with
  `Link` from `@repo/internationalization/navigation` (inside the Diwan,
  from `@/lib/diwan/navigation`), or `localizedPath`, `diwanPath`,
  `apiPath`, `siteUrl`, `diwanUrl`, `apiUrl`; never write `/en`.
- **Translations:** every UI string comes from
  `packages/internationalization/messages/{ar,en}.json`, checked by
  `bun run check:i18n`. Pass numbers and dates into messages already
  formatted (ICU `#` would use Arabic-Indic digits).
- **Localization:** UI works in Arabic (RTL) and English (LTR). Use
  logical Tailwind utilities (`ms-*`, `pe-*`, `start-*`, `text-start`);
  `bun run check:rtl` enforces it. Icons that point along the reading
  direction get `rtl:rotate-180`.
- **shadcn/ui:** files in `packages/brand/components/ui` are generated;
  update them with the shadcn CLI where possible. SAL components live in
  `packages/brand/components/sal`.
- **Activity log.** It reads as sentences
  (`components/diwan/admin/system/activity.tsx`); a new logged table needs
  its line there, and a new record table with history its entry in
  `private.history_tables()`.

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
