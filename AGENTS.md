# Agent and contributor guide

Conventions for anyone, human or AI agent, changing this repository: the
platform of the AUIB Society of Arts and Letters (SAL), live at
auibsal.org.

Start every session by reading `claude/decisions.md` (the owner's current
decisions and the source of truth: where this file or any older document
disagrees, it wins) and `PROGRESS.md` (the working checklist, with what is
blocked), and continue from the first unticked item. Where decisions.md is
silent, do what American university student organizations and student
media do.

## Repository map

- `apps/web`: **the one app**, auibsal.org. Three parts, one deployment:
  - `app/[locale]/(site)`: the public site. Published reads only, with the
    publishable key; cached by tag and revalidated on publish.
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
    `@repo/rbac`; `DiwanNav` and `SectionTabs` in `admin-shell.tsx`): the
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
    `useRouter`, `usePathname` and `redirect` from `@/lib/diwan/navigation`
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
    (`lib/api/bot`, grammY; webhook `/api/telegram`;
    `docs/platform/telegram.md`). The only code that reads the secret key.
    The bot acts for a member only through the `core.telegram_*`
    functions, which run the Diwan functions under the member's claims so
    RLS still decides. Bot copy is in `lib/api/bot/copy.ts`.
- `packages/brand`: **the design system**, SAL-MED-02, the single source of
  the brand: the guide (`guide/`, Markdown), the rules in short
  (`BRAND-BOOK.md`), the assets (tokens, fonts, icons, logos, Hudhud, the
  social templates, the printables), and the code the app imports as
  `@repo/brand` (`styles/globals.css`, `components/ui` (shadcn),
  `components/sal`, `lib`). Its Storybook is the Diwan's `/diwan/media/design`
  (Guide, Foundations, Logos, Components, Emails, Social, Print), built
  into `apps/web/design` by the web build and served at `/_design` to staff
  only (`app/api/design`; ignored by git, never
  indexed). The public sees the brand only on the press page
  (`/about/press`). No PDFs or document files in the repository: print
  is the page printed from the browser.
- `packages/*`: shared code, imported as `@repo/<name>` (a fixed internal
  scope; never rename it).
  - `@repo/database`: SQL migrations (`supabase/migrations`), pgTAP tests
    (`supabase/tests/database`), generated types.
  - `@repo/rbac`: permission keys, role bundles, modules and sections, the
    client mirror of `access.has_permission()`, test personas.
  - `@repo/sal-data`: zod schemas and typed queries per domain, the forms
    registry (`forms.ts`) and the daily games.
  - `@repo/email`: the email template and every email's copy
    (`copy.ts`).
  - `@repo/internationalization`: messages, navigation, formatting.
- `packages/config/project.json`: names, motto, the site URL, the `/diwan`
  (`paths.diwan`) and `/api` paths, locales, region, hello@auibsal.org and
  the AUIB calendar. Read it through `@repo/config`.
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
bun run check:forms         # the forms registry against SAL-EXB-01 (needs NOTION_TOKEN)
bun run check:unused        # unused files and dependencies (Knip)
bun run db:start | db:reset | db:test | db:types
bun run --cwd apps/e2e e2e   # Playwright journeys + axe (local stack running)
bun run --cwd packages/brand dev       # the design system, locally
bun run --cwd packages/database db:test:sync     # copy the pgTAP preamble
bun run --cwd packages/brand tokens      # regenerate tokens.css
bun run --cwd packages/brand icons       # regenerate the icon data
bun run gen:package         # scaffold packages/<name>
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
  after 30 minutes unused (`IdleSignOut`). An AUIB sign-in address is not
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
  go in the package's `keys.ts` and in `apps/web/.env.example`.
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
  read `contributors.user_id`, so a pen name can't be traced.
- **No third-party monitoring or protection.** Errors and logs go to the
  Vercel runtime log (`@repo/observability` prints only); the security
  headers are the app's own (`@repo/security`); public forms are rate
  limited in the database (`withinRateLimit`, `core.take_rate`).
- **Files:** use `@repo/storage`. Private buckets are reached only through
  signed URLs issued by the API routes.

## The Society in the code

- **The Council of nine.** The Executive Board (President, Vice President,
  General Secretary) and six directors (Editor-in-Chief, Director of
  Media, Artistic Director, Director of Events, Director of Partnerships,
  Director of Membership); `isCouncil` in `@repo/rbac/roles.ts`, mirrored
  from the database. Until a seat is filled, the President covers Events
  and the Artistic Director, the Vice President Partnerships, the General
  Secretary Membership; the role bundles give them those permissions. The
  Acting President (`acting_president`) is assigned for the President's
  time abroad. The Council page (`/about/council`,
  `governance.council_seats()`) lists the nine seats by full title, held
  or open, from the roles people hold: nothing is typed by hand. A second
  Council role needs an adopted Council resolution
  (`private.role_conflict`).
- **The first term.** Anyone newly appointed or joining a team serves a
  first term on probation; whoever appointed them confirms them
  (`confirmAssignment`). Elected seats have none. Candidates and
  appointees are checked by Student Life for a 2.0 GPA
  (`record_gpa_check`): the Society stores only "eligible" or "not
  eligible", never grades.
- **Terms come from the AUIB calendar.** The hourly sync
  (`/api/cron/calendar-sync`, `lib/api/terms.ts`) writes each semester
  into `core.semesters`; nobody types terms in. A role assigned without an
  end runs to the end of the Society's year (`private.year_end()`).
- **Members.** One account is one kind (`private.membership_kind`,
  `membership.my_membership()`): `member` (an AUIB address), `guest` (the
  Society's or a partner's) or `partner` (a partner's Lead or Team);
  triggers named `one_membership` refuse a second kind. Members have a
  class (`membership.tier`): Member, Associate Member or Honorary Member;
  only Members vote (checked in at two events or general meetings that
  academic year: check-ins are the only record, `membership.activity_records`)
  and hold office. Staff is a member holding a role (`private.is_staff`).
  Students join themselves with an AUIB address and confirm they are
  students; Associate and Honorary Members (Honorary only after the
  Council's resolution, F-34) join by the Director of Membership's
  invitation. One invitation system (`governance.partner_invitations`,
  decisions §10): every invitation is single-use, to a named address,
  valid 14 days and revocable, sent by the Director of Membership
  (classes), a Partner Lead (the team, its guests) or an event's lead
  (guests); no shareable links and no invitation ever grants a role.
  Sign-up takes an AUIB address only, unless the account comes from an
  invitation, applies to partner or signs up as a guest
  (`private.sign_up_allowed`). `/welcome` asks one question per screen
  (`planSetup` in `components/diwan/setup-form.tsx`).
- **Names.** A name in four parts in each language, as on the person's
  papers (`first_name_en` … `last_name_ar`), all eight required
  (`NamePartsFields`, `hasAllNames`). Wherever a name shows, it is the
  first and the fourth (`full_name_en`/`_ar`, kept by
  `private.tidy_names`). The parts are the owner's alone
  (`core.my_name_parts()`). One full name belongs to one account
  (`private.one_person_one_name`). Wherever a person is named (bylines,
  hosts, judges, roles), pick them from the register (`MemberPicker`,
  `BylinePicker`); never type a name.
- **One address, one person.** The optional personal email is set only
  through `core.request_personal_email` and counts once confirmed
  (`/personal-email/confirm`); it can't be an AUIB address or anyone
  else's address.
- **The membership card is live** (never "ID card"). Its QR is
  `/verify/member/<code>?t=<digits>`, a TOTP of the card's secret (RFC
  6238, SHA-1, 30 s, 8 digits; `lib/totp.ts` and `private.totp` must
  agree, as Google Wallet does). The secret reaches only its owner
  (`membership.my_card`); the door (`events.check_in_card`) refuses a code
  that isn't live. The card shows the number, name, class or Guest, the
  role held on a second line (`private.card_role`), the year since and
  the QR; the check page shows the same fields for a live code only, and
  an old code only that it is not current. No member photos; never put an
  account id in a QR. Google Wallet only (`docs/platform/wallet.md`),
  refreshed when a role or class changes (`wallet.refresh`).
- **One design per thing** in `@repo/brand/components/sal`: `FormPage`,
  `Letter`, `MembershipCard`, `Certificate` and the guilloche. The site
  renders them; print and PDF are the same page printed from the browser.
  The card and certificate keep the live site's look (the card's tilt and
  sheen are the one exception to "no 3D", off with reduced motion).
- **Certificates** are two: finishing Qalam and the Mutanabbi Prize, one
  language each, with a verification code (`/verify/<code>` takes a
  certificate or a card code). Service is a letter
  (`membership.service_letters`, F-05) with a verification code. Every
  letter (F-03, F-05, F-30, F-32, F-33, F-34, F-42) is one American
  business letter template.
- **Numbers and codes** (decisions §6): one five-digit series for members
  and guests (the card); CERT-, LTR-, RES-, MOU- and
  TOUR-<year>-<three digits>, each given by the site from
  `private.next_code` (gapless, `core.code_counters`) when the record is
  issued: a certificate when both sign, a letter when written, a
  resolution when adopted, a memorandum when the President countersigns.
  Verification codes are random and separate. Nobody types a number.
- **Forms** are at `/forms/<number>` on one standard page, signed in the
  signer's platform name and kept as the signed copy; staff forms are
  Notion templates. The forms register in SAL-EXB-01 is the one source of
  every form's number, title and fields; `bun run check:forms` compares
  `governance.form_types` and the registry with it. Where the site already
  does the job (joining, RSVPs, Write for Qirtas, Get involved,
  elections), the form is that page. Members never see the word "form" or
  a form code; the requests they can start are plain actions where they
  belong (`StartLinks`).
- **Signatures** are `Signature`/`MySignature` (`components/signature.tsx`):
  the signer's name on the platform in the signature face, the card
  number, the date and a guilloche. Never typed.
- **Events.** One events manager, one standard event. Every event,
  meetings among them, is made in Notion's Events database and copied to
  the site by the sync; the Diwan shows it read-only and keeps only the
  site's own parts (nothing is made in the Diwan). Every event has
  the one page on the site (`EventView` with `EventParts`) and in the
  Diwan (`EventEditor` with `EventPartsAdmin`), with only the standard
  parts: its access (`events.events.entry`: `open`, `rsvp`, `members` or
  `invite` (Private); `members_only` is derived from it), RSVP and
  check-in, registration questions, a needs list,
  volunteer shifts (on the event only, logging no hours), a partner
  checklist (`events.joint_tasks`) and links from the night
  (`events.session_links`, https only). Off campus is a standard field:
  such an event publishes only once the General Secretary records Student
  Life's written approval (`events.record_approval`), and participants
  sign the trip consent, F-45. Nothing is built for one event or one kind
  of event. An event that recurs is made again for each date; there are
  no series and no programs (the code keeps its identifiers: the
  `programmes` schema, `programme_id`, `programs.manage`; copy says
  "event" or "event lead"). Minutes and resolutions are governance records
  pointing at their meeting's event (`governance.minutes.event_id`).
- **What's on is one calendar**: `/events`, a month at
  `/events?month=<yyyy-mm>`, the Company's dates at `/events?host=company`,
  each event at `/events/<slug>`. The public calendar shows members-only
  events as teasers; SECURITY DEFINER code checks visibility with
  `private.can_see_event_id`. AUIB's own calendar is one link, not dates
  beside the Society's.
- **Event leads.** `programme_lead` (Event Lead) is scoped to one event
  (scope `event`): they edit it, keep its shifts and needs, see its
  bookings and run its door (`private.leads_event`). The Director of
  Events (or the President, covering) picks them.
- **The Typewriter Tour** belongs to membership: `/join/typewriter-tour`,
  with the Six Words wall (`programmes.six_words_wall()`) and a typewriter
  to try (`TypingToy`, silent until the key sound is turned on). Whoever
  runs the Tour (`tour.run`: the Director of Membership, the General
  Secretary and the Tour Lead) records pages in the Diwan (Membership →
  Typewriter Tour) and attaches each to its writer's account. Six Words
  are not part of Qirtas: they are Tour pages, private by default, shown
  on the writer's profile or the Tour's page only by their choice
  (`programmes.six_words.visibility`). Spring 2026 pages arrive by the
  one import (`programmes.import_tour`); pages with no email stay private
  and editors-only until a writer claims one through Help Desk. The
  one-time invitations (`membership.invitations`) go only when the
  President says go (`membership.send_invitations`), as one Broadcast,
  and are deleted thirty days later.
- **Get involved** (`/get-involved`, `programmes.open_places()`) lists open
  roles only, soonest first: Council and team roles, event teams, Qalam
  mentors, auditions. Members reply "I'm interested" in one step;
  Membership runs every application, and the role's owner picks the
  person (`private.picks_opening`); whoever is onboarded holds the role.
- **Partners.** One register, `governance.partners`. `/partners` is the
  front door; an organization applies at `/partners/apply`, its signatory
  signing by name, and becomes a partner only when the President
  countersigns under the Council's adopted resolution
  (`governance.record_partner_vote`); nobody adds a
  partner or drafts a memorandum in the Diwan. Each partner has one
  dashboard, `/partners/dashboard` (profile and memorandum, events,
  people), for its Lead and up to two more, who join only by named email
  invitation and verify their own guests, invited by named email too (no
  shareable links). Partners never use Notion and see only their own events and
  checklist. No perks or offers anywhere: sponsors in kind are thanked
  with a "Supported by" line, and the card is for the door only.
- **Guests** sign up at `/sign-up/guest`, or are invited by named email
  by a partner or by an event's lead on the event's Diwan page (`partner_invitations.event_id`); never members. Each
  has a number from the one series and a Guest card from the start, books
  RSVP events, and writes for Qirtas (bylined as a guest, never eligible
  for the Prize).
- **Money: none.** No budgets, costs, prices, spending limits, ledgers,
  claims, reimbursements, payments or ads anywhere; sponsors give in kind
  only. Every event, Qirtas and the Tour keep a needs list
  (`programmes.needs`: item, quantity, date needed, purpose), and the
  General Secretary sends each request to Student Life and logs what was
  provided (Council → Requests). Charity collections are a Notion record,
  not a site feature.
- **Governance.** Meetings by body (Council, general, Annual, special,
  Founding; `meetingBodies`); elections by secret ballot online over a set
  window; Robert's Rules where the documents are silent.

## Qirtas

- **Qirtas** («قرطاس», "AUIB's paper of news, letters and art") at
  `/qirtas`, with its own masthead and editorial independence (the
  database keeps the code name `journal`). Six sections
  (`journal.sectionTypes`, `journal.desk_of()`): News, Voices, Letters,
  Gallery, Video, Games. Types are the editors' (`type_label`). Voices
  keeps the opinion rule (no party politics, religion, sect or
  ethnicity).
- **Write for Qirtas** (`/qirtas/write`) is the one door: public to read,
  members send work in every section except Games, at any time, and
  everything is read blind. Drafts (`journal.submission_drafts`) are their
  writer's alone. Every decision carries its reason (`journal.decide`).
  Bylines are a Register name, a pen name or "Anonymous" (the
  Editor-in-Chief knows the writer). Unpublished submissions are deleted
  twelve months after the decision (the keep-alive cron).
- **The Newsroom** is the Diwan's Qirtas section: staff write and publish
  directly, and read what members send on the same pages
  (`/diwan/qirtas/submissions/<id>`).
- **Reading.** One nameplate on every page of the paper
  (`components/qirtas/nameplate.tsx`); the masthead at `/qirtas/masthead`
  (`journal.masthead()`). A piece's address comes from `journal.piecePath`.
  Articles carry a progress hairline, a text size and the next piece.
  Notes and pull quotes (`withNotes`), contents for long reads
  (`withContents`), figures (`journal.piece_figures`), an original beside
  a translation (`journal.piece_bodies.original`), topics
  (`/qirtas/topics`), a reading and a clip (`reading_path`, `clip_id`),
  Save for later (`journal.saved_pieces`, `/account/work`), Gallery
  selections shared by address (`/qirtas/selection/...`, nothing stored).
  RSS at `/qirtas/feed.xml` and per section; the archive at
  `/qirtas/archive`. Pieces print on white without the site's frame.
- **The Edition** is printed once a year, a year in review
  (`/qirtas/editions`, a Shelf, with the plain list as a view,
  `?view=list`); its record keeps the print run, printer and
  date.
- **Games**, daily, made in the reader's browser and the same for everyone
  on a Baghdad day (`@repo/sal-data/games`): the word, the word search,
  the crossword and the anagrams at `/qirtas/games/...`, checked ahead by
  the Games editors in the Newsroom's queue (`journal.game_checks`). No
  hand-made puzzles and no Edition calls (decisions §5): the standing call
  is the one door. Members send no games (`private.games_by_editors`).
  Progress stays in the browser.
- **The Mutanabbi Prize** (`/qirtas/prize`; the Diwan's
  `/diwan/qirtas/prize`): Qirtas and Qalam categories, the outside judge's
  score 70% and the members' vote 30% (`journal.prize_results`), voting on
  Society while a round is open (`journal.open_prize_round`), the count
  checked by the Editor-in-Chief and the General Secretary; a winner
  chooses whether to be named (`prize_entries.winner_named`), and anyone
  connected to a work steps aside from it (`journal.prize_recusals`).
- **Qalam**, Qirtas's summer program for high school students. Its roster
  is staff only (`/diwan/qirtas/qalam`, `qalam.manage`), never in Notion,
  deleted three years on. High school students never get accounts.
- **Next Stop** is the Director of Media's video show at `/next-stop`
  (episodes, its promise at `/next-stop/care`), not part of Qirtas.
- **The Sunday Paper** («جريدة الأحد»), monthly on the first Sunday, to
  members who take optional email and to the public list
  (`content.newsletter_subscribers`), sent as one Resend Broadcast per
  language (`private.queue_sunday_paper`, outbox kind
  `sunday_paper.broadcast`). Past issues are at `/sunday-paper/<yyyy-mm>`,
  only those sent (`content.sunday_paper_issues`), rebuilt from the
  records (`lib/sunday-paper.ts`). The sign-up (`NewsletterSignup`) never
  asks a signed-in member to subscribe.

## Notion, documents and channels

- **Three rooms.** Notion for the work (teamspace The Diwan), the site for
  people and private records, Telegram for talk. Every piece of
  information has one home; anywhere else it is a read-only view.
  Written in Notion and published by the sync (`lib/api/notion`,
  `docs/platform/notion.md`): events, news, documents, minutes and the
  content calendar. Kept on the site and copied to Notion read-only: the
  officers and Qirtas's counts. One language per row: an Arabic edition is
  its own row (Language Arabic, Edition of the English row), and an
  Arabic event row takes Way in and Off campus from its English row. The
  sync reads and writes Diwan and Diwan ID; rename a property only with
  the sync in the same change. Diwan pages with a Notion counterpart say
  so with `NotionManaged`.
- **Documents.** Every document's text is written in Notion and rendered
  to the Library (`/library`); the Diwan's Library keeps only each
  document's adoption record. Every document is Version 1 and shows
  "Proposed" until adopted at the Founding Meeting; both editions publish
  together; internal documents never reach the Library. Under each
  document's title one line (decisions §13): code · kept by <seat>
  (Notion's Owner) · status · the other edition; no "Dated" line. Both
  editions share one Code and one slug (no "-ar" slugs). Codes follow
  decisions.md §6 (GOV, EXB, EVT, MEM, PTN, MED, ART, EDT); visitors and
  members never see codes, statuses or versions. Never edit the text of
  an adopted document. The re-sync is
  `/api/cron/notion-sync?documents=all`.
- **Hudhud** (@auibsal_bot) posts events and news to Announcements, sends
  RSVPs, reminders and the day's word, and warns anyone in the members'
  group without a linked member's account, removing them a week later
  (`features/group/removals.ts`; admins and Student Life exempt). A group
  set with `/audience staff` is the Diwan group: officers only, a morning
  brief and event summaries (`lib/api/bot/staff.ts`).
- **Email.** Supabase sends the auth emails (templates in
  `packages/database/supabase/templates`); the outbox (`core.outbox`,
  `lib/api/outbox.ts`) sends the rest through Resend, each kind written
  in `@repo/email/copy` in both languages (sent in the recipient's only).
  Mail to many people at once (the Sunday Paper, the invitation) goes as
  a Resend Broadcast to a fresh segment, deleted once sent, so it doesn't
  count against the free plan's 100 a day; unsubscribes made in Resend are
  read back first. Each email has Reply-To hello@auibsal.org, a preview
  line that isn't the subject, a tag with its kind and a footer saying
  why it came (service, optional with a stop link, officer, direct) and
  the sustainability line. A new journey adds its row to
  `docs/platform/email.md` and its story in
  `packages/brand/stories/emails.stories.tsx`.
- **Analytics** on `apps/web` only: Google Tag Manager with GA4, consent
  from the site's own card (cookie `sal_consent`) through consent mode,
  analytics only (the ad signals stay denied). Record events with
  `track()` from `@repo/analytics/client`
  (`docs/platform/analytics.md`).

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
  `/search?q=`). An address that was shared and
  then moved gets a permanent redirect (308, `MOVED` in
  `apps/web/next.config.ts`, in both languages): `/membership` →
  `/account`, `/library/privacy|terms-of-use|accessibility` → `/privacy`,
  `/terms`, `/accessibility`, `/partners/join` → `/partners/apply`. Any
  other old address is simply not found. The address alone decides the
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
  Declare every dependency a package imports; keep versions aligned. Bun
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
- **Optional modules:** code belonging to an optional module is wrapped in
  `// <module:id>` … `// </module:id>` markers; `bun run
  check:placeholders` keeps them balanced.
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
