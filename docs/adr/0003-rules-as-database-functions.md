# 0003. Multi-step rules are Postgres functions

Status: Accepted

## Context

Booking with a waitlist, casting a ballot, deciding a submission and
issuing a numbered record each touch several rows that must change
together, and several clients (the site, the Diwan, Hudhud) perform them.

## Decision

Each is one `SECURITY DEFINER` function in the `private` schema that
checks permissions itself, called through a `SECURITY INVOKER` wrapper of
the same signature in an exposed schema.

## Consequences

The rule lives in one place and holds whichever client calls it. Every
such function needs pgTAP tests, and the Supabase advisors must stay at
zero findings.
