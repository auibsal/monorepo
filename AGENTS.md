# Agent and contributor guide

Conventions for anyone — human or AI agent — changing this repository: the
platform of the AUIB Society of Arts and Letters (SAL), live at auibsal.org.

Start every session by reading `PROGRESS.md` (the working checklist, blocked
items and decisions) and continue from the first unticked item.

## Repository map

- `apps/web` — the public site, auibsal.org (Next.js, `/en` and `/ar`).
  Published reads only, with the publishable key; cached by tag and
  revalidated on publish (`/api/revalidate`).
- `apps/app` — **the Nexus**, nexus.auibsal.org: the member portal and the
  role-gated admin. Client-rendered pages and one server piece, the locale
  proxy (`proxy.ts`); no secrets, Server Actions or Route Handlers (owner,
  Oct 14, 2026: the static export ended with Capacitor). Every check in it is
  UX only. Anything that needs a secret goes to `apps/api`, called with the
  member's token (`callApi` in `apps/app/lib/api.ts`).
- **URLs.** English, the default language, has no prefix (`/events`); other
  languages do (`/ar/events`), in both apps (owner, Oct 14, 2026). Build
  links with `Link` from `@repo/internationalization/navigation`, or
  `localizedPath(locale, path)` for another app's URL; never write `/en`.
- `apps/api` — api.auibsal.org: email, cron, calendar feeds, revalidation,
  exports, signed URLs, account deletion, and Hudhud, the Society's Telegram
  bot (`lib/bot`, grammY; webhook `/telegram`; `docs/platform/telegram.md`).
  The only app with the secret key. The bot acts for a member only through
  the `core.telegram_*` functions, which run the Nexus functions under the
  member's claims (aal1) so RLS still decides; its public reads use the
  publishable key. Bot copy in `lib/bot/copy.ts`; the mascot in
  `brand/mascot`.
- `apps/storybook` — the SAL Design System: SAL components, v5 Screens and
  every platform email in both languages, at design.auibsal.org. Its routing
  middleware lets in only officers signed in through the Nexus
  (`lib/gate.ts`); no vendor login.
- Documents live on auibsal.org/documents (`apps/web`); the officer handbook
  and the internal documents' text in the team's Notion workspace (the Nexus
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
- `packages/config/project.json` — names, motto, hosts, locales, region and
  the default journal name. Read it through `@repo/config`.
- `scripts/` — `check-placeholders.ts`, `check-rtl.ts`, `check-i18n.ts`.

## Commands

```sh
bun install
bun run dev                 # all apps
bun run check | fix         # Biome (Ultracite rules)
bun run typecheck           # every workspace
bun run test                # Vitest in every workspace
bun run check:placeholders
bun run check:rtl           # physical Tailwind utilities (--fix rewrites them)
bun run check:i18n          # UI text that isn't in the messages files
bun run check:unused        # unused files and dependencies (Knip)
bun run db:start | db:reset | db:test | db:types
bun run --cwd apps/e2e e2e   # Playwright journeys + axe (local stack running)
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
  fails without it). apps/api routes refuse app tokens unless they pass
  `authenticateRequest(request, { apps: true })`, which only `/v1` does.
- **Two-step sign-in for sensitive roles.** Roles with `requires_mfa`
  (Council officers, directors, Elections Committee) count only on an `aal2`
  session; `access.has_permission` enforces it. Don't add bypasses.
- **Atomic multi-step operations are Postgres functions** called by RPC
  (ledger sign-off, ballots, blind ids, waitlist promotion, transitions).
- **No secrets in `app` or `web`.** The service-role key lives only in
  `apps/api` and CI. New env vars go in the package's `keys.ts` and every
  affected `.env.example`.
- **Paired fields.** Translatable columns come in pairs (`title_en`,
  `title_ar`, …). Store times as `timestamptz` (UTC); display Asia/Baghdad.
- **Blind review.** Readers never receive author identity before a decision;
  verify against network responses, not the UI.
- **Money.** The charity ledger is append-only (corrections are reversing
  entries); only signed-off entries count. No online payments of any kind.
- **Documents.** Never present a draft document as adopted. Every document
  page shows its status from the registry.
- **Names.** The publication is **Waraq** («ورق»; full title "Waraq: AUIB's
  paper of news, letters and art"), owner's decision of Oct 14, 2026: the AUIB
  Literary Journal, news, the Gallery Wall, Six Words and Side Quest episodes
  in one paper with five desks. The journal became its Letters desk and its
  Editions. The name is read from the settings `journal.name_en`/`_ar`, so a
  rename is a settings change; the schema keeps the code name `journal`. The
  Society has no charity partner on record (Natrok Athar was removed on Oct 8,
  2026).
- **Navigation.** At most five sections per app header; the rest go in the
  footer (web) or the Account menu (Nexus). Every Nexus empty state offers one
  next action (`EmptyLine action`).
- **Content.** Don't invent names, dates, figures or quotes. Missing text is a
  `TODO(content): …` placeholder listed in `PROGRESS.md`. Arabic written for
  this platform (not taken from a source) is listed as `needs-native-review`.
- **Brand book (binding, SAL v4).** Components use only the role tokens
  (`surface`, `surface-tint`, `text`, `text-secondary`, `text-meta`, `title`,
  `accent-line`, `band`, `on-band`, plus `rule`). Never add a color. No
  shadows. Cards on `surface-tint` with the 8px card radius. At most one
  crimson band per page; crimson never on ink. Light everywhere; the ink
  theme (`data-theme="dark"`) only on the "why" pages and the Open Call page.
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
  `apps/app`, query with `useAuth().supabase` so RLS applies. In `apps/api`,
  identify callers with `authenticateRequest` and re-check permissions with
  `hasPermission` (`apps/api/lib/permissions.ts`). The admin client
  (`@repo/database/admin`) bypasses RLS: webhooks, cron and trusted server
  code only.
- **Files:** use `@repo/storage`. Private buckets (`submissions`, `receipts`,
  `library`) are reached only through signed URLs issued by `apps/api`.
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
- **Ads:** in Waraq on `apps/web` only, never for signed-in visitors (owner,
  Oct 16, 2026): Society ads, sponsor ads (only with a signed memorandum
  granting `advertising`; Policy Manual 11.3 applies) and Google AdSense for
  the rest. Readers get ads only through `journal.current_ads()`. No ads in
  the Nexus, in emails or on other pages. Runbook: `docs/platform/ads.md`.
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
