# Analytics

The public site counts visits with **Vercel Web Analytics**, cookieless,
and nothing else (decisions §6; Speed Insights was removed on Nov 11).
It sets no cookies and keeps no personal data.
There is no Google Tag Manager, no Google Analytics and no cookie banner.
The members' pages and the Diwan are not counted or measured.

## How it works

- `<Analytics />` from `@vercel/analytics/next` is in the public site's
  layout (`app/[locale]/(site)/layout.tsx`). Its script and reports are
  served from the site's own origin (`/_vercel/insights/*`), so the
  Content Security Policy needs nothing added.
- Page views only; there are no custom events.

## To turn it on

In Vercel: the project → Analytics → Enable. Speed Insights stays off.
Nothing is set in the environment.

## The cookies the site sets

For the Privacy Notice (SAL-GOV-04), the only cookies are:

| Cookie | What it is for | How long |
| --- | --- | --- |
| The Supabase session (`sb-…-auth-token`) | Staying signed in | Until sign-out or expiry |
| `NEXT_LOCALE` | The language of the page opened | The browser session |
| `sal_theme` | Light or dark, when chosen in the header | One year |

None is used for analytics or advertising. Whether the header offers the
Diwan or a partner's dashboard is kept in local storage (`sal_ways`), not
a cookie; so is the progress in the daily games.
