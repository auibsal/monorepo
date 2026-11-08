# Architecture decisions

Short records of the technical choices behind auibsal.org: what was
decided, why, and what it costs. The Society's own decisions (who does
what, what the site offers) are in `claude/decisions.md`; these are only
the technical ones. A new choice gets the next number; a reversed one is
marked Superseded with a link to the record that replaces it.

| No. | Decision | Status |
| --- | --- | --- |
| [0001](0001-one-app.md) | One Next.js app for the site, your account, the Diwan and the API | Accepted |
| [0002](0002-rls-is-the-boundary.md) | Row Level Security is the security boundary | Accepted |
| [0003](0003-rules-as-database-functions.md) | Multi-step rules are Postgres functions | Accepted |
| [0004](0004-notion-writes-the-site-publishes.md) | Notion is where the work is written; the site publishes it | Accepted |
| [0005](0005-no-third-party-monitoring.md) | No third-party monitoring, analytics cookies or protection | Accepted |
| [0006](0006-email-through-an-outbox.md) | Email goes through a database outbox; mail to many as Broadcasts | Accepted |
| [0007](0007-migrations-ship-through-ci.md) | Migrations ship through CI, in order | Accepted |
| [0008](0008-one-error-shape.md) | One error shape for the API (RFC 9457) | Accepted |
