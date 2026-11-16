# 0009. Cloudflare first at the edge; one place for each thing

Status: Accepted (November 16, 2026). Amends [0005](0005-no-third-party-monitoring.md).

## Context

Cloudflare already sits in front of the site (proxied DNS, TLS, the WAF).
Several things it offers as settings were also done in the site's code
(HSTS, security.txt, a report address for blocked scripts, the list of AI
crawlers in robots.txt), and some were done twice across platforms
(retention scheduled by Vercel and by pg_cron; auth email set up through
both a hook and SMTP).

## Decision

What a platform does natively, it does, and the site does not repeat it,
unless the platform's version is capped or the site's is better. At the
edge that is Cloudflare: TLS and HSTS, security.txt, the WAF and DDoS
protection, bots and AI crawlers (with its managed robots.txt), and script
monitoring (Page Shield), which 0005 did not foresee. The site keeps what
needs the page or the database: the CSP with each request's nonce, the
other response headers, Turnstile's check, and rate limits per form and per
account. Every setting is listed in `docs/platform/settings.md`.

## Consequences

Each thing lives in one place, and the dashboard settings are part of the
platform: a change there is recorded in `settings.md` like a change in
code. Cloudflare's free plan sets the limits: Bot Fight Mode stays off
(it cannot exempt the webhooks), and JavaScript Detections stays on (it
has no switch below the paid plans).
