# Analytics

The public site counts visits with **Vercel Web Analytics**, which sets no
cookies and keeps no personal data (decisions, Nov 7, 2026). There is no
Google Tag Manager, no Google Analytics and no cookie banner. The members'
pages and the Diwan are not counted.

## How it works

- `<Analytics />` from `@vercel/analytics/next` is in the public site's
  layout (`app/[locale]/(site)/layout.tsx`). Its script and its reports
  are served from the site's own origin (`/_vercel/insights/*`), so the
  Content Security Policy needs nothing added.
- Page views only; there are no custom events.

## To turn it on

In Vercel: the project → Analytics → Enable. Nothing is set in the
environment.

## The cookies the site sets

For the Privacy Notice (SAL-GOV-04), the only cookies are:

| Cookie | What it is for | How long |
| --- | --- | --- |
| The Supabase session (`sb-…-auth-token`) | Staying signed in | Until sign-out or expiry |
| `NEXT_LOCALE` | The language chosen | One year |
| `sal_theme` | Light or dark, when chosen in the header | One year |

None is used for analytics or advertising.
