# Agent and contributor guide

Conventions for anyone — human or AI agent — changing this repository: the
platform of the AUIB Society of Arts and Letters (SAL), live at auibsal.org.

Start every session by reading `claude/decisions.md` (the owner's current
decisions, the source of truth: where an older document or this file
disagrees, it wins) and `PROGRESS.md` (the working checklist, blocked items
and decisions), and continue from the first unticked item.

## Repository map

- `apps/web` — **the one app**, auibsal.org (owner, Oct 24, 2026: one
  Next.js app in place of web, Nexus, api and the design site). Three parts,
  one deployment:
  - `app/[locale]/(site)` — the public site, `/` and `/ar`. Published reads
    only, with the publishable key; cached by tag and revalidated on publish.
  - `app/[locale]/(account)` — **the members' pages, on the site** (owner,
    Oct 24, 2026): `/sign-in`, `/sign-up`, `/auth/*`, `/setup`,
    `/oauth/consent`, and, for members, the Membership menu (owner, Oct 25,
    2026): Today (`/membership`), My calendar (`/events/book`), Callboard
    (`/callboard`), Society (`/society`), Record (`/membership/service`, with
    certificates) and Settings (`/membership/settings`, which also holds
    `/membership/profile` and `/membership/requests`); also `/membership/certificate`,
    `/membership/more` ("Tell us more"),
    `/events/company/auditions`, `/qirtas/write` (the two doors, your
    work, and the form itself with `?type=`; then `/submission`, `/work`,
    `/piece`). Perks are on the card; voting
    eligibility is on Society; the calendar feed is on My calendar. The
    site's header and footer, a Membership row (`components/account`), and
    the gates in `components/nexus/gates.tsx`. They link with the site's
    `Link` (`@repo/internationalization/navigation`) and full paths.
  - `app/[locale]/diwan` — **the Diwan** (code name `nexus`), auibsal.org/diwan:
    the officers' administration only (anyone holding a role,
    `RequireStaff`): the overview and modules at `/diwan/<module>`, the
    library, declarations. Members are sent to `/membership`. Diwan code names
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
- **One frame.** The public pages, the members' pages and the Diwan share
  one header (`components/masthead.tsx` with the site's sections from
  `site-header.tsx`) and one footer (`components/footer.tsx`), so moving
  between them never feels like another app.
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
  session; `access.has_permission` enforces it. Don't add bypasses. A
  passkey is a first step only (owner, Oct 25, 2026). A lost authenticator
  is recovered with one of ten recovery codes (`access.recovery_codes`,
  keyed hashes; made on the Diwan overview, used at the code prompt through
  `/api/two-step/recover`) or reset by whoever holds `roles.assign` (the
  member's page in the Diwan, `/api/two-step/reset`); either removes the
  authenticator so a new one is set up, is recorded in
  `access.two_step_resets` and emails the person.
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
- **Sign-up asks little** (owner, Oct 25, 2026). An AUIB address signs up
  with the address and a password; an outside address also gives the four
  names and a few words for the Council. `/setup` then asks one question
  per screen (`planSetup` in `components/nexus/setup-form.tsx`): each name
  not yet given, each pledge not yet made in its current version, and, the
  first time, photos; then the welcome screen with the card. Language
  follows the sign-up page and email notices start on (both in Settings).
  The optional details are "Tell us more" (`/membership/more`, a question
  at a time with Skip), offered on Today; Profile keeps the full form.
  Each screen starts at the top with its heading focused, never scrolled.
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
  together at `/events`, a month at a time, each program a series with its
  own calendar at `/events/<slug>` (there is no `/programs`, and no
  redirects: owner). Programs and events share the addresses under
  `/events`; triggers keep a slug to one of them (and off `book`). A
  program's sessions come from its repeat rule (`events.series_rules`,
  the Diwan's Programs → Sessions) through `events.add_series_sessions`,
  then are edited or canceled one by one as events. Every event has a way
  in, `events.events.entry`:
  `open` (just come; members may ask "Remind me", `events.reminders`),
  `rsvp` (book a place) or `invite` (only the people in
  `events.invitations` and the event's managers see it; always
  members-only, so every public reader that leaves members-only events out
  leaves it out too). The public calendar (`events.calendar`) shows
  members-only events as teasers (title, time, program; nothing else).
  `rsvp_enabled` is kept in step with `entry` by a trigger; write `entry`.
  SECURITY DEFINER code checks visibility with `private.can_see_event_id`.
  AUIB's own dates (the hourly sync of the University's public calendar
  into `core.external_events`, `events.universityCalendar`) sit beside the
  Society's on `/events`, quieter, linking to auib.edu.iq; "Hide AUIB
  dates" (`?auib=off`) and choosing a series leave them out. AUIB publishes
  them in English only, so their titles keep that language (`lang="en"`)
  on the Arabic pages.
- **Six programs, no groupings** (owner, Oct 29, 2026): Second Chapter,
  Typewriter Tour, the Company (`company`), the Salon (`salon`), Book
  Circle and Open Pages. No flagships, Evenings or Specials: each program
  shows its rhythm in one plain line (`core.programmes.rhythm_en`/`_ar`).
  Munazara, Mutanabbi Friday and Bad Poetry Night are folded into the
  Salon, Book Circle and Open Pages (their names retired; their sessions
  are the parent's events with plain titles). Qirtas and Next Stop keep
  unpublished program rows (Next Stop is Qirtas's video show). Second
  Chapter says "our charity partner" until the Council approves one; the
  charity partner stays unset.
- **Qirtas is one section.** Members send everything from `/qirtas/write`
  and the type decides the process (section editing, or the blind review
  for Edition work); the Diwan's Qirtas section holds the newsroom, the
  blind review (`?tab=review`) and the Prizes together.
  Six sections, six types each (owner, Oct 29, 2026; `journal.sectionTypes`,
  `journal.desk_of()`, `journal.is_current_category()` refuses any other):
  News (report, feature, interview, profile, event coverage, explainer),
  Voices (review, column, opinion essay, letter to the editor, debate,
  recommendations), Letters (poetry, fiction, creative nonfiction, drama,
  translation, Six Words), Gallery (art, photography, illustration,
  comics, calligraphy, photo essay), Video (Next Stop episode, reel, short
  film, video report, recorded performance, animation), Games (crossword,
  quiz, word ladder, riddle, anagram, name the book). Two doors: "Send to
  the newsroom" (News, Voices, Video, Games; always open) and "Submit to
  the Edition" (Letters, Gallery; only while a call is open, two calls a
  year, with "Tell me when", `journal.call_alerts`). Six Words take no
  submissions (the database refuses them). The Edition is printed: its
  record keeps the print run, printer and date (`journal.issues.print_run`,
  `printer_en`/`_ar`, `printed_on`), shown on the Edition page as a line.
- **The Qirtas Prizes** (owner, Oct 29, 2026; `/qirtas/prizes`): six
  prizes (`journal.prizes`): the Mutanabbi Prize (the whole paper), the
  Tabari (News), Jahiz (Voices), Nazik (Letters), Wasiti (Gallery) and Ibn
  al-Haytham (Video) Prizes. Each year a round (`journal.prize_rounds`)
  with its shortlist and award days; the first: shortlists April 4,
  awarded April 20, 2027. The Diwan (Qirtas → Prizes, `journal.prizes`
  permission) records shortlists, judges and winners
  (`journal.prize_entries`, `journal.prize_judges`, never public) and
  drafts the certificates (`journal.prepare_prize_certificates`, kind
  `prize`). The public reads only `journal.prize_results()`, which shows a
  shortlist from its day and never a winner before the award.
- **Six Words come only from the Typewriter Tour.** Never written on the
  site: whoever runs the Tour transcribes the card in the Diwan
  (`programmes.record_six_words`) and scans the writer's live membership
  card to make it theirs (`programmes.attach_six_words`); unsigned cards
  show without a name. One entry per member; a new card replaces the old.
- **The Callboard** (owner, Oct 25, 2026; header link "Get involved",
  `/callboard`, members only) is the careers page (owner, Oct 29, 2026):
  every role the Society is filling (`programmes.openings`, `kind`
  `role`, with its `owner`: a program, Qirtas, Media, Partnerships,
  Membership or the Council), shifts and auditions on one board. Hiring
  (owner, Oct 30, 2026; the Diwan's Hiring section): members reply "I'm
  interested" (`programmes.opening_replies`, emailed to Membership);
  Membership (`members.manage`) runs every application (conversation,
  offer, onboarding with F-06), and the role's owner picks the person
  (`private.picks_opening`: the Editor the masthead, the Director of
  Programs the Program Leads, each director their team); a trigger keeps
  the two apart.
  Roles and shifts carry the skills they want, from the same list as
  Profile (`core.member_details.skills`), and what matches the member
  comes first. Hours given are recorded as service as before. Two kinds of
  place (`programmes.placements`, given by the program's managers): the
  Apprenticeship (`apprenticeship`: one term in a Qirtas section, on
  Qirtas's own program row with `desk`, or in a program; its sessions are
  the shifts of its own rota, so the hours count as service;
  `programmes.complete_apprenticeship` drafts a certificate, kind
  `apprenticeship`) and First Ink (`first_ink`: mentor places for AUIB
  members volunteering with high school students, through the partner
  school, `partner_id`). High school students never get accounts and
  nothing about them is stored.
- **One partner register** (owner, Oct 25, 2026): `governance.partners`,
  kept in the Diwan's Partners section, is the only list of partners;
  charity campaigns, Qirtas calls and productions all name partners from
  it (the charity's own list is gone). Whoever names a partner on their own
  work reads names through `governance.partner_names()` (members: active
  and prospective partners; a partner's guest: their own). Accounts
  verified with a partner but not members are that partner's guests
  ("Guest of …"; `PartnerGuest`, `GUEST_PATHS` in `gates.tsx`).
- **No money** (owner, Oct 30, 2026). The Society holds no budget, no
  account and no money, and has no Treasurer; Student Life provides. No
  budgets, costs, prices, spending limits, claims or reimbursements
  anywhere. Programs and Qirtas keep needs lists (`programmes.needs`:
  item, quantity, date needed, purpose; the Diwan's Programs → Needs and
  Qirtas → Needs), and the General Secretary sends each request to
  Student Life and logs what was provided (Governance → Requests to
  Student Life). The one exception is Second Chapter's collection: the
  charity ledger (append-only, corrections are reversing entries, two
  counters, only signed-off entries count; the General Secretary
  witnesses and signs off), the witnessed handover on the campaign
  (`handed_over_on`, amount, witness, receipt) and the impact report. No
  online payments of any kind.
- **The Council page** (owner, Oct 30, 2026; `/governance` and the
  members' Society page) lists each seat by its full title from
  `governance.council_seats`: its holder, or the officer who covers it
  while it is open. Three officers and five directors; no Treasurer.
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
  Requests and reports (`/membership/requests`) and in Profile. The forms engine and its
  codes stay as they are underneath.
- **Members' and Diwan pages.** Every members' page and Diwan page is
  `DiwanPage` with `DiwanSection`s and `RowList`s
  (`components/nexus/page.tsx`): the Light title, one line, section titles
  standing alone, hairlines between rows only. Admin pages use
  `AdminHeading`, which matches. Nothing a member does lives in the Diwan.
- **Names.** The publication is **Qirtas** («قرطاس»; "AUIB's paper of news,
  letters and art"): news, voices, letters, the gallery, video (with Next
  Stop) and games in one paper with six sections (Waraq until the new
  names, owner, Oct 24, 2026; six sections, owner, Oct 29, 2026). The name is read from the settings `journal.name_en`/`_ar`;
  the schema keeps the code names `journal` and `waraq`. The Society has no
  charity partner on record (Natrok Athar was removed on Oct 8, 2026).
- **Renames (owner, Oct 24, 2026).** What people see changed; the code
  kept its names. One line each, "now (the code still says …)":
  - Qirtas, قرطاس, at `/qirtas` (code: `waraq`, `journal`, `components/waraq`).
  - The Sunday Paper, «صحيفة الأحد», is monthly, on the first Sunday
    (owner, Oct 29, 2026), to members who receive email and to the public
    list; The Month in Qirtas is merged into it and the name retired
    (code: `content.newsletter_subscribers`, the outbox kind
    `newsletter.monthly`, `private.queue_sunday_paper`). It carries the
    month's pieces, What's on and the Callboard's open places.
  - The Diwan, الديوان, at `/diwan`, for officers (code: `nexus`,
    `components/nexus`, `lib/nexus`, `nexusPath`, `paths.nexus`, messages
    namespace `nexus`, which also holds the members' pages' text).
  - Next Stop, المحطة القادمة, Qirtas's video show at `/qirtas/next-stop`,
    with its promise at `/qirtas/next-stop/care` (owner, Oct 29, 2026: no
    longer a program; code: `side-quest` in component and message names,
    program row `next-stop`, unpublished).
  - The Company, الفرقة (code: `productions`, slug `company`; at
    `/events/company`, with the productions).
  - Open Stage is part of the Company and the name is retired (owner,
    Oct 27, 2026; the program is removed, its history moved to the
    Company).
  - The Salon, «الصالون الأدبي» (was the Majlis; owner, Oct 29, 2026; slug
    `salon`, was `majlis`).
  - Munazara (into the Salon), Mutanabbi Friday (into Book Circle) and Bad
    Poetry Night (into Open Pages): folded and the names retired (owner,
    Oct 29, 2026; the programs are removed, their history moved).
  - Gallery Wall merged into Qirtas's Gallery desk, «معرض قرطاس» (code: slug
    `gallery-wall`, kept and unpublished).
  - The Qirtas Prizes, جوائز قرطاس (was "the Prizes").
  - The Register and the Roll of Fellows, السجل ولائحة الزملاء (were the Book
    of Members and the Book of Fellows).
  - The Return, ليلة العودة (was Charter Night).
  - Editor of Qirtas, Director of Programs, and the short Media,
    Partnerships and Membership titles (role assignment titles; role keys
    unchanged). Roles (owner, Oct 29, 2026): the "Director of the Company"
    title is removed; the Company's lead is a Program Lead (`programme_lead`)
    titled "Artistic Director". The Director of Programs
    (`programs_director`) holds the program permissions for every program;
    Program Leads are scoped to one program; other directors don't manage
    programs. The masthead adds a Voices Editor (`voices_editor`) and a
    Games Editor (`games_editor`, `journal.edit.games`).
  - The Council in Arabic is «المجلس التنفيذي».
  - Honorary Fellow, زميل فخري, and Life Member, عضو مدى الحياة (code: tiers
    `honorary` and `alumni`).
  - Membership, العضوية, at `/membership` (owner, Oct 25, 2026; was "Your
    account" at `/account`; code: route group `(account)`,
    `components/account`, message keys `nav.account`). "Account" still
    names the sign-in account (create, link, delete).
  The governance documents keep the old titles until the owner amends them;
  never edit the text of ratified documents (their spelling follows the
  American English rule).
- **Navigation** (owner, Oct 30, 2026). One main menu everywhere: the
  site's header (`site-header.tsx`) on the public pages, the members'
  pages and the Diwan alike: About, What's on, Qirtas, Get involved and
  Join (for visitors; signed in, the end of the line opens Membership),
  with Search, the language and the theme. Everything the Diwan had in its
  own header (the overview, the library, declarations, the Notion links)
  is in the administration menu (`admin-shell.tsx`, "For your role").
  Members' pages add their row (Today, My calendar, Society, Record,
  Settings, the Diwan for officers, Sign out). The footer
  (`footer.tsx`) holds what the header doesn't: the six programs, the
  Society's pages and the ways to stay in touch. No link appears twice
  among the header, a menu row and the footer. Every Diwan empty state
  offers one next action (`EmptyLine action`).
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
- **American English across the board, no exceptions** (owner's decision,
  Oct 8 2026; no exceptions, owner, Oct 29, 2026) in UI copy, emails,
  comments, commits, docs and the database's text: program, color, center,
  canceled, judgment. The endorsement line is "a Society of Arts and
  Letters program". Code identifiers may stay (the `programmes` schema,
  `programme_id`, `cancelled` status values).
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
- **Email:** Supabase sends the auth emails (templates in
  `packages/database/supabase/templates`, pasted into the hosted project);
  the outbox sends the rest through Resend (`packages/email`), each with a
  plain-text part. Optional emails (the Sunday Paper, booked-event
  reminders) follow `notify_email` and carry a stop link; sign-in and
  confirmation emails carry a code beside the link. Runbook:
  `docs/platform/email.md`.
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
