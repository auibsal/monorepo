# Agent and contributor guide

Conventions for anyone, human or AI agent, changing this repository: the
platform of the AUIB Society of Arts and Letters (SAL), live at
auibsal.org.

Start every session by reading `claude/decisions.md` (the owner's current
decisions and the source of truth: where this file or any older document
disagrees, it wins) and `PROGRESS.md` (the working checklist, with what is
blocked), and continue from the first unticked item. Before changing a
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
    `/welcome`, `/get-involved` (public), `/forms/<number>`,
    `/invite/<code>`, `/partners/apply` and `/partners/dashboard`, and, for
    members, everything under `/account`, in six tabs (decisions §6):
    Today, Calendar (`/calendar`), Record (`/record`, certificates at
    `/record/certificates/<ref>`, letters at `/record/letters/<ref>`, a year
    at `/record/year/<yyyy>`), Work (`/work`: drafts, submissions at
    `/work/submissions/<id>`, pieces at `/work/<id>`, and what was saved),
    Elections (`/elections`, standing for a position at
    `/elections/<position>`) and Settings (`/settings`, `/settings/profile`,
    `/settings/notifications`, officers' `/settings/disclosures`), with
    what you sent at `/requests` and `/requests/<id>`. Also `/company/auditions`,
    `/qirtas/write` (public; the forms at `/qirtas/write/<type>`, a draft at
    `/qirtas/write/<type>/<draft>`) and `/qirtas/read/<slug>` (a
    members-only piece). The gates are in `components/diwan/gates.tsx`.
  - `app/[locale]/diwan`: **the Diwan**, auibsal.org/diwan, the staff's
    administration only (anyone holding a role, `RequireStaff`), one
    section per Council seat (decisions §6; `adminSections` in
    `lib/rbac`; `DiwanNav` and `SectionTabs` in `admin-shell.tsx`): the
    Desk (`/diwan`: what needs you, quick actions, Waiting, what happened,
    the Connected panel for Notion, Hudhud and email); the Council
    (`/diwan/council`: meetings and their resolutions, requests to Student
    Life, elections, concerns, motions, disclosures, the Library); Qirtas
    (the Newsroom, one page per section, with submissions, Editions,
    contributors, the Prize, Qalam and certificates); Media
    (`/diwan/media`: Next Stop's episodes and reels, the design system at
    `/diwan/media/design`); the Company (`/diwan/company`); Events
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
  `check-language.ts`, `check-forms-register.ts`, `check-decisions.ts`.

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
bun run check:forms         # the forms registry against SAL-EXB-01 (needs NOTION_TOKEN)
bun run check:decisions     # decisions.md's date line
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
  against production once CI passes, and Vercel deploys `main` itself.
  Never paste SQL into the production database.
- **Accounts (decisions §11, NIST SP 800-63B).** Passwords are 12
  characters or more with no composition rules, checked against known
  breaches by k-anonymity (`lib/password.ts`, `/api/password-check`), with
  a Show button (`PasswordInput`). Sign-up records the 18+ and Terms and
  Privacy Notice agreement (`core.profiles.agreed_at`). A password change
  on an old sign-in asks for an emailed code (secure password change);
  deleting the account needs a sign-in from the last 15 minutes
  (`signedInWithin`) and removes the person's own files. "Download your
  data" is JSON from `/api/account/export`. The Diwan signs a device out
  after an hour with no use of your account or the Diwan (`IdleSignOut`,
  NIST SP 800-63B-4's AAL2 inactivity timeout). An AUIB sign-in address is not
  changed from the account (`private.keep_auib_address`).
- **Two-step sign-in for sensitive roles.** Roles with `requires_mfa` (the
  Council, the Acting President, the Elections Committee) count only on
  an `aal2` session; `access.has_permission` enforces it. Don't add
  bypasses. A passkey is a first step only. A lost authenticator is
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
  Director of Membership); members may opt into a members-only directory
  (`in_directory`). Everything in `core.member_details` is optional and
  read only by the member and `members.manage`; reports count only
  members with `research_consent` and never show a group smaller than
  five. No phone numbers until they can be verified. Never ask for a
  student ID number: the AUIB address is the identifier, never shown
  publicly.
- **Blind review.** Readers never receive an author's identity before a
  decision; verify against network responses, not the UI. Clients never
  read `contributors.user_id`, so a pen name can't be traced. Readers
  read the work, never the file: after signing F-40 (the readers'
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
the Council and the first term, members and classes, names and titles,
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
  `/search?q=`). Links point at the current
  address; there are no redirects, and an old address is simply not
  found. The address alone decides the
  language (`localeDetection: false`).
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
  header (`components/masthead.tsx` with `site-header.tsx`) and one
  footer (`components/footer.tsx`, not in the Diwan). One main menu:
  About, What's on, Qirtas, The Company, Get involved and Join (signed in,
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
  Society chats: Hudhud's copy, social captions and stories, signs at the
  door. Never both in one message. Latin digits, the Iraqi month names
  (`ar-IQ`), ، ؛ ؟ and «», tanween on the letter before the alif
  (شكرًا), one word per term (`claude/glossary_ar.md`).
  `scripts/check-language.ts` enforces it.
- **One language per page.** The English pages carry no Arabic and the
  Arabic pages no English, except the language switcher, fields meant for
  the other language, an original beside its translation, and AUIB's
  English-only dates.
- **Retired names** (decisions.md §9) never appear in copy;
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
  headings. Qirtas's articles are set in Literata (`reading`).
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
- **Auth:** email sign-in (AUIB address first; magic link or password). In
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
