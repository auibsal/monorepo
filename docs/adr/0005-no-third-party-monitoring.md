# 0005. No third-party monitoring, analytics cookies or protection

Status: Accepted (November 7, 2026)

## Context

Error trackers, tag managers and bot-protection services each add a
vendor that sees members' requests, a cookie banner, a bill and a setting
to keep up.

## Decision

Errors and logs go to the Vercel runtime log (`lib/observability`).
Analytics are Vercel Web Analytics, which sets no cookies. The security
headers and CSP are the app's own (`lib/security`); public forms are
rate limited in the database and checked with Cloudflare Turnstile.

## Consequences

No cookie banner and fewer vendors in the Privacy Notice
(`docs/platform/vendors.md`). Failures surface through the logs, the daily
cron-health email and `/api/health`, not a dashboard.
