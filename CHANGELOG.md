# Changelog

The platform of the AUIB Society of Arts and Letters, auibsal.org. Each
release is tagged in git (`v1.0.0`, …); the Society's documents keep their
own versions in the Library.

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
