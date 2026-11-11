# The Society in the code

How the AUIB Society of Arts and Letters works, as the code models it:
the Council, members, cards, numbers, forms, events, partners, Qirtas,
Notion, documents, Hudhud and email. Read the section for the domain you
are changing before you change it. The owner's decisions (in the Claude project) win wherever they
disagrees; the conventions for every change are in `AGENTS.md`.

## People, roles and records

- **The Council of nine.** The Executive Board (President, Vice President,
  General Secretary) and six directors (Editor-in-Chief, Director of
  Media, Artistic Director, Director of Events, Director of Partnerships,
  Director of Membership); `isCouncil` in `lib/rbac/roles.ts`, mirrored
  from the database. Each role is hired by its hiring seat
  (`access.roles.hiring_owner`), whoever holds the permissions for it; no
  seat is named in code as covering another. While the President is
  recorded absent, the Vice President acts (there is no Acting President
  role). The Council page (`/about/council`,
  `governance.council_seats()`) lists the nine seats by full title, held
  or open, from the roles people hold: nothing is typed by hand. A second
  Council role needs an adopted Council resolution
  (`private.role_conflict`); there is no other cap, but a section takes at
  most two assistant editors.
- **The roles standard.** Every role has a kind (`access.roles.kind`): a
  seat, a team role under a seat, a scoped role (one event, production,
  issue, election, episode or shift, ending with it) or an outside role.
  A retired role (`retired`) stays on record and is never shown or given.
  Covering an open seat or section is a dated delegation
  (`role_assignments.covering`) that ends when the role is given for good.
  The General Secretary records the quarterly access review on the
  Council page (`access.record_access_review`). F-04, the new role
  holder's checklist, is in Your account for 120 days from the day a role
  is given (`access.my_role_checklist`).
- **The first term.** Anyone newly joining a team serves a first term on
  probation; whoever appointed them confirms them; Council seats (elected
  or appointed directors) serve none
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
  only Members vote (checked in at two events or general meetings in the
  12 months before the voter list's record date: check-ins are the only
  record, `membership.activity_records`)
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
  (`private.sign_up_allowed`). A student who leaves AUIB is recorded by
  Membership on their Diwan page (`membership.record_departure`): a
  graduate becomes an Associate Member; someone who left without
  graduating becomes a guest, same number and a Guest card, with no vote
  or role, and Hudhud's week in the members' group starts. Partners'
  people and advisors from partner organizations hold guest accounts;
  faculty and alumni advisors are Associate Members invited by the
  Director of Membership. `/welcome` asks one question per screen
  (`planSetup` in `components/diwan/setup-form.tsx`).
- **Arabic titles agree with the holder** (decisions §13). An optional
  setting (`core.profiles.title_form`, read only by its owner through
  `core.my_private_profile`) gives the feminine form
  (`access.roles.name_ar_feminine`) on the Council page, the masthead,
  the card's role line and letters; documents keep the glossary's form.
- **Names** (decisions.md, Members). The **legal name** is kept in parts
  in each language (`first_name_en` … `last_name_ar`): the given,
  father's and grandfather's names are required, the family name only
  where there is one; English parts in Latin letters and Arabic parts in
  Arabic letters (`private.latin_name`, `private.arabic_name`,
  `names.inScript`). It is used only on certificates, letters, signed forms,
  minutes and lists for Student Life. The member checks it and locks it in
  Your account → Settings → Profile (`core.lock_legal_name`); after that
  only `members.manage` corrects it, with a reason
  (`membership.correct_name`), and a locked name refuses the member's own
  edits. The **preferred name** is one whole field per language
  (`preferred_name_en`/`_ar`); empty means the default.
  **One function decides the name shown**, `private.display_name()`: the
  preferred name, else the given and father's names, else (for a guest,
  or until the legal name is complete) the name given at sign-up
  (`signup_name_*`). `full_name_en`/`_ar` keep its result, and every
  surface reads them: the card, profiles, bylines, the Council page, Our
  people, the masthead, Next Stop's team and credits, playbills, event
  lists, greetings and Resend's first name (`private.greeting_name`: the
  first word, with «عبد …» and «أبو …» kept whole). `members.manage` resets
  a preferred name that misleads or offends
  (`membership.reset_preferred_name`); corrections and resets are logged
  with their reason, never the names. The parts are the owner's alone
  (`core.my_name_parts()`). Names need not be unique. Wherever a person is
  named (bylines, hosts, judges, roles), pick them from the register
  (`MemberPicker`, `BylinePicker`); never type a name.
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
  The card and certificate keep the live site's look; the card holds
  still (no tilt, sheen or turning pattern).
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
  Notion templates. The signer agrees to sign electronically; the copy
  keeps the time, IP address, version and SHA-256 fingerprint, and the
  signer is emailed theirs (`forms.signed_copy`). Signing without an
  account, and anonymous concerns, go through `/api/forms/sign`
  (Turnstile, `TURNSTILE_SECRET_KEY`, and a limit per address); parents
  sign Qalam's F-38 and F-39 by a single-use link the Qalam lead sends
  to the teacher (`governance.form_links`). Every public form that sends
  email checks Turnstile (`lib/api/turnstile.ts`). The forms register in SAL-EXB-01 is the one source of
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
  check-in (the booking asks only about accessibility needs, and diet
  when `serves_food`; the waitlist moves by email until two hours before,
  then the door fills places; places not claimed 10 minutes before are
  released), a needs list,
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
  Typewriter Tour) and attaches each to its writer's account. At the
  Tour's station (decisions §12; `/account/station`), a volunteer the
  event lead confirmed on a station shift (`programmes.shifts.station`)
  may, while the shift runs and only then (`private.my_station_shift`),
  photograph a typed page and attach it to a live card, a Member's or a
  Guest's (`/api/tour/station`, `programmes.station_attach`; the photo in
  the private `tour-pages` bucket, read through `/api/tour/photo`), or
  keep it against a pending "Request Associate membership"
  (`membership.associate_requests`, from `/join#associate`): attached
  when the Director of Membership approves (a named invitation) and the
  account accepts, deleted if declined. Every station page is logged;
  photographed pages show nowhere until whoever runs the Tour types their
  words (`programmes.transcribe_page`). Six Words
  are not part of Qirtas: they are Tour pages, private by default, shown
  on the writer's profile or the Tour's page only by their choice
  (`programmes.six_words.visibility`). Spring 2026 pages arrive by the
  one import (`programmes.import_tour`); pages with no email stay private
  and editors-only until a writer claims one through Help Desk. The
  one-time invitations (`membership.invitations`) come in lists
  (`membership.invitation_lists`: the Tour's import, the club fair's
  paper sign-ups typed in at Membership → Invitations); each list is
  tested on the President first and goes only when the President says
  go (`membership.send_invitations(list)`), as one Broadcast, and is
  deleted thirty days after its own send.
- **Get involved** (`/get-involved`, `programmes.open_places()`) lists open
  roles only, soonest first: Council and team roles, an event's lead
  (one place; the rest of the night are shifts), Qalam mentors,
  auditions. Members reply "I'm interested" in one step;
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
  with a "Supported by" line (`SupportedBy`), and the card is for the door
  only. AUIB's own offices aren't partners: they are listed under "With
  the support of" (`WithTheSupportOf`) on /partners only, each linking
  to its page on AUIB's site, from
  the fixed list in `apps/web/lib/institutions.ts`.
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
  provided (Council → Requests), and by whom: Student Life, or a partner
  in kind (`needs.given_by`, picked from the register), whom the event's
  page then thanks under "Supported by" (`events.event_sponsors`: listed,
  active partners only). Charity collections are a Notion record,
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
- **Write for Qirtas** (`/qirtas/submit`) is the one door: public to read,
  members send work in every section except Games, at any time, and
  everything is read blind. Drafts (`journal.submission_drafts`) are their
  writer's alone. Every decision carries its reason (`journal.decide`).
  Bylines are a Register name, a pen name or "Anonymous" (the
  Editor-in-Chief knows the writer). Unpublished submissions are deleted
  twelve months after the decision (the retention job, `docs/platform/retention.md`).
- **The Newsroom** is the Diwan's Qirtas section: staff write and publish
  directly, and read what members send on the same pages
  (`/diwan/qirtas/submissions/<id>`).
- **Intake and blind review.** The Managing Editor handles intake and
  holds writers' names (`journal.identity.view`), and never reads a
  blind entry: whoever holds the names is never an issue editor
  (`private.is_issue_editor`) and never gets the text
  (`private.can_read_entry`). Section editors decide.
- **Approvals.** Every piece needs two people
  (`private.required_approvals`): the section editor, then the
  Editor-in-Chief or the Managing Editor; every text piece (News, Voices,
  Letters) also needs the copy edit, which the Editor-in-Chief or the
  Managing Editor gives while no one holds `journal.copy`.
- **The date a piece carries** (`journal.date_piece`, today or earlier):
  set by the section editor, the Editor-in-Chief or the Managing Editor,
  on or near the piece's event; publishing takes it as `published_at`, and
  each change is kept with who set it (`journal.piece_dates`).
- **Corrections** are made in place with a note, shown at the end of the
  piece and listed in the public log at `/qirtas/corrections`.
- **"From the Society"** on the front page shows the Society's notices
  by the date each carries (`core.announcements.shown_at`,
  `core.society_notices`), never in News and never bylined: the
  President's email puts a notice there, and Media can post one with a
  date and no email (`core.post_notice`).
- **Reading.** One nameplate on every page of the paper
  (`components/qirtas/nameplate.tsx`); the masthead at `/qirtas/masthead`
  (`journal.masthead()`). A piece's address comes from `journal.piecePath`.
  Articles carry a progress hairline, a text size and the next piece.
  Notes and pull quotes (`withNotes`), contents for long reads
  (`withContents`), figures (`journal.piece_figures`), an original beside
  a translation (`journal.piece_bodies.original`), topics
  (`/qirtas/topics`, a topic public only from three pieces), a reading and a clip (`reading_path`, `clip_id`),
  Save for later (`journal.saved_pieces`, `/account/work`), Gallery
  selections shared by address (`/qirtas/selection/...`, nothing stored).
  RSS at `/qirtas/feed.xml` and per section; the archive at
  `/qirtas/archive`. Pieces print on white without the site's frame.
- **Issues** are themed online collections (`journal.issues`,
  `/qirtas/issues`, a Shelf, with the plain list as a view, `?view=list`):
  Haven is the pilot issue (`pilot`, no number), Issue 1 comes in spring
  2027. **The Edition** is only the printed year-in-review; an issue's
  record keeps the print run, printer and date for it.
- **Games**, daily, made in the reader's browser and the same for everyone
  on a Baghdad day (`lib/data/games`): the word, the word search,
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
  (its promise at `/next-stop/care`), not part of Qirtas. Episodes are
  `programmes.episodes`, edited in the Diwan (Media → Next Stop): number,
  title and description in both languages, one YouTube video per language
  edition (or one with both caption tracks), release date, chapters,
  WebVTT captions and a thumbnail. Each has its page at
  `/next-stop/episodes/<slug>` with a click-to-load player on
  youtube-nocookie.com, TVEpisode JSON-LD, and a place in the sitemap.
  Everyone on camera is listed (`programmes.episode_on_camera`, Media only)
  and signs F-15 by a single-use link to their address
  (`programmes.episode_release_link`); an episode can't be published until
  all have signed (`private.episode_releases_signed`). Credits come from
  Next Stop crew roles scoped to the episode, each with its `credit`
  (`programmes.credit_episode`), plus guests and the standing producer and
  host, in the American order (`programmes.episode_credits`). A removal
  request naming an episode's address hides it at once. The kit's video
  files are in the private `brand-kit` bucket, listed in
  `packages/brand/assets/video/manifest.json`, uploaded by Media and
  downloaded by staff through `/api/brand-kit/<file>`.
- **The mailing list** (decisions.md, Channels and email): one audience
  with two topics, "The Sunday Paper" (`paper`) and "Society news and
  events" (`news`). Members are on both from sign-up unless they untick
  the box (`core.profiles.mail_paper`, `mail_news`); guests only if they
  tick it; the public chooses at /sunday-paper by double opt-in
  (`content.newsletter_subscribers.paper`, `news`, `source`); the Tour's
  writers come from the invitation list when it is sent
  (`private.mailing_from_invitations`). `core.mailing_recipients(topic)`
  is who gets a bulk email (never a suppressed address); Media → Channels
  shows counts only (`content.mailing_counts()`). Every bulk email links a
  no-login preferences page (the two topics, or stop everything).
- **Announcements** go to "Society news and events" once the President
  sends them (one email a week at most, `core.send_announcement`); Media
  posts a notice to "From the Society" alone (`core.post_notice`), and
  marks the Instagram post made. All notices are at
  `/qirtas/from-the-society`.
- **The Sunday Paper** («جريدة الأحد»), monthly, to its topic, sent as one
  Resend Broadcast per language (outbox kind `sunday_paper.broadcast`): the
  letter, the month's pieces, From the Society, What's on, open roles and
  a call to write. Past issues are at `/sunday-paper/<yyyy-mm>`,
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
  read back first. Every email comes from one sender, set in code
  (`SENDER`); bounces and complaints arrive by Resend's webhook
  (`/api/hooks/resend`) and are never written to again
  (`core.email_suppressions`). Each email has Reply-To hello@auibsal.org, a preview
  line that isn't the subject, a tag with its kind and a footer saying
  why it came (service, optional with a stop link, officer, direct) and
  the sustainability line. A new journey adds its row to
  `docs/platform/email.md` and its story in
  `packages/brand/stories/emails.stories.tsx`.
- **Analytics** on the public site only: Vercel Web Analytics, cookieless
  (decisions, Nov 7): no Google Tag Manager or Analytics and no cookie
  banner. The site sets only the cookies it needs (the session, the
  language and the theme), listed in the Privacy Notice
  (`docs/platform/analytics.md`).
