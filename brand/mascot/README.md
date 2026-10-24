Hudhud (هدهد), the Society's mascot: a hoopoe, native to Iraq, the messenger of the old stories and the guide in Attar's *The Conference of the Birds*. Use the files as `<img>`. Their colors are fixed.

**Files**
- `hudhud.svg`: standing, for light grounds. The default, for welcome screens, the bot's start message and notices.
- `hudhud-reversed.svg`: standing, on a `crimson` ground, with a `white` body. Use it for crimson posts and screens.
- `hudhud-flying.svg`: in flight, for light grounds. Use it for "sent", "on its way" and empty states that point somewhere.
- `hudhud-avatar.svg` / `hudhud-avatar.png` (640 × 640): head and crest of the reversed drawing on `crimson`, framed for a circle crop. This is the Telegram bot's picture; it still reads at 28 px.

**Drawing**
- Flat shapes in brand colors only. No outlines, gradients or shadows.
- Body, neck and head: one upright silhouette in `crimson` (`white` when reversed). Breast: `crimson-100`.
- Crest: one fan of six feathers that runs straight into the back of the head, with nothing between them. Each feather has a `white` band (`crimson-100` when reversed) and an `ink` tip at the same depth, and thin lines in the ground's color separate the feathers all the way to the head. It stands up by default; it folds back in flight and droops when Hudhud is tired or sorry.
- Wings: `ink` with `white` bars. Tail: `ink` with one `white` bar.
- Beak: `ink`, broad at the base and tapering to a rounded, down-curved tip. It holds nothing, except the envelope in the "sent" sticker.
- Eye: a solid `ink` dot with a small `white` highlight.
- The folded wing is separated from the body by a 6 px gap in the ground's color. The crest and head are one shape.

**Avatars on Telegram and elsewhere**
- The Society's own spaces (the main supergroup, channels, Instagram and the website's icon) use `sal-avatar.svg` from Logos: the white symbol on `crimson`.
- The bot, "Hudhud · SAL", uses `hudhud-avatar.png`: white Hudhud on `crimson`. The shared crimson circle marks both as the Society's, and the different shape tells members which one is the bot. It holds up in Telegram's light and dark themes; crimson Hudhud on white disappears in the light theme.
- Hudhud's avatar is only ever the bot's. Never use it for the Society's accounts, and never put the symbol on the bot.

**Never**
- Put the Society's symbol, wordmarks or any letter in Hudhud's beak, crest or feet, or anywhere on it.
- Recolor, stretch, mirror or outline Hudhud. Don't add props, expressions or speech bubbles outside the sticker pack.
- Don't place the light-ground files on `ink` or `crimson`; use `hudhud-reversed.svg` on `crimson`. Don't set Hudhud smaller than 48 px (the avatar's minimum is 28 px).
- Don't use it as a logo or beside a lockup in its place.

## Stickers

Hudhud's sticker pack: twelve 512 × 512 PNGs with transparent backgrounds and a white die-cut edge, so each one sits on any chat background, light or dark. They are made for a Telegram sticker set (static stickers: 512 px, PNG or WebP) and for replies from the bot.

**Stickers**
| File | Meaning | Emoji to pair in Telegram |
|---|---|---|
| `stickers/png/01-hello.png` | Hello, welcome | 👋 |
| `stickers/png/02-youre-in.png` | You're in, RSVP confirmed | 🎉 |
| `stickers/png/03-reading.png` | Reading, the journal is out | 📖 |
| `stickers/png/04-thinking.png` | Thinking, let me check | 🤔 |
| `stickers/png/05-asleep.png` | Nothing new, quiet week | 😴 |
| `stickers/png/06-sent.png` | Sent, on its way | ✉️ |
| `stickers/png/07-sorry.png` | Sorry, something went wrong | 😓 |
| `stickers/png/08-thank-you.png` | Thank you | 🙏 |
| `stickers/png/09-writing.png` | Writing, submissions open | ✍️ |
| `stickers/png/10-wow.png` | Wow, big news | 😮 |
| `stickers/png/11-see-you.png` | See you there, with a ticket | 🎟️ |
| `stickers/png/12-oops.png` | Oops, a reminder or deadline | ❗ |

**Making the Telegram set** (in @Stickers)
- `/newpack`, then name it "Hudhud · SAL".
- Send each PNG as a file, in order 01–12, and after each one the emoji from the table.
- `/publish`. When asked for an icon, send `stickers/pack-icon.png` (100 × 100).
- Give it the short name `hudhud_sal`, so the link is t.me/addstickers/hudhud_sal (if that name is taken, use `auibsal_hudhud`).
- Later changes: `/addsticker` for new ones, `/editsticker` to change an emoji, `/replacesticker` to swap in a redrawn file, `/ordersticker` and `/delsticker`.

**Use**
- Stickers are for chat only: the bot, the members' group and DMs. Don't put them on posters, posts, documents or certificates; use the Mascot files there.
- Telegram asks for one emoji per sticker so people can find it. Pair each with the emoji in the table. That's the only place emoji meet the brand; captions and bot copy stay emoji-free.
- Stickers carry no words, so they work for English and Arabic readers alike. Don't add text to them.
- Hudhud has no hands. Props are held in the beak (pencil, ticket, envelope) or lie on the ground (book, page), drawn in the same flat colors. Raised wings are the folded wing swung up from the shoulder, never a new shape. Hudhud's head is never turned or reshaped: to bow or look down, the whole bird leans. Marks such as Z's, "?", "!" and short sparks are `ink`, `crimson` or `crimson-100` only.
- Never add the Society's symbol or wordmarks to a sticker, and don't make new stickers by redrawing Hudhud. New poses come from the same drawing as the rest.

## Source

`source/` holds the Python that draws every file (needs `cairosvg` and `Pillow`). `finals5.py` draws the standing, reversed and avatar files; `finals6.py` the flying file; `stickers7.py` the stickers. `rig3.py` is the current drawing and builds on `rig2.py`, `rig.py` and `props.py`. New poses are new entries in `stickers7.py`, never redrawn by hand. Hudhud's head is never turned or reshaped: the whole bird leans instead.
