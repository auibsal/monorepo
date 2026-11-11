# SAL platform: progress

The working checklist for auibsal.org. Every session starts here, after
`claude/decisions.md` and `claude/glossary_ar.md` (the read-only mirror of
the owner's files), and continues from the first open item. What is done
lives in git and the merged pull requests; this file keeps only what is
still open, and the owner's own steps.

Rewritten on Thursday, November 12, 2026, after PRs #262–#264 (merged and
migrated on Nov 11) and against decisions.md of Nov 12. The owner's steps
from the earlier "SAL V1 launch steps" pages are folded in below; those
pages are deleted.

Branch: `claude/new-session-qosn60`, one pull request for the third
prompt (Nov 12).

## Now: the third prompt (Nov 12, the whole review)

Built in this order, one commit per part, in one pull request. Each line
says what changes; **Migrates** says what a migration changes in
production; **Owner** is a step only the owner can take.

### 11. Language (first: it touches every part)
- [ ] "Secretary" («أمين السر»; «أمينة السر» for a woman) replaces "General
  Secretary" («الأمين العام») on the site, in emails, in Hudhud's copy and
  in the brand kit. The role's key (`general_secretary`) stays.
  **Migrates:** the role's titles in `access.roles` and the Council seat's
  titles.
- [ ] "Events" («الفعاليات») replaces "What's on" in the menu, the pages,
  the Sunday Paper, the feed and the brand kit.

### 1. Accounts and sign-in (decisions.md, Members)
- [x] **Sign-in:** email and password stays the main way; the passkey is an
  optional other way in, never pushed; no sign-in link by email (the
  "email me a link" path and its callback go). Email only confirms the
  address and resets a password.
- [x] **Two-step:** an authenticator app offered to everyone; required for
  officers, Council seats and every role that sees personal data from
  **Sunday, November 22**. A passkey sign-in meets it on its own
  (`private.session_two_step()` accepts the passkey's `amr`). Settings
  offers the app to everyone and names the date a role starts to need it.
  **Migrates:** `requires_mfa_from` = Nov 22 on every role with a
  personal-data permission (check-in, members, the Tour, identities, the
  mailing list, forms, concerns, partners, productions, Qalam, settings,
  the audit log); the hourly job `sal-two-step-from` turns it on.
- [ ] **Sessions:** Settings lists signed-in devices with "Sign out
  everywhere else"; a sign-in from an unfamiliar device sends an email.
  **Migrates:** a table of the account's known devices.
- [ ] **Deletion:** a 30-day grace period; signing in restores the account.
  **Migrates:** `deletion_requested_at`, and the daily job deletes after 30
  days.
- [ ] **Download your data:** a readable page beside the JSON.
- [ ] **Sign-up in three screens at most:** address and password; the names
  (the legal name for Members, with a line on where it is used) and the
  Arabic form; the agreements. Everything else waits on Today. The first
  two weeks' emails each point to one next step and stop once it is done.
- [ ] **Renewal each September:** "I'm still here", one click, with the Code
  of Conduct re-acknowledged; those who don't stay members but leave the
  active count and Student Life's lists. **Migrates:** `renewed_at`.
- [ ] **The classes:** Member, Associate, Honorary, Guest as decisions.md
  defines them; the class follows the person's status on the same account
  and number; no "staff" class. The Parent and Qalam account types go: a
  parent is a guest with the "Parent" role linked to the child, a Qalam
  student a guest under 18 with the "Qalam student" role. Guests are 18+
  except Qalam students with a parent's consent. **Migrates:** existing
  parent and Qalam accounts become guests with those roles; the Campus
  Recreation Officer's account moves to Associate with the "Student Life"
  role (by the role it holds, never by a name or address in the migration).
- [ ] **The card:** no photo; everyone with an account gets one; class and
  role on the second line ("Guest · Parent"); under 18, the first name and
  last initial only (Qalam adds school and year); the Wallet pass updates
  on a role, class or name change and is withdrawn the day the account
  ends. **Owner:** Apple Wallet waits on Apple's developer account (a need).
- [ ] **Guests' tabs:** Today, Events, Work, Documents, Settings.
- [ ] **No name fields anywhere:** the only name entry is the account at
  sign-up. Signing shows the legal name with "Sign as …"; credits,
  co-authors, event guests and anyone named on a record are picked from
  the site's people; outsiders are invited by email first. Every free-text
  name field goes. **Migrates:** the typed-name columns are dropped once
  their rows point to accounts.

### 2. Records, receipts and agreements (decisions.md, Documents and forms)
- [ ] Every action that creates a record shows a confirmation that stays on
  the page and emails a receipt with its record number and link.
- [ ] Undo what is still the person's: cancel an RSVP before the start;
  withdraw a submission before its decision, or an application; withdraw a
  consent or release for the future. Irreversible steps take a second step
  on the page, never a pop-up.
- [ ] The role agreement (the Code of Conduct, and the license for work made
  in the role), signed on accepting any role, before the
  conflict-of-interest declaration.
- [ ] Two officers approve: removing a member, changing a legal name,
  granting a Council role, exporting a list for Student Life.
  **Migrates:** a table of pending approvals.

### 3. Governance (decisions.md, Governance)
- [ ] "Raise a concern" requires sign-in; the person may ask to keep their
  name from the panel (sealed; opened only for a safety risk or with their
  agreement); the reply notes anonymous concerns are harder to act on.
- [ ] Adopted resolutions (number, title, date) open to members beside the
  approved minutes; those about partners and documents public.
- [ ] Each election page gets a candidates' forum event in the week before
  voting, recorded.

### 4. Qirtas (decisions.md, Qirtas)
- [ ] The nameplate and the line "AUIB's paper of news, letters and art" /
  «صحيفة الجامعة الأمريكية في بغداد للأخبار والآداب والفن».
- [ ] Section fronts: title, one sentence, the call as the action, the
  section's editor from the masthead, then the list.
- [ ] Contributor pages listing each person's pieces (preferred or pen
  name; Anonymous left out; minors only with consent).
- [ ] The colophon on Qirtas's pages and in each Edition, not the site
  footer.
- [ ] Writers' emails at each step: received (record number), in reading,
  the decision (accepted, declined with a standard note, revise and
  resend), edits to approve, published with the link.
- [ ] Newsroom: a checker field for News's second-source check and a
  conflict-disclosure field for writers.

### 5. Events (decisions.md, Events)
- [ ] Each event page states access plainly: step-free or not, seating,
  food and the main allergens. **Migrates:** the event's access fields.
- [ ] Check-in works offline and syncs later.
- [ ] A released waitlist place is held 12 hours for the next person (or
  until two hours before the start).
- [ ] One reminder email the day before to everyone who RSVP'd, with "Can't
  come? Cancel".
- [ ] Off-campus trips ask an emergency contact with the trip consent,
  deleted a week after the trip.

### 6. The frame (decisions.md, The site)
- [x] Header: logo, menu, search, language, theme, then Join or the account
  menu.
- [x] Public footer in four columns (The Society; Take part; Read and
  watch; Policies), then social links, "Raise a concern", the postal
  address, the paperless line and "© 2026 AUIB Society of Arts and
  Letters. All rights reserved." (2026–<year> from 2027). Qirtas's pages
  add that each piece belongs to its writer under its license; "Set in
  Ubuntu and Markazi Text. Written in Baghdad." moves to Qirtas.
- [x] Private spaces (your account, the partner dashboard, the Diwan): a
  slim footer (Help, Privacy, Terms, Report a problem); the Diwan's adds
  the version and build.
- [ ] The partner dashboard keeps its own tabs: Events, Checklist, Guests,
  Team, Memorandum.
- [x] The Diwan's seats: a side list on a computer (the Desk first), across
  the top on a phone.

### 7. Pages (decisions.md, The site)
- [ ] One main action per page (Home: Join; Qirtas: Submit; Events: RSVP;
  an Edition: Read; Next Stop: Watch the latest; the Company: Audition when
  open, else See the season; Get involved: Apply; Partners: Become a
  partner).
- [ ] Home, when each has something: motto and Join; the next three events;
  the newest Edition or current call; latest from Qirtas; Next Stop's
  latest; open roles; From the Society.
- [ ] About in the order of decisions.md, with the full al-Mutanabbi verse
  and its translation, the story of the name Qirtas, the numbers counted by
  the site and the independence statement.
- [x] Help: twenty common questions; "Words we use"; "Report a problem" on
  every page, reaching the web lead in the Diwan.
- [x] Contact: one page routing by topic to the role address, with the
  answer time; signed-in details from the account.
- [ ] The Library grouped by who it is for (code, keeper, status, a
  two-line summary), searchable, both editions together; staff manuals
  only in the Diwan.
- [x] Policies: /code-of-conduct and /security beside /privacy, /terms and
  /accessibility, each with its effective date at the top.
- [ ] /about/credits generated from the dependencies; About → Our people
  credits the web team.
- [ ] Partners: alphabetical, equal-size logos, grouped by kind, then "With
  the support of", then Become a partner; sponsors in kind small, on their
  event and its thank-you only.
- [ ] /verify: long random codes, rate-limited, never indexed, only what the
  record needs.

### 8. Email (decisions.md, Channels and email)
- [ ] Every email: one subject, the action first, one button, the record
  number, why the person gets it, a preferences link unless account or
  security.
- [ ] Senders: "AUIB Society of Arts and Letters" (site, announcements),
  "Qirtas" (the Sunday Paper), a person's name and seat (letters).
- [ ] Bulk email: "View in your browser" at the top; unsubscribing lands on
  a page that confirms and offers topics; sent from news.auibsal.org with
  replies to hello@ and qirtas@.
- [ ] Every template previewable in both languages on the design page, with
  a test to yourself.
- [ ] Staff alerts: urgent at once, the rest in one daily digest.
- [ ] Supabase's sign-in emails go through Resend from hello@ in the
  Society's template and the person's language (the Send Email hook).
- [ ] **Owner:** Resend open and click tracking off; bounce and complaint
  webhooks (in place); one sending-only key per use; Supabase's SMTP set to
  Resend, or the hook's secret (steps in `docs/platform/email.md`).

### 9. Platform and settings
- [x] Speed Insights beside Web Analytics.
- [ ] A permissions table generated from the code, for the Leadership
  Handbook.
- [ ] A stack page in the docs: every service with its plan, owner account,
  renewal date and exit.
- [ ] Journey maps in the docs, one per kind of person.
- [ ] The templates index on the design page, and the certificate with two
  signatures. (Open Badges only from 2028.)
- [ ] The monthly advisors' report on the Desk.
- [ ] **Owner:** news.auibsal.org in Resend (its DNS records); a free public
  status page at status.auibsal.org fed by the uptime check; Supabase's
  email confirmation and leaked-password protection on, short token
  lifetimes, network restrictions where the plan allows; Cloudflare's
  settings (WAF, bot protection, DDoS, SSL Full (strict), file caching,
  the real visitor IP passed through; Email Address Obfuscation, Rocket
  Loader and minify off). The exact steps go in `docs/platform/settings.md`.

### 10. Hudhud and Telegram
- [ ] Hudhud's Sunday note each Sunday in term (the week's events and open
  calls) replaces a post per new event; the two-day reminders stay.
- [ ] **Owner:** "Add New Admins" stays off for Hudhud in both groups.

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
- [ ] **Two retention schedulers** (`/api/cron/retention` and pg_cron's
  `sal-retention`): keep one, or say why both.
- [ ] **`anon` EXECUTE on `private`:** narrow it to the functions the public
  pages need (USAGE stays: the public wrappers call into `private`).
- [ ] **The Diwan Telegram group, 7 days after a role ends:** the bot
  removes the person (today only on leaving the Society).
- [ ] **The event lead from Notion:** the sync checks Lead but does not
  store it; the event-lead role scoped to the event should come from it.
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
- [ ] **Supabase → Authentication → Emails:** paste the eight templates
  and subjects from `packages/database/supabase/templates` (until the Send
  Email hook of part 8 replaces them).
- [ ] **Supabase → API → Exposed schemas:** remove `charity` if it is still
  listed.
- [ ] **Zoho and DNS:** Cloudflare → Email → Email Routing → Disable
  (decline its MX records); change the root SPF record to
  `v=spf1 include:zohomail.com ~all`. Leave DMARC, DKIM and Resend's
  records as they are. Send a test from hello@ to a Gmail address: SPF,
  DKIM and DMARC should all pass.
- [ ] **Cloudflare:** turn off Web Analytics' automatic setup (the CSP
  blocks its beacon), and the settings of part 9.
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
