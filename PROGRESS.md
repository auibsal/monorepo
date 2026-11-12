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

Branch: `claude/new-session-qosn60`, one pull request for the third and
fourth prompts (Nov 12).

## Now: the third prompt (Nov 12, the whole review)

Built in this order, one commit per part, in one pull request. Each line
says what changes; **Migrates** says what a migration changes in
production; **Owner** is a step only the owner can take.

### 0. The fourth prompt (Nov 12, late), folded into this plan
Replaces the mirror (decisions.md and glossary_ar.md of Nov 12, late).
First the second prompt's part 2 (7j), then the rest in place.
- [x] **7j. No F-numbers on the site:** /forms and every F-number retired
  from the site, its emails and the Diwan; each form lives in its flow
  (`formPaths`): a concern at `/about/contact/concern` (Contact and the
  footer link it), consents at `/consent/<kind>` (a trip's from its event),
  the declaration under Settings → Disclosures, a motion under Elections,
  the memorandum on the partner dashboard; every old `/forms/<number>`
  address (21, F-21, f21) redirects (308).
- [ ] **1. Classes** follow status both ways on the same account and number
  (Members: degree and ELA students; Associates: faculty, staff, alumni;
  Guests: everyone else); Parent and Qalam student are roles on guest
  accounts; one card for everyone, class and role on its second line
  ("Guest · Parent"); under-18s show first name and last initial (Qalam
  adds school and year).
- [ ] **2. "Sign as …" everywhere:** no typed legal name anywhere, the GPA
  consent on a director application included.
- [ ] **3. Two-step from Nov 22:** no lock-out, no reminder; a role that
  sees personal data is taken to set it up at sign-in (passkey first, then
  an authenticator app, then recovery codes); shift-scoped station access
  exempt.
- [ ] **3a. Names:** no "keep or change" prompt; the default preferred name
  set for everyone alike (the President's and the host's stay); the legal
  name locked for every account, changed only in the Diwan with a second
  officer.
- [ ] **4. Policies:** /code-of-conduct renders GOV-03, Art. II; /security
  renders GOV-07 («سياسة الإبلاغ عن الثغرات الأمنية») once published, "Effective
  the day it is published"; security.txt points to /security; three
  business days to acknowledge.
- [ ] **5. Council meetings show as Members events.**
- [ ] **6. Student Life's staff answer from Associate accounts.**
- [ ] **7. The permissions table** for EXB-01: report where it lives.
- [x] **7a. The stack page:** Notion on the free Plus plan for student
  organizations.
- [x] **7b. news.auibsal.org** verified in Resend and `RESEND_BULK_DOMAIN`
  set: marked done here and in `docs/platform/settings.md`.
- [x] **7c. LICENSE.md:** "proprietary", no longer "and confidential"; the
  repository stays public.
- [ ] **7d. AUIB's Arabic name:** «الجامعة الأمريكية في بغداد» alone; «الجامعة
  الأمريكية» inside a compound (the Society, Qirtas's line) across the site,
  emails, Hudhud, the brand kit and the language check.
- [x] **7e. Submission numbers** SUB-<year>-<four digits> (now in
  decisions.md §12). Revise and resend waits on the owner.
- [ ] **7f. Arabic writing rules in CI:** never ٌ or ٍ; tanween al-fath on
  the letter before the alif; no tatweel; Arabic punctuation; hamza, taa
  marbuta and alif maqsura; Latin script for products and addresses,
  isolated (`<bdi>`).
- [ ] **7g. Hudhud's register:** Iraqi for chat, reminders and the Sunday
  note; Modern Standard for removal notices, consents and appeals.
- [ ] **7h. Languages:** a first visit in the browser's language (or
  English); an account's language from its sign-up page, changeable in
  Settings; certificates in the recipient's language with the other
  edition; Arabic about 10% larger in the brand kit.
- [ ] **7i. Revise and resend:** one revision, back to the section editor,
  same SUB number, not read blind again.
- [ ] **7k. Removal from membership** is the Council's (§7), still to build;
  parents withdraw their child's consents from the Parent view.
- [x] **7l. The Sunday Paper sign-up** in the public footer's Read and watch
  column.
- [ ] **7m. The Library's groups** from Notion's "For" field (Everyone,
  Members, Staff), not from the code.
- [x] **7n. The Sunday note's "in term"** (a week with an event or an open
  call), now in decisions.md.
- [ ] **7o. GOV-07's Arabic title** on the site: «سياسة الإبلاغ عن الثغرات
  الأمنية».
- [ ] **7p. Immediate staff alerts** also for a new concern (the complaints
  panel's chair) and an incident report from an event's page (the Director
  of Events and the President).
- [ ] **7q. The templates index** adds the playbill, an Edition's cover and
  inside, and Next Stop's package ("awaiting approval"); each row names its
  owner seat.
- [x] **7r. "Tech admin" is retired:** the role's key is now `web_lead`
  (migration `20261113002000_web_lead_key.sql`), with the runbooks, tests
  and the permissions table; the Desk's Database checks never named it.

### 11. Language (first: it touches every part)
- [x] "Secretary" («أمين السر»; «أمينة السر» for a woman) replaces "General
  Secretary" («الأمين العام») on the site, in emails, in Hudhud's copy and
  in the brand kit. The role's key (`general_secretary`) stays.
  **Migrates:** the role's titles in `access.roles` and the Council seat's
  titles.
- [x] "Events" («الفعاليات») replaces "What's on" in the menu, the pages,
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
- [x] **Sessions:** Settings lists signed-in devices with "Sign out
  everywhere else"; a sign-in from an unfamiliar device sends an email.
  **Migrates:** `core.known_devices` (filled from today's sessions, so no
  one is emailed for the devices they already use); the five-minute job
  `sal-new-devices`.
- [x] **Deletion:** a 30-day grace period; signing in restores the account.
  **Migrates:** `deletion_requested_at`; the retention job deletes after
  30 days. The confirmation is a second step on the page.
- [x] **Download your data:** a readable page beside the JSON.
- [ ] **Sign-up in three screens at most:** address and password; the names
  (the legal name for Members, with a line on where it is used) and the
  Arabic form; the agreements. Everything else waits on Today. The first
  two weeks' emails each point to one next step and stop once it is done.
- [x] **Renewal each September:** "I'm still here", one click, with the Code
  of Conduct re-acknowledged; those who don't stay members but leave the
  active count and Student Life's lists. **Migrates:** `renewed_at`
  (empty: every member joined or renews this year, so September 2027 is
  the first ask); `private.is_active_member()` is the active count.
- [ ] **The classes:** Member, Associate, Honorary, Guest as decisions.md
  defines them; the class follows the person's status on the same account
  and number; no "staff" class. The Parent and Qalam account types go: a
  parent is a guest with the "Parent" role linked to the child, a Qalam
  student a guest under 18 with the "Qalam student" role. Guests are 18+
  except Qalam students with a parent's consent. **Migrates:** existing
  parent and Qalam accounts become guests with those roles; the Campus
  Recreation Officer's account moves to Associate with the "Student Life"
  role (by the role it holds, never by a name or address in the migration).
  Done so far: the outside roles Parent (scoped to the child), Qalam
  student and Student Life exist (`20261113000600_outside_roles.sql`).
  Still to build: the consent link making the parent's guest account with
  the role, the parent's view of the child's consents, the class following
  status (graduation to Associate), and the Campus Recreation Officer's
  move, which is the owner's step (assign "Student Life" on their member
  page; no migration names a person).
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
- [x] Undo what is still the person's: cancel an RSVP before the start;
  withdraw a submission before its decision, or an application; withdraw a
  consent or release for the future. Irreversible steps take a second step
  on the page, never a pop-up. Canceling, withdrawing a submission and an
  application were already there; the media release and a trip's consent
  are now withdrawn from the signed copy (`governance.withdraw_consent`,
  the record kept, marked withdrawn; a trip's place given back). Parents'
  consents signed by link have no account to withdraw from: the parent
  writes, as before. **Migrates:** `form_submissions.withdrawn_at`.
- [ ] The role agreement (the Code of Conduct, and the license for work made
  in the role), signed on accepting any role, before the
  conflict-of-interest declaration.
- [x] Two officers approve: changing a legal name, granting a Council
  role, exporting a list for Student Life. The request waits in
  `governance.pending_actions`; another officer holding the permission
  approves or declines it on the Desk ("For a second officer"), never the
  one who asked; an approved export is spent once by the API route.
  Removing a member has no removal action on the site yet (leavers become
  guests), so it waits for one. **Migrates:** `governance.pending_actions`,
  `governance.decide_action`, `governance.request_export`.

### 3. Governance (decisions.md, Governance)
- [x] "Raise a concern" requires sign-in; the person may ask to keep their
  name from the panel (sealed; opened only for a safety risk or with their
  agreement); the reply notes anonymous concerns are harder to act on.
  **Migrates:** `governance.sealed_signers`, F-21 needs an account, and
  `sign_form` seals instead of dropping the name. Concerns already sent
  without a name stay as they are.
- [x] Adopted resolutions (number, title, date) open to members beside the
  approved minutes; those about partners and documents public.
  **Migrates:** `governance.resolutions.subject` (partner, document or
  other; the Council's partner votes marked partner); the public reads
  only partners' and documents' resolutions from now on.
- [x] Each election page gets a candidates' forum event in the week before
  voting, recorded. The forum is made in Notion like any event; the
  Elections Committee chooses it on the election, members see it there,
  and its recording goes on the event's links. **Migrates:**
  `governance.elections.forum_event_id`, checked to fall in the week.

### 4. Qirtas (decisions.md, Qirtas)
- [x] The nameplate and the line "AUIB's paper of news, letters and art" /
  «صحيفة الجامعة الأمريكية في بغداد للأخبار والآداب والفن».
- [x] Section fronts: title, one sentence, the call as the action, the
  section's editor from the masthead, then the list.
- [x] Contributor pages listing each person's pieces (preferred or pen
  name; Anonymous left out; minors only with consent).
- [x] The colophon on Qirtas's pages and in each Edition, not the site
  footer.
- [ ] Writers' emails at each step: received (record number), in reading,
  the decision (accepted, declined with a standard note, revise and
  resend), edits to approve, published with the link. Done: the record
  number (SUB-<year>-<n>) and "in reading"; received, accepted, declined,
  edits to approve and published were already sent. Open: "revise and
  resend", a new decision that sends the work back to its writer and into
  reading again (a change to the blind-review pipeline).
- [x] Newsroom: a checker field for News's second-source check and a
  conflict-disclosure field for writers.

### 5. Events (decisions.md, Events)
- [x] Each event page states access plainly: step-free or not, seating,
  food and the main allergens. **Migrates:** the event's access fields.
- [x] Check-in works offline and syncs later.
- [x] A released waitlist place is held 12 hours for the next person (or
  until two hours before the start). **Migrates:** the waitlist's
  `offered` and `expired` statuses and `offered_until`; the five-minute
  release job also passes on unclaimed holds.
- [x] One reminder email the day before to everyone who RSVP'd, with "Can't
  come? Cancel".
- [x] Off-campus trips ask an emergency contact with the trip consent,
  deleted a week after the trip. **Migrates:** the retention rule for
  F-45's emergency contact and health notes.

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
- [x] Home, when each has something: motto and Join; the next three events;
  the newest Edition or current call; latest from Qirtas; Next Stop's
  latest; open roles; From the Society. Join is its one action; the Sunday
  Paper sign-up stays on Qirtas's front page.
- [x] About in the order of decisions.md, with the full al-Mutanabbi verse
  and its translation, the story of the name Qirtas, the numbers counted by
  the site and the independence statement.
- [x] Help: twenty common questions; "Words we use"; "Report a problem" on
  every page, reaching the web lead in the Diwan.
- [x] Contact: one page routing by topic to the role address, with the
  answer time; signed-in details from the account.
- [x] The Library grouped by who it is for (everyone, members, officers
  and teams, from the code family: SAL-MEM for members, SAL-MAN for
  staff), each with its code, keeper, status and a two-line summary, with
  a find line; both editions together on each document's page; staff
  manuals only in the Diwan.
- [x] Policies: /code-of-conduct and /security beside /privacy, /terms and
  /accessibility, each with its effective date at the top.
- [x] /about/credits generated from the dependencies; About → Our people
  credits the web team.
- [x] Partners: alphabetical, equal-size logos, grouped by kind (clubs;
  culture and the press; charities; schools and universities; others),
  then "With the support of", then Become a partner; sponsors in kind only
  on their event ("Supported by").
- [x] /verify: long random codes (new certificates and letters: 96 bits;
  printed codes keep working), at most 30 checks in ten minutes from one
  visitor (`VERIFY_LIMIT`), read live, `X-Robots-Tag: noindex` on every
  check page, and only what the record needs (a Qalam student by first
  name and initial). **Migrates:** the codes' default.

### 8. Email (decisions.md, Channels and email)
- [ ] Every email: one subject, the action first, one button, the record
  number, why the person gets it, a preferences link unless account or
  security.
- [x] Senders: "AUIB Society of Arts and Letters" (site, announcements),
  "Qirtas" (the Sunday Paper), a person's name and seat (letters).
- [x] Bulk email: "View in your browser" at the top (the Sunday Paper's
  month page, From the Society for announcements); unsubscribing lands on
  a page that confirms and offers the two topics; sent from
  news.auibsal.org once `RESEND_BULK_DOMAIN` is set, with replies to
  hello@ and qirtas@.
- [x] Every template previewable in both languages on the design page, with
  "Send me a test" (`/api/email/test`, staff only, ten in ten minutes),
  both languages from the same samples (`@repo/email/samples`).
- [x] Staff alerts: urgent at once (a removal request and its deadline, a
  failed job), the rest in one daily digest per officer (`staff.digest`:
  Get involved replies, partner applications, second-officer requests,
  problem reports). **Migrates:** `private.daily_notices`.
- [ ] Supabase's sign-in emails go through Resend from hello@ in the
  Society's template and the person's language (the Send Email hook).
- [ ] **Owner:** Resend open and click tracking off; bounce and complaint
  webhooks (in place); one sending-only key per use; Supabase's SMTP set to
  Resend, or the hook's secret (steps in `docs/platform/email.md`).

### 9. Platform and settings
- [x] Speed Insights beside Web Analytics.
- [x] A permissions table generated from the code, for the Leadership
  Handbook.
- [x] A stack page in the docs: every service with its plan, owner account,
  renewal date and exit.
- [x] Journey maps in the docs, one per kind of person.
- [x] The templates index on the design page (Guide → Templates: each
  template, what it is for and where it is used, linked to its entry), and
  the certificate with two signatures (`Certificate`, two signers). (Open
  Badges only from 2028.)
- [x] The monthly look at the advisors on the Desk (Connected → Database
  checks: the checks CI holds at zero, run live; Supabase's Advisors for
  the rest). **Migrates:** `core.advisor_findings()`.
- [ ] **Owner:** ~~news.auibsal.org in Resend~~ (done, Nov 12); a free public
  status page at status.auibsal.org fed by the uptime check; Supabase's
  email confirmation and leaked-password protection on, short token
  lifetimes, network restrictions where the plan allows; Cloudflare's
  settings (WAF, bot protection, DDoS, SSL Full (strict), file caching,
  the real visitor IP passed through; Email Address Obfuscation, Rocket
  Loader and minify off). The exact steps are in `docs/platform/settings.md`.

### 10. Hudhud and Telegram
- [x] Hudhud's Sunday note each Sunday in term (the week's events and the
  open calls), with the two-day reminders, in place of a post for each new
  event; a week with neither has no note. **Migrates:** the
  `sunday_note` post kind.
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
