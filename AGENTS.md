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
    Oct 24, 2026): `/sign-in`, `/sign-up`, `/auth/*`, `/welcome` (was
    `/setup`), Get involved (`/get-involved`, public: the
    three ways in for visitors, the Callboard for members), and, for
    members, everything under `/membership` (the overhaul, Oct 30, 2026):
    Today (`/membership`), My calendar (`/membership/calendar`), Society
    (`/membership/society`), Record (`/membership/record`, a certificate at
    `/membership/record/<id>`), Settings (`/membership/settings`, with
    `/settings/profile`, `/settings/more` ("Tell us more") and
    `/settings/notices`; officers also `/settings/declarations`, and
    their recovery codes on Settings), Requests (`/membership/requests/<id>`) and Your
    work (`/membership/work`, `/work/<id>`, `/work/submissions/<id>`);
    also `/company/auditions`, `/qirtas/write` (every section, and the form
    at `/qirtas/write/<type>`) and `/qirtas/read/<slug>` (a members-only
    piece). Perks are on the card; voting
    eligibility is on Society; the calendar feed is on My calendar. The
    site's header and footer, a Membership row (`components/account`), and
    the gates in `components/nexus/gates.tsx`. They link with the site's
    `Link` (`@repo/internationalization/navigation`) and full paths.
  - `app/[locale]/diwan` — **the Diwan** (code name `nexus`), auibsal.org/diwan:
    the officers' administration only (anyone holding a role,
    `RequireStaff`), in six sections, one row like Membership's
    (`adminSections` in `@repo/rbac`, `DiwanNav` and `SectionTabs` in
    `admin-shell.tsx`; owner, Oct 30, 2026): the Desk (`/diwan`: what
    needs you, three quick actions, what happened, and the Connected panel
    for Notion, Hudhud and email), What's on (`/diwan/events`, `/events/programs`
    with each program's page; each event has its own door,
    `/events/<slug>/door`, and the Desk opens the next one (owner, Oct 31,
    2026: no general door); Second Chapter's collection
    is a tab of its program), Qirtas (`/diwan/qirtas`, its tabs and the
    ads; calls are on each Edition's page), The Company (`/diwan/company`), People (`/diwan/people`,
    verification (partner applications only), hiring, service, partners, insights) and Society
    (`/diwan/society`: minutes, resolutions, requests to Student Life,
    elections, concerns, the Library, where only `governance.manage`, the
    President, the Vice President and the General Secretary, keep the
    documents). Records by name where they have one
    (`/diwan/events/<slug>`, `/diwan/qirtas/pieces/<slug>`; `RecordRef`
    in `components/nexus/record-ref.tsx`), `new` for a blank one. Members
    are sent to `/membership`. Diwan code names
    pages by their own path (`/events`); `Link`, `useRouter`, `usePathname`
    and `redirect` from `@/lib/nexus/navigation` add the `/diwan` prefix.
  - Both are client-rendered (`components/nexus`, `lib/nexus`, the code
    kept its names); every check in them is UX only. They read and write
    Supabase with the user's token, and call the API routes with it
    (`callApi` in `lib/nexus/api.ts`). Shared empty states link through
    `useAppLink` (`lib/link-context.tsx`): the site's link outside the Diwan,
    the Diwan's inside it.
  - `app/api` and `lib/api` — the API routes, auibsal.org/api: email, cron,
    calendar feeds, exports, signed URLs, account deletion, and Hudhud, the Society's Telegram bot (`lib/api/bot`,
    grammY; webhook `/api/telegram`; `docs/platform/telegram.md`). The only
    code that reads the secret key. The bot acts for a member only through
    the `core.telegram_*` functions, which run the Diwan functions under the
    member's claims (aal1) so RLS still decides. Bot copy in
    `lib/api/bot/copy.ts`; the mascot in `brand/mascot`.
- **Paths, never queries** (owner, Oct 31, 2026). Every view has its own
  path: tabs are pages (`SectionTabs` matches by path), a month is
  `/events/2026-11` (`/events/2026-11/society`, `/events/<series>/2026-11`,
  `/company/2026-11`; no event or production slug may read as a month),
  a production is `/company/<slug>`, search is `/search/<words>` (results
  grouped by kind), a welcome step `/welcome/2`, a request
  `/membership/requests/new/<form>`. Never add `?tab=` or a query for
  what a path can say.
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
- The Society's documents are the Library, auibsal.org/library (`apps/web`;
  two shelves, owner, Oct 30, 2026: Society documents, and Website
  policies, the `SAL-PLT-` documents with the privacy page;
  owner, Oct 30, 2026: every document public, kept in the Diwan's Library).
  The officer handbook and every internal document live in the team's
  Notion workspace only (the Desk links there: settings
  `notion.home_url`, `notion.handbook`; `docs/platform/notion.md`). What
  the platform retired (forms, letters, officers' papers) lives on as
  Notion templates (the Desk's "Templates and papers",
  `notion.handbook.pages.templates`), and Diwan pages with a Notion
  counterpart (events, programs, documents, minutes, officers) say so
  with `NotionManaged`. The About page (`/about`) is the hub for the
  Society's pages. The platform runbooks in `docs/platform`
  (Markdown). There is no separate docs site. The apps configure no
  redirects (owner, Oct 14, 2026; again Oct 30, 2026: none for the
  overhaul's moved addresses either, and no forwarding pages); an old
  address is simply not found. www.auibsal.org → auibsal.org is a Vercel
  domain setting. The address alone decides the language
  (`localeDetection: false`). A piece's address comes from
  `journal.piecePath` (its section; Games pieces at `/qirtas/pieces/`).
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
bun run --cwd packages/design-system icons       # regenerate the icon data from brand/icons
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
- **No third-party apps** (owner, Oct 30, 2026: no Sign in with SAL, no
  `/api/v1`). A token issued to an app carries a `client_id` and reaches
  nothing: every table keeps the restrictive policy "No third-party apps"
  (`private.client_allows`, migration `20261031000000`;
  `99_no_third_party_apps.test.sql` fails without it, so every new table
  needs it), the pre-request gate refuses the Data API, and
  `authenticateRequest` returns no one. The Society's connected platforms
  are Notion and Telegram (Hudhud), reached from the API routes.
- **Two-step sign-in for sensitive roles.** Roles with `requires_mfa`
  (Council officers, directors, Elections Committee) count only on an `aal2`
  session; `access.has_permission` enforces it. Don't add bypasses. A
  passkey is a first step only (owner, Oct 25, 2026). A lost authenticator
  is recovered with one of ten recovery codes (`access.recovery_codes`,
  keyed hashes; made on Membership → Settings, used at the code prompt through
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
- **Terms come from the AUIB calendar** (owner, Oct 30, 2026). The hourly
  sync (`/api/cron/calendar-sync`, `campusCalendar` in the project file)
  writes each semester the feed opens and closes into `core.semesters`
  (`lib/api/terms.ts`); nobody types terms in. Everything runs for a term
  unless it is an event or given its own dates: a role assigned without an
  end runs to the end of the Society's year, the end of the Spring
  semester (`private.year_end()`, trigger `runs_for_the_year`), unless
  ended sooner; the Faculty Advisor (a role, named with the Council)
  serves until ended. `core.current_term()` names today's term.
- **Nothing kept by hand that is known elsewhere** (owner, Oct 30, 2026).
  There is no Settings page: the paper's name, hello@auibsal.org and the
  AUIB calendar are in `packages/config/project.json`; Hudhud invites
  members to the Telegram group; the Faculty Advisor is a role; pledge and
  agreement versions are internal (`core.pledge_versions()`, members
  only); no feature switches. Notion and Hudhud are checked from the
  Desk's Connected panel. No announcements, site pages or homepage slots:
  each page carries its own text, and notices go out through Hudhud and
  the Sunday Paper. The activity log reads as sentences ("Lina changed
  the event …"; `components/nexus/admin/system/activity.tsx`), and a new
  logged table needs its line there.
- **Paired fields.** Translatable columns come in pairs (`title_en`,
  `title_ar`, …). Store times as `timestamptz` (UTC); display Asia/Baghdad.
- **Blind review.** Readers never receive author identity before a decision;
  verify against network responses, not the UI.
- **Member data.** One name per language (owner, Oct 31, 2026:
  `full_name_en` and `full_name_ar`, both required; the given and family
  parts are gone). Wherever a person is named (judges, bylines, hosts,
  roles), pick them from the register (`MemberPicker`) and never type
  their names: a trigger copies the profile's names and keeps them in
  step (`private.profile_names_to_bylines`). Everything in
  `core.member_details` is optional and read only by the member and
  `members.manage`; reports count only members with `research_consent`
  and never show a group smaller than five (`core.member_insights()`).
  Public pages never show it. No phone numbers until they can be verified
  (owner, Oct 25, 2026).
- **Sign-up asks little** (owner, Oct 25, 2026). An AUIB address signs up
  with the address and a password; an outside address also gives its
  name in each language, and one of the partners verifies it (owner, Oct
  31, 2026: the Society verifies partners only). `/welcome` then asks one question
  per screen (`planSetup` in `components/nexus/setup-form.tsx`): each
  language's name not yet given, each pledge not yet made in its current version, and, the
  first time, photos; then the welcome screen with the card. Language
  follows the sign-up page and email notices start on (both in Settings).
  The optional details are "Tell us more" (`/membership/settings/more`, a question
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
  default). Google Wallet only (`docs/platform/wallet.md`); the card asks
  the Wallet API whether the pass is saved rather than waiting for
  Google's callback. Never put an
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
- **Six programs, no groupings** (owner, Oct 30, 2026): Second Chapter,
  Typewriter Tour, the Salon (`salon`), Book Circle, Open Pages and the
  Listening Room (`listening-room`), in that order; the Tuesday series
  meet every fourth week. No flagships, Evenings or Specials: each program
  shows its rhythm in one plain line (`core.programmes.rhythm_en`/`_ar`).
  The Company (`company`) is the Society's theater company, not a
  program, with its Artistic Director on the Council: its row stays live
  for its page, calendar and roles, and every list of programs leaves it
  out (`programmes.isListedProgram`, `notPrograms`). It has its own page
  at `/company`, beside Qirtas in the header (owner, Oct 30, 2026): its
  productions, auditions and dates; `/events/company` is not a page
  (`loadSeries` takes listed programs only; `seriesPath`).
  Munazara, Mutanabbi Friday and Bad Poetry Night are folded into the
  Salon, Book Circle and Open Pages (their names retired; their sessions
  are the parent's events with plain titles). Qirtas and Next Stop keep
  unpublished program rows (Next Stop is Qirtas's video show). Second
  Chapter says "our charity partner" until the Council approves one; the
  charity partner stays unset.
- **Qirtas, one door** (owner, Oct 31, 2026). Members send everything,
  every section, from `/qirtas/write` (`/qirtas/write/<type>` is the
  form), and everything they send is read blind. Edition calls (Letters,
  Gallery, two a year) stay; beside them the standing call "Qirtas, all
  year" (`journal.calls` with no `issue_id`, `calls_one_standing`) takes
  every section, never closes and counts `max_per_person` per term; a
  submission that names no call goes to it. The global masthead reads
  and decides it. An author may publish under a pen name, never Anonymous
  (owner, Oct 31, 2026; `submissions.pen_name`, made a pen-name byline by
  `make_piece`). A manuscript sent as Word or PDF fills the editor with
  its text in the browser (`lib/manuscript.ts`, mammoth and pdf.js), and
  the file still goes with the work. The newsroom is where staff write
  and publish directly: the Diwan's Qirtas section is the Newsroom
  (`/diwan/qirtas`, one page per section, `/diwan/qirtas/news` …
  `/games`; Next Stop is in Video, puzzles in Games), Review, Editions,
  Awards and Ads, each its own page. Bylines are people: a member under
  their own name or a pen name, picked with `BylinePicker` and made by
  `journal.byline_for()`, never typed. Clients never read
  `contributors.user_id`, so a pen name can't be traced to its author.
  Six sections, six types each (owner, Oct 29, 2026; `journal.sectionTypes`,
  `journal.desk_of()`, `journal.is_current_category()` refuses any other):
  News (report, feature, interview, profile, event coverage, explainer),
  Voices (review, column, opinion essay, letter to the editor, debate,
  recommendations), Letters (poetry, fiction, creative nonfiction, drama,
  translation, Six Words), Gallery (art, photography, illustration,
  comics, calligraphy, photo essay), Video (Next Stop episode, reel, short
  film, video report, recorded performance, animation), Games (crossword,
  quiz, word ladder, riddle, anagram, name the book). Members may send
  to Qirtas at any time; only the printed Edition takes work at set times
  (its calls, Letters and Gallery, two a year, with "Tell me when",
  `journal.call_alerts`). Six Words take no
  submissions (the database refuses them). The Edition is printed: its
  record keeps the print run, printer and date (`journal.issues.print_run`,
  `printer_en`/`_ar`, `printed_on`), shown on the Edition page as a line.
- **The Qirtas Awards** (owner, Oct 29, 2026; "Awards", never "Prizes",
  owner, Oct 31, 2026; `/qirtas/awards`): six awards (`journal.prizes`,
  the code keeps `prize`): the Mutanabbi Award (the whole paper), the
  Tabari (News), Jahiz (Voices), Nazik (Letters), Wasiti (Gallery) and Ibn
  al-Haytham (Video) Awards. Each year a round (`journal.prize_rounds`)
  with its shortlist and award days; the first: shortlists April 4,
  awarded April 20, 2027. The names are confirmed (owner, Oct 31,
  2026). The Diwan (Qirtas → Awards, `journal.prizes`
  permission) records shortlists, judges (members, picked from the
  register) and winners
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
  `/get-involved`, the board for members) is the careers page (owner, Oct 29, 2026):
  every role the Society is filling (`programmes.openings`, `kind`
  `role`, with its `owner`: a program, Qirtas, Media, Partnerships,
  Membership or the Council), shifts and auditions on one board. A role
  opening names its role (`programmes.openings.role`; owner, Oct 31,
  2026: every role in Roles and Staffing is on the platform, each with
  `access.roles.hiring_owner`), which sets its owner, and whoever is
  onboarded holds the role (`private.onboarded_takes_role`). Hiring
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
- **Partners on the platform** (owner, Oct 31, 2026). An organization
  applies at `/about/partners/join` (`governance.apply_as_partner`): its
  profile, the partnership's purpose and its side, the grants it asks for,
  and its signatory signs the memorandum by name. No PDFs: memoranda are
  signed by name on both sides (`sign_partner_agreement` takes no file).
  The Diwan's verification queue holds these applications
  (`governance.partner_applications()`); the President signs, the partner
  turns active and whoever applied gets `partner_rep`, a role scoped to
  the partner (`scope_type` `partner`) with `partners.own`. Each partner
  keeps its own page at `/diwan/partner` (Profile and memorandum, Perks,
  People: guests and a team of up to six; `components/nexus/partner`,
  route group `diwan/(partner)` with `RequirePartner`, no membership
  gate). Row Level Security keeps a representative to its own partner;
  its listing, status and address stay the Society's
  (`guard_partner_self_edit`). Partners verify their own people
  (`partner_affiliations`, `governance.partner_guests`); outside sign-ups
  no longer open a Society request. Representatives are not officers:
  `RequireStaff` sends a representative-only account to its partner's
  page, and the Notion directory leaves them out.
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
- **The Council page** (owner, Oct 30, 2026; `/about/council`, the members'
  Society page and the Diwan's Governance → Council) comes from the roles
  people hold (`governance.council_members()`): everyone holding a Council
  role (`access.roles.is_council`, global, in force), under the role's
  name or the assignment's display title. Someone holding two roles is
  named once, with both titles: a second Council role (covering a seat)
  needs an adopted Council resolution (`exception_resolution`,
  Constitution 6.6; `private.role_conflict`). Nothing is kept by hand:
  assign roles on the member's page. Three officers and the directors,
  among them the Artistic Director (`artistic_director`: every production,
  the door, the Company's openings; nothing else); no Treasurer.
- **Documents.** Every document is adopted, Version 1 (owner, Oct 24, 2026).
  Visitors and members see the title, summary and text only; codes
  (`SAL-…`, `F-…`), statuses, versions and ratification lines are internal
  and appear only in the admin. A later draft stays in the admin until it
  is adopted.
- **One language per page.** The English pages carry no Arabic and the
  Arabic pages no English (owner, Oct 24, 2026); the only exceptions are
  the language switcher, fields meant for the other language, and a
  document that exists in one language only.
- **No forms, as such** (owner, Oct 30, 2026). Members never see the word
  "form" or a form code. Three requests stay, each a plain action where it
  belongs (`startableKeys` in `@repo/sal-data/forms`, `StartLinks`):
  raise a concern (F-20; Society → Concerns), pitch a program (F-10;
  What's on → Programs) and propose a General Assembly motion (F-09;
  Society → Resolutions). Every other kind is `retired` (no new
  submissions; past ones stay readable under Requests and reports): it is
  done elsewhere on the platform (roles on the Callboard, service hours,
  certificates, the conflict-of-interest declaration in Settings, photo
  consent in Profile) or is an officers' paper kept as a Notion template.
  No standard letters: emails and certificates carry what letters did.
- **Members' and Diwan pages.** Every members' page and Diwan page is
  `DiwanPage` with `DiwanSection`s and `RowList`s
  (`components/nexus/page.tsx`): the Light title, one line, section titles
  standing alone, hairlines between rows only. Admin pages use
  `AdminHeading`, which matches. Nothing a member does lives in the Diwan.
- **Names.** The publication is **Qirtas** («قرطاس»; "AUIB's paper of news,
  letters and art"): news, voices, letters, the gallery, video (with Next
  Stop) and games in one paper with six sections (Waraq until the new
  names, owner, Oct 24, 2026; six sections, owner, Oct 29, 2026). The name is set (owner, Oct 30, 2026), in `packages/config/project.json`;
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
    `/company`, its own page beside Qirtas, with the productions).
  - Open Stage is part of the Company and the name is retired (owner,
    Oct 27, 2026; the program is removed, its history moved to the
    Company).
  - The Salon, «الصالون» (was the Majlis; owner, Oct 29, 2026; slug
    `salon`, was `majlis`).
  - Voices, «آراء» in Arabic (was «أصوات»; owner, Oct 30, 2026; desk
    `voices`). The Sunday Paper is «جريدة الأحد» (was «صحيفة الأحد»).
  - The Artistic Director, «المدير الفني», a Council seat
    (`governance.council_seats` key `artistic_director`; the Company's lead
    is still a `programme_lead` for the Company).
  - Munazara (into the Salon), Mutanabbi Friday (into Book Circle) and Bad
    Poetry Night (into Open Pages): folded and the names retired (owner,
    Oct 29, 2026; the programs are removed, their history moved).
  - Gallery Wall merged into Qirtas's Gallery desk, «معرض قرطاس» (code: slug
    `gallery-wall`, kept and unpublished).
  - The Qirtas Awards, جوائز قرطاس (were "the Prizes"; code: `prize`).
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
  pages and the Diwan alike: About, What's on, Qirtas, The Company, Get
  involved and
  Join (for visitors; signed in, the end of the line opens Membership),
  with Search, the language and the theme. The Diwan sits under
  Membership, for officers only (`useIsStaff`, remembered for the public
  pages in the `sal_diwan` hint cookie; UX only). Below the desktop width
  the bar keeps the logo and the menu button, and everything else opens
  in the panel. Inside the Diwan, its own row of six sections follows the
  header (`DiwanNav`), and each section's tabs follow that.
  Members' pages add their row (Today, My calendar, Society, Record,
  Settings, Sign out). The footer
  (`footer.tsx`, not in the Diwan) holds what the header doesn't, in
  threes: the six programs, six of the Society's pages (the Council, the
  Library, Partners, Contact, the press kit, Verify) and three ways to
  stay in touch, then three lines of fine print. The Diwan's row has six
  sections; the Desk three quick actions. No link appears twice
  among the header, a menu row and the footer. Every Diwan empty state
  offers one next action (`EmptyLine action`).
- **Threes** (owner, Oct 30, 2026). The Society's things come in threes:
  3, 6, 9, 12. Menus, columns, groups, rows of cards and quick actions
  keep to them (six in the header, three footer columns, six Diwan
  sections, three quick actions).
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
  Icons (owner, Oct 30, 2026): only the Society's set, `brand/icons`
  (Lucide redrawn at 1.5 px with square ends, one meaning each), through
  `Icon` (`@repo/design-system/components/sal/icon`, data generated by
  `bun run --cwd packages/design-system icons`); never `lucide-react`. An
  icon stands alone when its meaning is plain (with a `label`), beside a
  word when it could be misread; never in a headline, as a bullet or as
  decoration; no emoji.
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
