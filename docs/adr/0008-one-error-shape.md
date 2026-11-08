# 0008. One error shape for the API (RFC 9457)

Status: Accepted (November 8, 2026)

## Context

The API routes answered errors as plain text, as `{ error }` JSON or in
their own shapes, and each route had its own JSON helper.

## Decision

Every error is RFC 9457 problem details (`application/problem+json`, from
`lib/api/problem.ts`), carrying the route's short code in `error`. Shared
secrets are checked by one constant-time helper, `hasBearer`. Webhooks live
under `/api/hooks/*` and scheduled jobs under `/api/cron/*`.

## Consequences

Clients read one field (`error`) whatever the route. A new route uses
`respond(headers)` for its replies.
