# 0001. One app

Status: Accepted (October 24, 2026)

## Context

The public site, the members' pages, the Diwan and the API began as
separate projects on separate hosts. Every change touched several
deployments, sign-in crossed origins, and the Society has no developer on
call to keep them in step.

## Decision

One Next.js app, `apps/web`, deployed once to auibsal.org: the public site
at `/`, your account under `/account`, the Diwan under `/diwan` and the
API under `/api`. Shared code lives in `packages/*` as `@repo/<name>`.

## Consequences

One build, one origin, one session cookie and no CORS between our own
parts. The bundle for the public pages must stay small even though the
Diwan's code sits beside it, which the performance budget in
`apps/e2e/tests/performance.spec.ts` enforces.
