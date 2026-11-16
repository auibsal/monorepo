# Security policy

The Society's Vulnerability Disclosure Policy (SAL-GOV-07, based on the
template of the US Cybersecurity and Infrastructure Security Agency) is at
<https://auibsal.org/security>. This file sums it up; the policy is the
one that governs.

## Reporting a vulnerability

Write to **security@auibsal.org**, the contact in
<https://auibsal.org/.well-known/security.txt>. Please do not open a public
issue. You may report anonymously. Tell us where the weakness is, what it
could affect, and how to reproduce it (a proof of concept or screenshots
help), and leave out anyone else's personal data.

## What you can expect from us

- We acknowledge your report within three business days.
- We confirm whether the weakness exists and keep you informed as we fix it.
- Research that follows the policy in good faith is authorized: we will not
  recommend or pursue action against you.

## Coordinated disclosure

Give us reasonable time to fix an issue before you tell anyone else. Once
you have confirmed a weakness, or if you reach personal or confidential
data, stop testing, tell us at once, and do not share the data.

## Scope

In scope: auibsal.org (the public site, your account, the Diwan, the partner
dashboard and the API), Hudhud (the Society's Telegram bot), and the emails
sent from auibsal.org and news.auibsal.org. Out of scope: the platforms the
Society uses (Vercel, Supabase, Resend, Cloudflare, Zoho, Notion, Telegram
and Google), which have their own programs, and every University system.
Denial-of-service, physical and social-engineering testing are not
authorized.

## Supported versions

Only what runs at auibsal.org, built from the default branch, receives
security fixes.
