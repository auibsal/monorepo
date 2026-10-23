# Hudhud, the Telegram bot

Hudhud (هدهد), the hoopoe who carries the Society's letters, is the
AUIB Society of Arts and Letters' Telegram bot. The code is in apps/api
(`lib/bot`, routes `/telegram`, `/telegram/setup`, `/telegram/link`,
`/cron/telegram`);
the mascot and its rules are in `brand/mascot`.

## What it does

**In a private chat** (anyone can start it; a few things need a linked
Nexus account):

| Command | What it does |
| --- | --- |
| `/start` | A greeting and a menu. Links from elsewhere open with a payload: `link_…` (from the Nexus), `ev_<id>` (an event), `word`, `rules`. |
| `/events` | What's coming up. Each event has a card with RSVP or Cancel, Details and Add to calendar. |
| `/waraq` | The latest public Waraq pieces. |
| `/word` | Today's word guess, the same word as auibsal.org/waraq/games/word. `/word ar` and `/word en` choose the language. |
| `/me` | The linked account, its places, Telegram notices on or off, Unlink. |
| `/help` | The list. |

Typing `@<bot> words` in any chat (inline mode) shares a public event or
Waraq piece as a card. In a chat the bot isn't in, mentioning it in a
message (Guest Mode: "@<bot> open mic") answers there with the event or
piece that matches, or with what's coming up.

Members who link Telegram also get the Nexus notices there (apps/api
sends them with the email and the push: reminders, RSVPs, waitlist
places, Waraq decisions). A member who blocks the bot has them turned off.

**In the Society's group** (a supergroup with topics):

| Command | Who | What it does |
| --- | --- | --- |
| `/setup <code>` | Group admins | Connects the group. The code comes from the Nexus. |
| `/topic <purpose>` | Group admins | Sent inside a topic: what it is for. Purposes: `welcome`, `announcements`, `events`, `waraq`, `word`, `log`. `/topic none` clears it. In General it sets General. |
| `/policy open \| verify \| members` | Group admins | Who gets in through join requests (default `verify`). |
| `/lang en \| ar \| both` | Group admins | The language of the bot's posts (default `both`). |
| `/warn`, `/unwarn`, `/mute [30m\|2h\|1d]`, `/unmute`, `/ban`, `/unban` | Admins who may restrict members | Sent as a reply to the person's message. Three warnings mute for a day. Admins are never moderated. Every action is noted in the log topic. |
| `/report` | Everyone | As a reply: sends a link to the message to the log topic. |
| `/rules` | Everyone | The Acceptable Use Policy (with its status) and the house rules from Settings. |
| `/events` | Everyone | What's coming up, with buttons that open the bot. |

And without commands:

- **Join requests.** With *Approve new members* on, the bot lets linked
  members in at once. Under `verify` everyone else gets a private message
  with a button to tap first. Under `members`, people who aren't linked
  members are asked to link their account and are let in the moment they
  do.
- **Welcome.** Everyone who joins is welcomed in the `welcome` topic, with
  buttons for the rules and linking. The "joined" and "left" service
  messages are deleted.
- **Newcomers' links.** A link, mention or forward from someone who joined
  less than a day ago and isn't a linked member is deleted and noted in
  the log topic.
- **Posts, every ten minutes** (pg_cron → `/cron/telegram`): new public events
  in the next 45 days (to `events`, else `announcements`), a "starting
  soon" reply three hours before, new Waraq pieces of the last three days
  (`waraq`, else `announcements`), and the daily word at 9:00 AM Baghdad
  time (`word`, else `waraq`). A purpose without a topic gets no posts.
  Each post goes out once (`core.telegram_posts`).

## How it works

- The bot is grammY inside apps/api, the only app with secrets: the
  Telegram token sits next to the Supabase secret key, and the same app
  sends the Nexus notices to Telegram. Telegram delivers updates to
  `api.auibsal.org/telegram` with the webhook secret; anything without it
  is refused. The bot's identity comes from the token and
  `TELEGRAM_BOT_USERNAME`, so a cold start makes no extra call to
  Telegram.
- The bot uses the secret key, but acts for a member only through the
  `core.telegram_*` database functions. They set the linked member's
  claims (aal1) for their own transaction and call the Nexus functions
  (`events.rsvp`, …), so RLS and permissions decide exactly as in the
  Nexus. Roles that need two-step sign-in never count through Telegram.
  Public reads (events, Waraq, inline results) use the publishable key, as
  a guest.
- Linking, from the member's Nexus profile (*Connect Telegram*), with
  Telegram's login (OpenID Connect, authorization code with PKCE): the
  Nexus asks `/telegram/link` for Telegram's address, sends the member
  there to confirm, and on the way back hands the code and its PKCE
  verifier to `/telegram/link`, which exchanges it with the Client Secret,
  verifies the id_token (Telegram's keys, issuer, audience = the bot's id,
  expiry) and links that Telegram account (`core.telegram_link_account`).
  The login asks for `openid profile telegram:bot_access` (the Telegram
  id and username, and leave for the bot to write first), never the phone
  number. It only links: **signing in to the Nexus is email only** (owner,
  2026-10-23), and the Telegram login is never offered there. Without the
  Client Secret the Nexus falls back to a one-time code (15 minutes, only
  its SHA-256 is stored) and opens `t.me/<bot>?start=link_<code>`.
  Connecting a group uses the same kind of code, which only
  `settings.manage` holders can make.
- What it stores: the link (member, Telegram id, username, notices on or
  off), for each connected group its settings, and for people seen joining
  it their join time and warnings (removed when they leave). Word plays are
  deleted after a week, posts after 90 days, codes when they expire
  (`sal-telegram-tidy`).

## Setting it up (once)

1. **Create the bot.** In Telegram, open @BotFather: `/newbot`, name
   **Hudhud · SAL**, a username ending in `bot` (ours: `auibsal_bot`).
2. **On sal-api** (Production, marked sensitive), add
   `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`,
   `TELEGRAM_WEBHOOK_SECRET` (`openssl rand -hex 32`) and
   `TELEGRAM_LOGIN_CLIENT_SECRET` (step 3), and redeploy.
3. **BotFather → the bot → Bot Settings** (the Mini App's settings pages):

   | Setting | Choose | Why |
   | --- | --- | --- |
   | Edit Bot → Profile picture | `brand/mascot/hudhud-avatar.png` | |
   | Edit Bot → Description picture | `brand/mascot/hudhud-welcome.png` (640 × 360) | What people see before they press Start. The name, about and description texts are set by step 4. |
   | Inline Mode | On, placeholder "Events and Waraq" | Sharing cards. |
   | Guest Mode | On | Answers a mention in chats the bot isn't in. |
   | Login Widget → OpenID Connect | Redirect URIs `https://nexus.auibsal.org/profile` and `https://nexus.auibsal.org/ar/profile` (and `http://localhost:3000/profile` for a test bot); Trusted Origins empty; signing RS256 | Linking from the profile. Copy the Client Secret to sal-api; the Client ID is the bot's id and needs no variable. |
   | Allow Groups | On | |
   | Group Privacy | On | As an admin the bot sees the group anyway. |
   | Group Admin Rights | Delete messages, Ban users, Invite users via link, Pin messages, Manage topics | What moderation, join requests and posts use; nothing else. |
   | Channel Admin Rights | None | No channel. |
   | Privacy Policy | `https://auibsal.org/privacy` | Telegram shows it in the bot's profile. |
   | Bot Management Mode | Off | For bots that create bots. |
   | Threaded Mode | Off | Private chats stay one conversation; the menu and /me edit in place. |
   | Guard, Secretary, Bot-to-Bot | Off | Join requests are already checked by the bot; no business account; no other bots to talk to. |
   | Mini Apps (Menu Button, Main App) | Off | The menu button lists the commands. |
   | Payments, Affiliate Program, Games, Serverless | Not used | No online payments of any kind (platform rule); the daily word plays in the chat; the bot runs on apps/api. |

4. **Connect it.** In the Nexus, Settings → Telegram → *Connect the bot
   to Telegram* (settings managers). It sets the webhook (with the updates
   the bot uses, Guest Mode's among them), the commands in English and
   Arabic, and the descriptions; do it again whenever the commands, the
   secret or the updates change. (Without the Nexus:
   `curl -X POST https://api.auibsal.org/telegram/setup -H "Authorization: Bearer $CRON_SECRET" -d '{"connect":true}'`.)
   The scheduled posts need nothing more: the database already calls
   apps/api.
5. **The Nexus.** Settings → Telegram: the bot's username (this shows
   *Connect Telegram* in members' profiles), and house rules if you want
   them.
6. **The group.** Make it a supergroup with topics. Add the bot as an
   admin with the rights above. In the Nexus, Settings → Telegram → *Make
   a setup code*, and send the `/setup …` line in the group. Then
   `/topic …` in each topic, and turn on *Approve new members* on the
   invite link.

## Development

Use a separate test bot from @BotFather. Put its token and username in
`apps/api/.env.local` with the local Supabase keys, and run
`bun run --cwd apps/api telegram:dev`: long polling (it removes that bot's
webhook) and the group posts every minute. Never run it with the
Society's token.

Tests: `bun run --cwd apps/api test` runs the bot's unit tests; with the
local stack, `SUPABASE_INTEGRATION=1` also runs the whole bot against the
database with Telegram replaced by a recorder.
