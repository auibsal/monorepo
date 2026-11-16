/**
 * The MTA-STS policy (RFC 8461) for mail to @auibsal.org, served at
 * https://mta-sts.auibsal.org/.well-known/mta-sts.txt: a sending server
 * delivers only over TLS to these MX hosts (Zoho's), with a valid
 * certificate, so a message can't be read or redirected on the way.
 * Cloudflare has no free way to serve it, so the site does
 * (app/.well-known/mta-sts.txt; docs/platform/settings.md, Email).
 *
 * `testing` first: failures are only reported (TLS-RPT, `_smtp._tls`);
 * `enforce` once two weeks of reports are clean. Each change here needs a
 * new `id` in the `_mta-sts` TXT record, or senders keep the old policy.
 */
const MTA_STS_MODE: "testing" | "enforce" = "testing";

/** The MX records' hosts, exactly as in DNS. */
export const MTA_STS_MX = ["mx.zoho.com", "mx2.zoho.com", "mx3.zoho.com"];

/** The policy file's text: the standard's lines, CRLF. */
export const mtaStsPolicy = () =>
  [
    "version: STSv1",
    `mode: ${MTA_STS_MODE}`,
    ...MTA_STS_MX.map((host) => `mx: ${host}`),
    // A week; RFC 8461 allows up to a year once the policy is enforced.
    "max_age: 604800",
    "",
  ].join("\r\n");
