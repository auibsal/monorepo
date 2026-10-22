# Hudhud, the Telegram bot

Hudhud (هدهد), the hoopoe who carries the Society's letters, is the
AUIB Society of Arts and Letters' Telegram bot. The code is in apps/api
(`lib/bot`, routes `/telegram`, `/telegram/setup`, `/cron/telegram`);
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
Waraq piece as a card.

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
- Linking: the Nexus makes a one-time code (15 minutes, only its SHA-256
  is stored) and opens `t.me/<bot>?start=link_<code>`. Connecting a group
  is the same with a code only `settings.manage` holders can make.
- What it stores: the link (member, Telegram id, username, notices on or
  off), for each connected group its settings, and for people seen joining
  it their join time and warnings (removed when they leave). Word plays are
  deleted after a week, posts after 90 days, codes when they expire
  (`sal-telegram-tidy`).

## Setting it up (once)

1. **Create the bot.** In Telegram, open @BotFather:
   - `/newbot`, name **Hudhud · SAL**, username of your choice ending in
     `bot` (for example `auibsal_bot`).
   - `/setuserpic`: upload `brand/mascot/hudhud-avatar.png`.
   - `/setinline`: turn inline mode on (placeholder: "Events and Waraq").
   - `/setjoingroups`: on. `/setprivacy`: leave it enabled (as an admin
     the bot sees the group anyway).
2. **On sal-api** (Production, marked sensitive), add
   `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME` and
   `TELEGRAM_WEBHOOK_SECRET` (`openssl rand -hex 32`), and redeploy.
3. **Connect it.** In the Nexus, Settings → Telegram → *Connect the bot
   to Telegram* (settings managers). It sets the webhook, the commands in
   English and Arabic, and the descriptions; do it again whenever the
   commands or the secret change. (Without the Nexus:
   `curl -X POST https://api.auibsal.org/telegram/setup -H "Authorization: Bearer $CRON_SECRET" -d '{"connect":true}'`.)
   The scheduled posts need nothing more: the database already calls
   apps/api.
4. **The Nexus.** Settings → Telegram: the bot's username (this shows
   *Connect Telegram* in members' profiles), and house rules if you want
   them.
5. **The group.** Make it a supergroup with topics. Add the bot as an
   admin who can delete messages, ban users, invite users and pin
   messages. In the Nexus, Settings → Telegram → *Make a setup code*, and
   send the `/setup …` line in the group. Then `/topic …` in each topic,
   and turn on *Approve new members* on the invite link.

## Development

Use a separate test bot from @BotFather. Put its token and username in
`apps/api/.env.local` with the local Supabase keys, and run
`bun run --cwd apps/api telegram:dev`: long polling (it removes that bot's
webhook) and the group posts every minute. Never run it with the
Society's token.

Tests: `bun run --cwd apps/api test` runs the bot's unit tests; with the
local stack, `SUPABASE_INTEGRATION=1` also runs the whole bot against the
database with Telegram replaced by a recorder.
