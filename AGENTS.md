# Agent and contributor guide

Conventions for anyone — human or AI agent — changing this repository: the
platform of the AUIB Society of Arts and Letters (SAL), live at auibsal.org.

Start every session by reading `PROGRESS.md` (the working checklist, blocked
items and decisions) and continue from the first unticked item.

## Repository map

- `apps/web` — **the one app**, auibsal.org (owner, Oct 24, 2026: one
  Next.js app in place of web, Nexus, api and the design site). Three parts,
  one deployment:
  - `app/[locale]/(site)` — the public site, `/` and `/ar`. Published reads
    only, with the publishable key; cached by tag and revalidated on publish.
  - `app/[locale]/(account)` — **the members' pages, on the site** (owner,
    Oct 24, 2026): `/sign-in`, `/sign-up`, `/auth/*`, `/setup`,
    `/oauth/consent`, and, for members, `/account` (overview, `/profile`,
    `/requests`, `/service`, `/offers`, `/certificate`), `/events/book`,
    `/programs/shifts`, `/programs/productions/auditions`, `/qirtas/write`
    (with `/submit`, `/submission`, `/work`, `/piece`) and `/society`. The
    site's header and footer, an account row (`components/account`), and
    the gates in `components/nexus/gates.tsx`. They link with the site's
    `Link` (`@repo/internationalization/navigation`) and full paths.
  - `app/[locale]/diwan` — **the Diwan** (code name `nexus`), auibsal.org/diwan:
    the officers' administration only (anyone holding a role,
    `RequireStaff`): the overview and modules at `/diwan/<module>`, the
    library, declarations. Members are sent to `/account`. Diwan code names
    pages by their own path (`/events`); `Link`, `useRouter`, `usePathname`
    and `redirect` from `@/lib/nexus/navigation` add the `/diwan` prefix.
  - Both are client-rendered (`components/nexus`, `lib/nexus`, the code
    kept its names); every check in them is UX only. They read and write
    Supabase with the user's token, and call the API routes with it
    (`callApi` in `lib/nexus/api.ts`). Shared empty states link through
    `useAppLink` (`lib/link-context.tsx`): the site's link outside the Diwan,
    the Diwan's inside it.
  - `app/api` and `lib/api` — the API routes, auibsal.org/api: email, cron,
    calendar feeds, exports, signed URLs, account deletion, `/api/v1` for
    third-party apps, and Hudhud, the Society's Telegram bot (`lib/api/bot`,
    grammY; webhook `/api/telegram`; `docs/platform/telegram.md`). The only
    code that reads the secret key. The bot acts for a member only through
    the `core.telegram_*` functions, which run the Diwan functions under the
    member's claims (aal1) so RLS still decides. Bot copy in
    `lib/api/bot/copy.ts`; the mascot in `brand/mascot`.
  - `app/[locale]/(site)/developers` — the guide and reference for app
    builders, English only (like the API and the runbooks).
- **URLs.** English, the default language, has no prefix (`/events`,
  `/diwan/events`); other languages do (`/ar/events`, `/ar/diwan/events`)
  (owner, Oct 14, 2026). API routes carry no language (`/api/...`). Build
  links with `Link` from `@repo/internationalization/navigation` (inside the
  Diwan: from `@/lib/nexus/navigation`), or `localizedPath`, `nexusPath`,
  `apiPath` and the absolute `siteUrl`, `nexusUrl`, `apiUrl` from
  `@repo/internationalization`; never write `/en`.
- **One frame.** The public pages and the Diwan share one header
  (`components/masthead.tsx`: the site's sections in `site-header.tsx`, the
  Diwan sections in `components/nexus/app-shell.tsx`) and one footer
  (`components/footer.tsx`), so moving between them never feels like
  another app.
- `packages/storybook` — the SAL Design System: SAL components, Screens
  and every platform email in both languages. Local only
  (`bun run --cwd packages/storybook dev`); nothing is deployed.
- Documents live on auibsal.org/documents (`apps/web`); the officer handbook
  and the internal documents' text in the team's Notion workspace (the Diwan
  links there: setting `notion.handbook`, `society_documents.notion_url`;
  `docs/platform/notion.md`); the platform runbooks in `docs/platform`
  (Markdown). There is no separate docs site. The apps configure no
  redirects (owner, Oct 14, 2026); www.auibsal.org → auibsal.org is a
  Vercel domain setting.
- `packages/*` — shared code, imported as `@repo/<name>`. `@repo` is a fixed
  internal scope; never rename it.
  - `@repo/database` — SQL migrations (`supabase/migrations`), pgTAP tests
    (`supabase/tests/database`), generated types.
  - `@repo/rbac` — permission keys, role bundles, the client mirror of
    `access.has_permission()`, test personas.
  - `@repo/sal-data` — zod schemas and typed queries per domain (membership,
    events, journal, charity, governance, programmes, content).
- `packages/config/project.json` — names, motto, the site URL and the
  `/diwan` (key `paths.nexus`) and `/api` paths, locales, region and the
  default journal name.
  Read it through `@repo/config`.
- `scripts/` — `check-placeholders.ts`, `check-rtl.ts`, `check-i18n.ts`.

## Commands

```sh
bun install
bun run dev                 # the app at :3000
bun run check | fix         # Biome (Ultracite rules)
bun run typecheck           # every workspace
bun run test                # Vitest in every workspace
bun run check:placeholders
bun run check:rtl           # physical Tailwind utilities (--fix rewrites them)
bun run check:i18n          # UI text that isn't in the messages files
bun run check:unused        # unused files and dependencies (Knip)
bun run db:start | db:reset | db:test | db:types
bun run --cwd apps/e2e e2e   # Playwright journeys + axe (local stack running)
bun run --cwd packages/storybook dev   # the design system, locally
bun run --cwd packages/database db:test:sync     # copy the pgTAP preamble
bun run --cwd packages/design-system tokens      # regenerate tokens.css
bun run gen:package         # scaffold packages/<name>
```

Run `check`, `typecheck` and `test` before every commit, and `db:test` for
any schema change. Integration tests run against a local stack with
`SUPABASE_INTEGRATION=1` (see `.github/workflows/ci.yml`).

## SAL rules

- **RLS first.** Postgres Row Level Security is the security boundary for
  every read and write. Every table has RLS enabled in the migration that
  creates it, and every policy has a pgTAP test. CI fails when a table lacks
  RLS (`00_structure.test.sql`).
- **Permissions, never role names.** Policies and code ask
  `access.has_permission(permission, scope_type, scope_id)` ("can this user
  `events.manage` for program X?"). Roles live only in
  `access.role_assignments`, written only through `access.assign_role()`.
  Never read roles from `user_metadata` or `app_metadata`.
- **Migrations ship through CI.** Add a file to `supabase/migrations`; after
  merge, `.github/workflows/migrate.yml` runs `supabase db push` against
  production once CI passes. Never paste SQL into the production database.
- **Third-party apps.** Tokens from apps (Sign in with SAL) carry a
  `client_id` and reach only the areas granted in `access.oauth_clients`.
  Every new table needs the restrictive policy "Third-party apps reach only
  their areas" (see migration `20261008001500`; `99_oauth_clients.test.sql`
  fails without it). API routes refuse app tokens unless they pass
  `authenticateRequest(request, { apps: true })`, which only `/api/v1` does.
- **Two-step sign-in for sensitive roles.** Roles with `requires_mfa`
  (Council officers, directors, Elections Committee) count only on an `aal2`
  session; `access.has_permission` enforces it. Don't add bypasses.
- **Atomic multi-step operations are Postgres functions** called by RPC
  (ledger sign-off, ballots, blind ids, waitlist promotion, transitions).
  The body is a SECURITY DEFINER function in the `private` schema that
  checks permissions itself; the name the apps call, in the exposed schema,
  is a SECURITY INVOKER wrapper with the same signature (migration
  `20261024000000`). The Supabase advisors stay at zero findings:
  `00_advisors.test.sql` fails otherwise (one permissive policy per role and
  action, every foreign key indexed, no exposed SECURITY DEFINER function).
- **Secrets are server-only.** The secret key, Resend, the cron and webhook
  secrets and the Telegram token are read only in route handlers and
  `lib/api`, never in a page or client component; CI greps the client bundle
  for their names. New env vars go in the package's `keys.ts` and in
  `apps/web/.env.example`.
- **Paired fields.** Translatable columns come in pairs (`title_en`,
  `title_ar`, …). Store times as `timestamptz` (UTC); display Asia/Baghdad.
- **Blind review.** Readers never receive author identity before a decision;
  verify against network responses, not the UI.
- **Member data.** Names come in four parts (first and last, English and
  Arabic), all required; the full names are built from them. Everything in
  `core.member_details` is optional and read only by the member and
  `members.manage`; reports count only members with `research_consent`
  and never show a group smaller than five (`core.member_insights()`).
  Public pages never show it. No phone numbers until they can be verified
  (owner, Oct 25, 2026).
- **One address, one person.** The personal email (optional, for after
  graduation) is set only through `core.request_personal_email` and counts
  only once confirmed from the link sent to it
  (`core.confirm_personal_email`, `/personal-email/confirm`). It can't be
  an AUIB address, anyone's sign-in address or another member's personal
  email, and no sign-in address can be a member's verified personal email
  (triggers on `core.profiles` and `auth.users`, a unique index).
- **The membership card is live.** Its QR is
  `/verify/member/<code>?t=<digits>`: the digits are a TOTP of the card's
  secret (RFC 6238, SHA-1, 30 s, 8 digits; `lib/totp.ts` and
  `private.totp` must agree, and Google Wallet computes the same). The check
  page (`membership.verify_card`, read live) says whether the code is live;
  the door (`events.check_in_card`) refuses one that isn't. The secret
  reaches only its owner (`membership.my_card`). No member photos (owner,
  Oct 25, 2026). The rosette (`components/guilloche.tsx`) is drawn from
  the card number, and from the serial on certificates; the check pages and
  the Wallet banner draw the same one, so a card or certificate can be
  compared with its check. One check for both: `/verify/<code>` takes a
  certificate or a card code. A card's check lists the member's
  certificates only if they turn it on (`show_certificates_on_card`, off by
  default). Google Wallet only (`docs/platform/wallet.md`). Never put an
  account id in a QR.
- **What's on is one calendar** (owner, Oct 25, 2026): programs and events
  together at `/events`, a month at a time, each program a series
  (`/programs/<slug>`). Every event has a way in, `events.events.entry`:
  `open` (just come; members may ask "Remind me", `events.reminders`),
  `rsvp` (book a place) or `invite` (only the people in
  `events.invitations` and the event's managers see it; always
  members-only, so every public reader that leaves members-only events out
  leaves it out too). The public calendar (`events.calendar`) shows
  members-only events as teasers (title, time, program; nothing else).
  `rsvp_enabled` is kept in step with `entry` by a trigger; write `entry`.
  SECURITY DEFINER code checks visibility with `private.can_see_event_id`.
- **Qirtas is one section.** Members send everything from `/qirtas/write`
  and the type decides the process (desk editing, or the blind review for
  Edition work); the Diwan's Qirtas section holds the newsroom and the
  blind review (`?tab=review`) together.
  Two doors (owner, Oct 25, 2026): "Send to the newsroom" (News, Video,
  Voices; always open) and "Submit to the Edition" (Letters, Gallery; only
  while a call is open, two calls a year, with "Tell me when",
  `journal.call_alerts`). Members send only `journal.sendableCategories`:
  Letters poetry, prose, drama, translation; Gallery art and photography,
  comics and photo essays. Fiction, creative nonfiction, photo essays and
  Six Words take no new submissions (the database refuses them).
- **Six Words come only from the Typewriter Tour.** Never written on the
  site: whoever runs the Tour transcribes the card in the Diwan
  (`programmes.record_six_words`) and scans the writer's live membership
  card to make it theirs (`programmes.attach_six_words`); unsigned cards
  show without a name. One entry per member; a new card replaces the old.
- **Money.** The charity ledger is append-only (corrections are reversing
  entries); only signed-off entries count. No online payments of any kind.
- **Documents.** Every document is adopted, Version 1 (owner, Oct 24, 2026).
  Visitors and members see the title, summary and text only; codes
  (`SAL-…`, `F-…`), statuses, versions and ratification lines are internal
  and appear only in the admin. A later draft stays in the admin until it
  is adopted.
- **One language per page.** The English pages carry no Arabic and the
  Arabic pages no English (owner, Oct 24, 2026); the only exceptions are
  the language switcher, fields meant for the other language, and a
  document that exists in one language only.
- **No forms, as such.** Members never see the word "form" or a form code:
  each request starts where it belongs with a plain action ("Pitch a
  program", "Raise a concern") through `StartLinks`
  (`components/nexus/forms/forms.tsx`), and what they have sent is under
  Requests and reports (`/account/requests`) and in Profile. The forms engine and its
  codes stay as they are underneath.
- **Members' and Diwan pages.** Every members' page and Diwan page is
  `DiwanPage` with `DiwanSection`s and `RowList`s
  (`components/nexus/page.tsx`): the Light title, one line, section titles
  standing alone, hairlines between rows only. Admin pages use
  `AdminHeading`, which matches. Nothing a member does lives in the Diwan.
- **Names.** The publication is **Qirtas** («قرطاس»; "AUIB's paper of news,
  letters and art"): news, letters, the gallery, Six Words and Next Stop
  episodes in one paper with five desks (Waraq until the new names, owner,
  Oct 24, 2026). The name is read from the settings `journal.name_en`/`_ar`;
  the schema keeps the code names `journal` and `waraq`. The Society has no
  charity partner on record (Natrok Athar was removed on Oct 8, 2026).
- **Renames (owner, Oct 24, 2026).** What people see changed; the code
  kept its names. One line each, "now (the code still says …)":
  - Qirtas, قرطاس, at `/qirtas` (code: `waraq`, `journal`, `components/waraq`).
  - The Month in Qirtas, «شهر في قرطاس» (code: `monthInWaraq`, newsletter).
  - The Diwan, الديوان, at `/diwan`, for officers (code: `nexus`,
    `components/nexus`, `lib/nexus`, `nexusPath`, `paths.nexus`, messages
    namespace `nexus`, which also holds the members' pages' text).
  - Next Stop, المحطة القادمة (code: slug `side-quest`, `/programs/side-quest/care`).
  - The Company, الفرقة, the fifth flagship (code: `productions`, slug
    `company`, `/programs/productions`).
  - Open Stage, المسرح المفتوح (code: slug `scratch-night`).
  - Munazara, المناظرة (code: slug `motion-night`).
  - Mutanabbi Friday, جمعة المتنبي (code: slug `mutanabbi-walk`).
  - Gallery Wall merged into Qirtas's Gallery desk, «معرض قرطاس» (code: slug
    `gallery-wall`, kept and unpublished).
  - The Qirtas Prizes, جوائز قرطاس (was "the Prizes").
  - The Register and the Roll of Fellows, السجل ولائحة الزملاء (were the Book
    of Members and the Book of Fellows).
  - The Return, ليلة العودة (was Charter Night).
  - Editor of Qirtas, Director of the Company, Director of Programs, and the
    short Media, Partnerships and Membership titles (role assignment titles;
    role keys unchanged).
  - The Council in Arabic is «المجلس التنفيذي» («المجلس» is the Majlis).
  - Honorary Fellow, زميل فخري, and Life Member, عضو مدى الحياة (code: tiers
    `honorary` and `alumni`).
  The governance documents keep the old titles until the owner amends them;
  never edit the text of ratified documents.
- **Navigation.** At most five sections per app header; the rest go in the
  footer (web) or the Account menu (Diwan). Every Diwan empty state offers one
  next action (`EmptyLine action`).
- **Content.** Don't invent names, dates, figures or quotes. Missing text is a
  `TODO(content): …` placeholder listed in `PROGRESS.md`. Arabic written for
  this platform (not taken from a source) is listed as `needs-native-review`.
- **Brand book (binding, `brand/BRAND-BOOK.md`).** Six colors do the
  work (white, ink, crimson, paper, stone, ash); components use only the
  role tokens (`surface`, `surface-reading`, `text`, `text-secondary`,
  `accent`, `on-accent`, `line`, `band`, `on-band`, `footer`). Never add a
  color. Headlines are Light, text Regular, labels Medium tracked capitals;
  never bold headlines. Hairlines in place of boxes and cards; square
  corners; no shadows. One solid accent button per view, everything else a
  text link. Titles stand alone (`SectionHead`): no marker, no kicker, eyebrow
  or label above any headline or section title; small tracked labels only
  name fields, columns and metadata. The Bookmark is only ever the logo. The
  paper's articles are set in Literata (`reading`). At most one crimson
  band per page; crimson never on ink. Light and dark mode across
  the site and the Diwan (owner, Oct 24, 2026): dark mode is the brand's ink
  theme, `data-theme="dark"` on `<html>` from the system setting or the
  header toggle (cookie `sal_theme`, `apps/web/lib/theme.ts`). Never test
  the mode in code: the role tokens switch, `on-ink:` styles what sits on
  ink, and paper (certificates, letters, printouts) keeps
  `data-theme="light"`.
  Logos are used exactly as supplied in `brand/logos`, never redrawn.
  Functional icons only (menu, close, back, chevron, search, external link,
  check), each with an accessible label; no decorative icons, no emoji.
  No exclamation marks in headings; "AUIB Society of Arts and Letters" on
  first formal use, then "the Society" or "SAL", never "the club".
- **American English** (owner's decision, Oct 8 2026) in UI copy, emails,
  comments, commits and docs: program, color, canceled, judgment. Text quoted
  verbatim from the Society's documents keeps its spelling ("a Society of
  Arts and Letters programme", the Policy Manual clauses). Code identifiers
  stay (the `programmes` schema, `cancelled` status values).
- **Copy formats.** Dates as "Tuesday, October 13", times as "6:00 PM", money
  as "50,000 IQD": use `formatLongDate`, `formatClock` and `formatIqd` from
  `@repo/internationalization/format` (Latin digits, Baghdad time).

## General rules

- **Package manager:** Bun with the hoisted linker (`bunfig.toml`). Declare every
  dependency a package imports; keep versions aligned across workspaces. Bun
  installs and runs scripts; Next.js runs on Node (`next build`).
- **Auth:** email sign-in (AUIB address first; magic link or password). In
  the members' pages and the Diwan, query with `useAuth().supabase` so RLS
  applies. In the API
  routes, identify callers with `authenticateRequest` and re-check
  permissions with `hasPermission` (`lib/api/permissions.ts`). The admin
  client (`@repo/database/admin`) bypasses RLS: webhooks, cron and trusted
  server code only.
- **Files:** use `@repo/storage`. Private buckets (`submissions`, `receipts`,
  `library`) are reached only through signed URLs issued by the API routes.
- **Analytics:** on `apps/web` only (owner, Oct 15, 2026): Google Tag Manager
  with GA4 inside it, served from auibsal.org by the Google tag gateway
  (Cloudflare), consent from the site's own card (cookie `sal_consent`)
  through Google consent mode (everything denied until the visitor allows
  analytics; the ad signals only with the separate Advertising choice).
  Nothing loads until `NEXT_PUBLIC_GTM_ID` (or `NEXT_PUBLIC_GA_ID`) is set.
  No third-party consent tool: Cloudflare Zaraz stays off (owner, Oct 16,
  2026). Record events with
  `track()` from `@repo/analytics/client`. Runbook:
  `docs/platform/analytics.md`.
- **Ads:** in Qirtas on `apps/web` only, never for signed-in visitors (owner,
  Oct 16, 2026): Society ads, sponsor ads (only with a signed memorandum
  granting `advertising`; Policy Manual 11.3 applies) and Google AdSense for
  the rest. Readers get ads only through `journal.current_ads()`. No ads in
  the Diwan, in emails or on other pages. Runbook: `docs/platform/ads.md`.
- **Translations:** every UI string comes from
  `packages/internationalization/messages/{ar,en}.json`, checked by
  `bun run check:i18n`. Pass numbers and dates into messages already
  formatted; ICU `#` would use Arabic-Indic digits. Link with `Link`/`useRouter`
  from `@repo/internationalization/navigation`.
- **Localization:** UI must work in Arabic (RTL) and English (LTR). Use logical
  Tailwind utilities (`ms-*`, `pe-*`, `start-*`, `text-start`), never physical
  ones; `bun run check:rtl` enforces this. Icons that point along the reading
  direction get `rtl:rotate-180`. Arabic text sits one step larger with
  1.8–2.0 leading (handled by `:lang(ar)` in the design system).
- **Optional modules:** code belonging to an optional module is wrapped in
  `// <module:id>` … `// </module:id>` markers. Keep markers balanced;
  `bun run check:placeholders` verifies them.
- **shadcn/ui:** files in `packages/design-system/components/ui` are generated;
  update them with the shadcn CLI rather than hand-editing where possible.
  SAL components live in `packages/design-system/components/sal`.

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
