# Hudhud, the Telegram bot

Hudhud (هدهد), the hoopoe, is the AUIB Society of Arts and Letters'
Telegram bot. The code is in apps/web
(`lib/api/bot`, routes `/api/hooks/telegram` (the webhook), `/api/telegram/setup`,
`/api/telegram/link`, `/api/cron/telegram`);
the mascot and its rules are in `packages/brand/assets/mascot`.

## What it does

**In a private chat** (anyone can start it; a few things need a linked
Diwan account):

| Command | What it does |
| --- | --- |
| `/start` | A greeting and a menu. Links from elsewhere open with a payload: `link_…` (from the Diwan), `ev_<id>` (an event), `word`. |
| `/events` | What's coming up. Each event has a card with RSVP or Cancel, Details and Add to calendar. |
| `/qirtas` | The latest public Qirtas pieces. |
| `/word` | Opens today's word: auibsal.org/qirtas/games/word itself, as a Mini App inside Telegram. |
| `/me` | The linked account, its places, the notices switches (the same as Settings → Notices: your notices, reminders, Society news and events, the Sunday Paper, the daily word), join buttons for the groups, Unlink. |
| `/help` | The list. |

Typing `@<bot> words` in any chat (inline mode) shares a public event or
Qirtas piece as a card. In a chat the bot isn't in, mentioning it in a
message (Guest Mode: "@<bot> open mic") answers there with the event or
piece that matches, or with what's coming up.

### One notices model

Every notice the Society sends is one of five topics, and each person
turns each topic on or off for each channel, in Settings → Notices (a
grid, `NoticeGrid`) or in Hudhud's /me; both write the same columns
through `core.set_my_notice(topic, channel, on)` and read them with
`core.my_notices()`, so they never disagree.

| Topic | Email | Hudhud |
| --- | --- | --- |
| The Sunday Paper | `profiles.mail_paper` | `telegram_accounts.paper` |
| Society news and events | `profiles.mail_news` | `telegram_accounts.news` |
| Reminders (booked events, shifts, what to sign) | `profiles.notify_email` | `telegram_accounts.reminders` |
| Your notices (RSVPs, applications, decisions, account) | always | `telegram_accounts.notify` |
| The daily word | — | `telegram_accounts.daily_word` |

Nothing reaches anyone twice where one copy is enough: with reminders on
in Hudhud, a reminder goes there **in place of** the email (`reminder`
in the outbox's `send`). Your notices always come by email, with a copy
in Hudhud while that switch is on. The Sunday Paper and Society news go
to both channels each person keeps on: the Paper reaches linked members
in their chat within three days of the Broadcast (`runPaper`, one
delivery each, `core.paper_deliveries`), and the members' group gets one
post in Qirtas's topic. A member who blocks the bot has its switches
turned off.

**In the Society's group** (a supergroup with topics):

| Command | Who | What it does |
| --- | --- | --- |
| `/setup <code>` | Group admins | Connects the group, once. The code comes from the Diwan; the message is deleted at once. |
| `/events` | Everyone | What's coming up, with buttons that open the bot. |

Nothing else is typed in the chat (decisions.md, Channels and email).
Hudhud is set up in one place, the Diwan's Media → Channels
(`settings.manage`): the bot itself (its username, *Connect the bot to
Telegram*, the group setup code), then each group's settings: who it is for
(members, or staff for the Diwan group: see below), the language Hudhud
answers in, and the topic for each kind of post (`announcements`,
`events`, `qirtas`, `word`, `brief`), by number or link.

And without commands:

- **Join requests** (Guard mode). With *Approve new members* on the
  invite link, Telegram asks the bot first: a linked member's account is
  approved at once; everyone else waits in Telegram's own request list for
  an admin. Someone not linked gets a private note inviting them to link
  (the moment they do, a member is let in); a linked account that isn't a
  member's (a partner's guest or team) is told the group is for members.
- **Removals** (decisions §6): someone in the members' group without a
  linked member's account gets a private notice from Hudhud the first time
  they post (in the topic only if Telegram won't let Hudhud write to them),
  and is removed a week later. Exempt: the group's admins, anyone holding a
  Society role, and the list Membership keeps in the Diwan, Media →
  Channels (`core.telegram_exempt`: Student Life's staff, the Faculty
  Advisor).
- **Posts, every ten minutes** (pg_cron → `/cron/telegram`), each one post
  in English with an «العربية» button to the Arabic page (decisions §6):
  Hudhud's Sunday note, one post each Sunday from 10:00 a.m. listing the
  week's events and the open calls with their closing dates (to `events`,
  else `announcements`; no note in a week with neither, so none outside
  the semester), a reminder for each event two days before, "doors open"
  an hour before it starts (answering the event's post, with *My ticket*),
  "voting is open" and, in its last day, "closes tomorrow" for each
  members' election (`announcements`, with *Vote*), and
  new Qirtas pieces of the last three days
  (`qirtas`, else `announcements`). The daily word goes only to members'
  own chats, never to a group. A purpose without a topic gets no posts.
  Each post goes out once (`core.telegram_posts`).
- **Announcements** (decisions.md, Channels and email): a notice the President sends from the
  Diwan (The Council → Announcements) is posted once to the members' group
  (`announcements` only) and sent to each linked member who keeps notices
  on, in their language, 25 a run (`core.announcement_deliveries`), for
  three days after the go. The President's words go as written, with the
  site button; nothing of the bot's Iraqi copy is added.

- **Admins and member tags.** Every ten minutes Hudhud looks at each
  linked role holder (a role that opens the team's work,
  `access.roles.in_notion`) in each group they are in:
  - **Admins.** The President, the Vice President, the Secretary and the
    Director of Media are admins of both groups, and every Council seat is
    an admin of the Diwan group, with their seat as their title. Hudhud
    gives every right but Remain Anonymous and Add New Admins, so no admin
    it makes can make others; it holds Add New Admins itself (the owner's
    change to decisions.md). When the seat ends it takes the rights back.
    It can change only the admins it made: the owner and admins added by
    hand are left as they are.
  - **Member tags.** Everyone else carries their seat as their member
    tag; the exempt list is tagged "Student Life" in the members' group.
  - Titles and tags are 16 characters at most, cut at a word. When
    someone's last role ends the tag comes off, and 7 days later they
    leave the Diwan group. Only those Hudhud tagged or made admins are
    changed (`core.telegram_titles`, `admin`).
- **Joining.** Hudhud makes each group one join-request link
  (`core.telegram_groups.invite_link`). Members see *Join the members'
  group* (and role holders *Join the Diwan group*) in their profile's
  Telegram section once Telegram is linked, and in Hudhud's /me and the
  message after linking; Hudhud lets them in at once.

**What Telegram does itself** (so the bot doesn't):

| Need | Telegram's own feature | Where |
| --- | --- | --- |
| Welcoming people, the rules | Welcome Message (only new members see it): a greeting, the rules, a link to the Acceptable Use Policy (say it is a draft until the Council adopts it) and to linking in the Diwan | Group → Edit → Welcome Message |
| Spam | Aggressive Anti-Spam, offered only to groups of 200 or more members (so not the Diwan group, whose doors only role holders pass); Slow Mode; what members may send | Group → Edit → Administrators / Permissions |
| Moderating | Restrict (with a duration), Ban, Delete, Report; every action in Recent Actions | Long-press a message; Group → Edit → Recent Actions |
| The daily word | The bot's Main App: the web game in Telegram | BotFather → Mini Apps |
| Logging in | Telegram's login (OpenID Connect), to link accounts only | BotFather → Login Widget |

**In the Diwan group** (set to staff in the Diwan):

- **Officers only.** A join request is approved at once only for a linked
  account that holds a Society role (`core.telegram_is_staff`); a linked
  member without one, and anyone not linked, waits in Telegram's request
  list for the group's admins, with a note saying the group is for
  officers. Linking later lets in only those who hold a role. Someone
  whose last role ended leaves 7 days later (see Member tags above).
- **The morning brief,** once a day from 8:00 a.m. Baghdad time: today's
  events (members-only and invitation events too) with their bookings and
  waitlists, and what waits in the Diwan as counts (partner applications,
  partners asking to turn something on, new Qirtas
  submissions, new replies to openings, open requests), with *Open the
  Diwan* (`core.telegram_staff_brief`).
- **After each event,** half an hour after it ends (three hours after it
  starts when it has no end): who came, how many of them had booked, the
  walk-ins, the no-shows and the waitlist, with a link to the event in the
  Diwan (`core.telegram_event_summaries`).
- Both go to the brief's topic, else `announcements`, else
  General. The Diwan group gets none of the public posts. The functions are
  callable with the secret key only. Names never appear, only titles and
  counts.
- **Staff alerts by team** (decisions.md, Channels and email: urgent ones
  at once, the rest in the morning). Each Council team can have its own
  topic in the Diwan group (Media → Channels: `council`, `qirtas`,
  `media`, `events`, `membership`, `partnerships`; else the brief's, else
  `announcements`). An alert is one line in each language and a link,
  with no names (`core.staff_alerts`, written by the server only,
  `staffAlert` in `lib/api/bot/upkeep.ts`); urgent ones go out on the next
  run, the rest as one message per team at 8:00 a.m. (`runAlerts`). The
  Desk lists the last two weeks' under Alerts. The sources today:

  | Source | Team | Urgent |
  | --- | --- | --- |
  | A production deploy that failed or was canceled (Vercel webhook, `/api/hooks/vercel`, `VERCEL_WEBHOOK_SECRET`) | Council | yes |
  | A scheduled job that failed (`platform.cron_failed`) | Council | yes |
  | The domain or the site's certificate within 30 days of running out (RDAP and TLS, daily at 7:00 a.m., `lib/api/watch.ts`) | Council | at 7 days |
  | The database advisors' findings (daily) | Council | no |
  | A Society email marked as spam (Resend webhook) | Media | yes |
  | A Society email that bounced for good (Resend webhook) | Media | no |

**More in the members' group:**

- **Pinned.** The President's newest announcement is pinned in its topic,
  quietly (no second notification), and the one before it unpinned.
- **The description** is decisions.md's line with the next public event
  in place of the events link ("The paper and the pen at @AUIB_BAG. Next:
  Open Mic, Wednesday, November 18, 6:00 p.m. · auibsal.org/events/… ·
  Join: auibsal.org/join"), 255 characters at most, checked every run
  (`syncDescriptions`). The photo stays Telegram's own setting.
- **Welcome.** Someone joining with a linked member's account gets a
  private welcome with the Code of Conduct. Nobody gets a notice at the
  door: Hudhud lets in only linked members, so the removal notice comes
  only at the first post of someone an admin let in by hand.

**In members' own chats** (reminders, for those who keep Hudhud's
reminders on; each goes once, `core.telegram_nudges`):

- **The ticket on the day.** Within three hours of an event they booked,
  the same QR code as on Today, as an image (`lib/api/bot/qr.ts`), with
  *My ticket* and *Details* (`core.telegram_tickets_soon`).
- **Role to-dos, Mondays at 10:00 a.m.:** a handover to sign (a role
  ended in the last 60 days or ending in the next 14) and a role
  agreement not yet signed (`core.telegram_role_todos`). Today in Your
  account keeps them too.
- Everything else they get by email (Qirtas decisions, election notices,
  RSVPs, the role email) also comes here while *My notices* is on.
- **Live.** When an admin schedules or starts a live stream (a video
  chat) in the members' group, Hudhud posts it to `announcements`
  (`features/group/streams.ts`). Bots cannot start streams or post
  stories: those stay with the admins in Telegram.

## How it works

- The bot is grammY inside the API routes, the only code with secrets: the
  Telegram token sits next to the Supabase secret key, and the same code
  sends the Diwan notices to Telegram. Telegram delivers updates to
  `auibsal.org/api/hooks/telegram` with the webhook secret; anything without it
  is refused. The bot's identity comes from the token and
  `TELEGRAM_BOT_USERNAME`, so a cold start makes no extra call to
  Telegram.
- The bot uses the secret key, but acts for a member only through the
  `core.telegram_*` database functions. They set the linked member's
  claims (aal1) for their own transaction and call the Diwan functions
  (`events.rsvp`, …), so RLS and permissions decide exactly as in the
  Diwan. Roles that need two-step sign-in never count through Telegram.
  Public reads (events, Qirtas, inline results) use the publishable key, as
  a guest.
- Linking, from the member's Diwan profile (*Connect Telegram*), with
  Telegram's login (OpenID Connect, authorization code with PKCE): the
  Diwan asks `/telegram/link` for Telegram's address, sends the member
  there to confirm, and on the way back hands the code and its PKCE
  verifier to `/telegram/link`, which exchanges it with the Client Secret,
  verifies the id_token (Telegram's keys, issuer, audience = the bot's id,
  expiry) and links that Telegram account (`core.telegram_link_account`).
  The login asks for `openid profile telegram:bot_access` (the Telegram
  id and username, and leave for the bot to write first), never the phone
  number. It only links: **signing in to the Diwan is email only** (owner,
  2026-10-23), and the Telegram login is never offered there. Without the
  Client Secret the Diwan falls back to a one-time code (15 minutes, only
  its SHA-256 is stored) and opens `t.me/<bot>?start=link_<code>`.
  Connecting a group uses the same kind of code, which only
  `settings.manage` holders can make.
- What it stores: the link (member, Telegram id, username, notices on or
  off, the daily word on or off and the day it was last sent), for each connected group its settings, and the Telegram ids of
  people whose join request waits for an admin (removed when they're let
  in). Posts are deleted after 90 days, codes when they expire
  (`sal-telegram-tidy`).

## Setting it up (once)

1. **Create the bot.** In Telegram, open @BotFather: `/newbot`, name
   **Hudhud · SAL**, a username ending in `bot` (ours: `auibsal_bot`).
2. **On the auibsal project** (Production, marked sensitive), add
   `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`,
   `TELEGRAM_WEBHOOK_SECRET` (`openssl rand -hex 32`) and
   `TELEGRAM_LOGIN_CLIENT_SECRET` (step 3), and redeploy.
3. **BotFather → the bot → Bot Settings** (the Mini App's settings pages):

   | Setting | Choose | Why |
   | --- | --- | --- |
   | Edit Bot → Profile picture | `packages/brand/assets/mascot/hudhud-avatar.png`: white Hudhud on crimson | The bot's picture only. The members' group ("AUIB Society of Arts and Letters") uses `packages/brand/assets/logos/sal-avatar.svg`, the white Bookmark on crimson; the Diwan group, the officers' working group, uses `packages/brand/assets/logos/sal-avatar-ink.svg`, the white Bookmark on ink, so the two are never confused. Never Hudhud on either. |
   | Edit Bot → Description picture | `packages/brand/assets/mascot/hudhud-description.png` (640 × 360: the reversed Hudhud, as supplied, on crimson) | What people see before they press Start. The name, about and description texts are set by step 4. |
   | Inline Mode | On, placeholder "Events and Qirtas" | Sharing cards. |
   | Guest Mode | On | Answers a mention in chats the bot isn't in. |
   | Login Widget → OpenID Connect | Redirect URIs `https://auibsal.org/account/settings/profile` and `https://auibsal.org/ar/account/profile` (and `http://localhost:3000/account/profile` for a test bot); Trusted Origins empty; signing RS256 | Linking from the profile. Copy the Client Secret to the auibsal project; the Client ID is the bot's id and needs no variable. |
   | Allow Groups | On | |
   | Group Privacy | On | As an admin the bot sees the group anyway. |
   | Group Admin Rights | Every right except Remain Anonymous | Join requests, admins and member tags, removals, posts in topics. Hudhud makes the officers admins without Add New Admins; its token stays in the site's secrets and is rotated at each handover, since a leaked token could make admins. |
   | Channel Admin Rights | None | No channel. |
   | Privacy Policy | `https://auibsal.org/privacy` | Telegram shows it in the bot's profile. |
   | Bot Management Mode | Off | For bots that create bots. |
   | Threaded Mode | Off | Private chats stay one conversation; the menu and /me edit in place. |
   | Guard | On | Telegram asks the bot about each join request first. |
   | Secretary, Bot-to-Bot | Off | No business account; no other bots to talk to. |
   | Mini Apps → Main App | On, URL `https://auibsal.org/qirtas/games/word`, name "Daily word" | The word game in Telegram, the same one as the site. |
   | Mini Apps → Menu Button | Open the Main App, title "Daily word" (or leave it on Commands) | BotFather decides it; the bot no longer overrides it. |
   | Payments, Affiliate Program, Games, Serverless | Not used | No online payments of any kind (platform rule); the daily word is the Main App, not a Telegram game; the bot runs in the API routes. |

4. **Connect it.** In the Diwan, Media → Channels → Hudhud → *Connect
   the bot to Telegram* (settings managers). It sets the webhook (with the updates
   the bot uses, Guest Mode's among them), the commands in English and
   Arabic, and the descriptions; do it again whenever the commands, the
   secret or the updates change. (Without the Diwan:
   `curl -X POST https://auibsal.org/api/telegram/setup -H "Authorization: Bearer $CRON_SECRET" -d '{"connect":true}'`.)
   The scheduled posts need nothing more: the database already calls
   the API routes.
5. **The Diwan.** Media → Channels → Hudhud: the bot's username (this shows
   *Connect Telegram* in members' profiles).
6. **The group.** Make it a supergroup with topics. Add the bot as an
   admin with the rights above. In the Diwan, Media → Channels → Hudhud →
   *Make a setup code*, and send the `/setup …` line in the group. Then,
   in the Diwan (Media → Channels), set who the group is for and each
   topic, and turn on *Approve new members* on the invite link. In the
   group's settings: the Welcome Message, Aggressive
   Anti-Spam, and the members' permissions (the table above).

## Sticker set

Hudhud's twelve stickers are in `packages/brand/assets/mascot/stickers` (512 × 512 PNG and
WebP, a 100 × 100 `pack-icon.png`, a contact sheet), published as
t.me/addstickers/auibsal; the set's short name is `telegram.stickerSet` in
`packages/config/project.json`. The bot reads the set itself (Bot API
`getStickerSet`, once per instance) and follows a few replies with one, in
private chats only and never instead of the text: RSVP confirmed → 02
(🎉), work received → 06 (✉️), an error → 07 (😓), nothing new or an empty
list → 05 (😴). It finds each by its emoji, or else by its place in the
set, so no file_ids are kept anywhere; an empty set name sends none.

To change the set: @Stickers `/replacesticker`, `/editsticker` (keep the
emoji in `packages/brand/assets/mascot/README.md`) or `/ordersticker`. A new set needs only
its short name in config.

## Development

Use a separate test bot from @BotFather. Put its token and username in
`apps/web/.env.local` with the local Supabase keys, and run
`bun run --cwd apps/web telegram:dev`: long polling (it removes that bot's
webhook) and the group posts every minute. Never run it with the
Society's token.

Tests: `bun run --cwd apps/web test` runs the bot's unit tests; with the
local stack, `SUPABASE_INTEGRATION=1` also runs the whole bot against the
database with Telegram replaced by a recorder.
