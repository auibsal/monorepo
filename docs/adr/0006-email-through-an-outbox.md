# 0006. Email goes through a database outbox; mail to many as Broadcasts

Status: Accepted

## Context

Emails follow from database changes (a booking, a decision), and must be
sent once, survive a failed send and stay within Resend's free plan of 100
emails a day.

## Decision

Database functions write rows to `core.outbox`; a webhook and a
ten-minute drain send them through Resend with an idempotency key per row.
Mail to many people (the Sunday Paper, the invitations) goes as a Resend
Broadcast to a fresh segment, which does not count against the daily
limit.

## Consequences

Sending is retried and never doubled. Each email kind is a handler in
`lib/api/outbox.ts` with its copy in `@repo/email/copy`, and a new one
needs both.
