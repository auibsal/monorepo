# MTA-STS

The MTA-STS policy for auibsal.org's mail (RFC 8461), served by a Cloudflare Worker at `https://mta-sts.auibsal.org/.well-known/mta-sts.txt` (decisions.md §13 and §14). It tells other mail servers to deliver to Zoho's servers (`mx.zoho.com`, `mx2.zoho.com`, `mx3.zoho.com`) only over verified TLS.

- **Deploys:** Cloudflare Workers Builds builds this folder on every push to `main` that changes it. The settings are root directory `infra/mta-sts`, no build command, deploy command `npx wrangler deploy`, and watch path `infra/mta-sts/*`. The custom domain comes from `wrangler.jsonc`.
- **The DNS records** (in Cloudflare): `_mta-sts` TXT `v=STSv1; id=…` and `_smtp._tls` TXT `v=TLSRPTv1; rua=mailto:tls-reports@auibsal.org`. The custom domain creates the `mta-sts` record and its certificate.
- **Changing the policy:** edit `src/index.js`, merge, then give the `_mta-sts` record a new id (the date and time, such as `id=20261209T0000`). Mail servers fetch the policy again only when the id changes.
- **The mode:** `testing` first, reporting to tls-reports@ without refusing mail. After two weeks of clean reports it becomes `enforce`, with `max_age: 1209600`.
- **If Zoho's mail servers change,** update the `mx:` lines before changing the MX records.
