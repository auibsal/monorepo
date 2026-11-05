# Changelog

The platform of the AUIB Society of Arts and Letters, auibsal.org. Each
release is tagged in git (`v1.0.0`, …); the Society's documents keep their
own versions in the Library.

## Unreleased

- Qirtas's games are daily: the word, a word search, a crossword and
  anagrams, new every day in English and Arabic and counted from No. 1
  again. Games now come from the editors only.
- One Qirtas nameplate on every page of the paper, and a masthead at
  /qirtas/masthead.
- The Editor-in-Chief heads Qirtas and sits on the Council, in place of
  the Editor of Qirtas.
- Qirtas pieces may be heard read aloud, and paired with a clip from the
  Video section; readers share a selection of Gallery pieces by its link,
  without signing in.
- More games in Qirtas: quizzes, word ladders, riddles, anagrams and name
  the book, written by the Games editors and played on the site.
- Book Circle votes on its next book: the host chooses three in the
  Diwan, members vote on the program's page, and the page names the
  circle's choice once voting closes.
- The Typewriter Tour's page shows the Six Words wall and a typewriter to
  try (nothing typed is kept). Past sessions can carry outside links, such
  as the album the Listening Room played, added on the event in the Diwan.
- The Qirtas Awards by year, each round on its own page; author pages
  list the Editions and the Awards their work was shortlisted for or won;
  the Company's productions on a shelf of playbills.
- Join says what membership gives you; Partners says what a partner gets
  and gives. Hudhud can send the day's word each morning (turn it on in
  /me), and brings shift and event reminders even with optional email
  off. The public pages are checked against a performance budget on a
  mid-range phone.
- Every program's page has the same shape: its rhythm, the next session,
  the month, past sessions with what Qirtas wrote from them (all of them
  on their own page), then its own: Book Circle's shelf of reviews and
  Open Pages' prompt cards, written by the host in the Diwan.
- Readers save Qirtas pieces to read later: on Today and in Membership.
- The Diwan: events, pieces, productions, partners and campaigns show their
  history: who added or changed them, when, and which fields.
- Membership: hours are logged right on Record; partners add a perk right
  on their Perks list.
- The Sunday Paper's past issues, each on its own page in a newspaper's
  layout; Next Stop's page with its episodes, team and how to send a
  reel; search opens on the newest pieces and what is coming up.
- The Diwan: every opening (roles, Apprenticeships, First Ink, volunteer
  places, places with partners) in one list at People → Openings, with
  filters by kind and program, in place of three separate lists.
- The Diwan: small rows (needs, rotas, shifts, credits, rehearsals,
  audition times, ledger lines, receipts, impact figures, a member's
  activities and roles) are added right on their list instead of on a
  page of their own. Programs' and Qirtas's needs lists load again.
- One language standard, written in the design system's Voice page with an
  English–Arabic glossary and checked in CI: Latin digits, Iraqi month
  names, Arabic punctuation and tanween, one Arabic word per term; English
  with straight quotes and "for example". Iraqi Arabic stays in Hudhud.
- The Diwan's Partners in one place: applications, the register (each
  partner's page with its guests), memoranda, perks and places; officers'
  declarations are under Society. "Tell us more" is part of Profile.
- Qirtas: pull quotes and numbered notes; a photo essay layout; pieces
  link to their event; RSS for the paper and each section; an archive by
  month and section; pieces and crosswords print cleanly.
- An Edition reads as a book: cover, contents page, and the Editions
  before and after; each Edition has a launch page. Covers move from the
  shelf to the page where the browser can.
- With nothing set as front, the Qirtas front page leads with the newest
  from all six sections.
- Articles: a reading progress line, a text size choice, and the next
  piece and its Edition at the end.
- The homepage names the next event and lists the six programs in large
  type with their rhythm.
- Second Chapter's impact report has its own page; the Apprenticeship is
  explained at /get-involved/apprenticeship.
- The Diwan: find anything with "/" or Ctrl+K; the Desk's handover shows
  what waits and who owns it; every Qirtas decision needs its reason.
- The design system in the Diwan (/diwan/design, linked from the Desk):
  SAL-BRD-01 in full as its Guide (the PDF is gone), foundations, logos,
  components, every email (the sign-in emails too), the social files as
  PNGs and the printables (the Charter poster, the Open Call poster and
  the camera-shy stickers drawn as stories, no PDFs), from
  `packages/brand` (was `packages/storybook`, `brand/` and
  `packages/design-system`, now one package, `@repo/brand`).
- No ads: AdSense, the Society's ad slots and the Advertising consent
  choice are gone; the consent card asks about analytics only.
- The Qirtas Awards (was the Qirtas Prizes) at /qirtas/awards, and Get
  involved (was the Callboard) in the code, emails and Hudhud too; the
  old addresses go to the new ones.
- An event, program or Qirtas piece in Notion is written in one language;
  an Arabic edition is its own row. The Listening Room's two evenings
  moved to `/events/listening-room-2027-03-16` and `-05-11`.
- The permission `programmes.manage` is `programs.manage`.
- Migrations run on production again after each merge (the deploy hook is
  optional; Vercel deploys `main` itself).
- The Diwan in three rooms: events, programs, documents and minutes are
  written in Notion and published to the site; an Arabic edition is its
  own row; the officers' copy in Notion shows each seat's full title.
- The Diwan's Library keeps each document's adoption record (with the
  vote); adopted minutes are locked.
- The brand book has a Motion section, with motion tokens.
- The Editions are on a shelf (and a plain list); before the first Edition
  the page shows its call and Launch Night.
- Share on pieces, Editions and the Awards; today's word opens the Games
  page, with a result to share.
- Second Chapter's page follows the collection through its stages and
  lists its drop-off points, from the campaign's record.
- Hudhud's Qirtas command is `/qirtas`.
- The homepage and the Qirtas front page drop repeated links; the Sunday
  Paper signup ends the Qirtas front page.

## 1.0.0 (November 2026)

The final production version, after the platform audit of October 31,
2026.

- **One app** at auibsal.org: the public site, Membership (members,
  guests and partners' people) and the Diwan (officers), with the API
  routes and Hudhud, the Society's Telegram bot.
- **Deploys follow migrations:** a merge to `main` runs CI, applies the
  database migrations, then deploys the site (`migrate.yml` and its
  Deploy Hook; Vercel's own deploys from `main` are off).
- **No third-party monitoring or protection services:** Sentry, Arcjet and
  Better Stack are gone. Errors and logs are in Vercel's runtime logs;
  security headers are the app's own; the public forms are rate limited
  in the database.
- **One person, one name:** a full four-part name belongs to one account.
- **The audit's cleanup:** dead tables and functions, the last feature
  switch, money fields, the old handbook and library tables, the API terms
  (SAL-PLT-10), and 156 unused messages removed; AUIB's dates in the
  members' calendar feeds.
