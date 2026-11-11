# The stack

Every service the site depends on, with its plan, the account that owns
it, when it renews and how the Society would leave it (decisions.md, The
site: Tools and settings). A new service or add-on that holds data needs a
review first (what, where, privacy terms, cost now and later, owner
account, how to leave), approved by the Director of Media and recorded
here. Each September's feature audit retires what wasn't used.

The tool accounts are owned by the President's AUIB email, with officers
as admins and two-step verification on (decisions.md, Where things live);
they move to Society addresses during 2027. What each service holds is in
`vendors.md`.

| Service | What for | Plan | Renews | How to leave |
|---|---|---|---|---|
| Vercel | Hosting, Web Analytics, Speed Insights | Hobby (free) | No renewal | The app is plain Next.js: deploy it on any Node host; analytics stop |
| Supabase | Database, sign-in, files | Free | No renewal | `pg_dump` (the nightly backup) restores into any Postgres; files from Storage's S3 API |
| Resend | The site's email and the mailing list | Free | No renewal | Any SMTP or API sender: `lib/api` sends through one module; export the audience |
| Cloudflare | DNS, Turnstile, R2 (second backup) | Free | No renewal | Move the DNS zone; Turnstile has drop-in alternatives |
| Domain (auibsal.org) | The address | Registration | Auto-renews; reminders to president@ and the web lead | Transfer to another registrar with the auth code |
| Zoho Mail | The Society's mailboxes and groups | Free | No renewal | Export each mailbox; point MX records elsewhere |
| Notion | The officers' workspace | TODO(content): the plan in use | TODO(content) | Export the workspace (Markdown and CSV) |
| GitHub | The code; the encrypted nightly backup | Free | No renewal | Clone the repository; the backup workflow writes to R2 as well |
| Telegram | Hudhud and the groups | No account plan | No renewal | The bot's token moves with BotFather |
| Google Wallet | The membership card as a pass | No cost | No renewal | Passes keep working until withdrawn; the card is also on the site |

Standing needs if a free limit is reached (decisions.md, Money): Resend
Pro, Supabase Pro and Vercel Pro, asked of Student Life; Vercel Pro also
brings back preview deployments.
