// The MTA-STS policy for auibsal.org (RFC 8461), served at
// https://mta-sts.auibsal.org/.well-known/mta-sts.txt. It tells other mail
// servers to deliver to Zoho's servers only over verified TLS.
//
// Mode: "testing" reports problems to tls-reports@ (the _smtp._tls record)
// without refusing mail; after two weeks of clean reports it becomes
// "enforce" with max_age 1209600. Each change to the policy needs a new id
// in the _mta-sts TXT record in Cloudflare's DNS.
const POLICY = `${[
  "version: STSv1",
  "mode: testing",
  "mx: mx.zoho.com",
  "mx: mx2.zoho.com",
  "mx: mx3.zoho.com",
  "max_age: 86400",
].join("\r\n")}\r\n`;

const PATH = "/.well-known/mta-sts.txt";

export default {
  fetch(request) {
    const { pathname } = new URL(request.url);
    if (pathname !== PATH) {
      return new Response("Not found", { status: 404 });
    }
    return new Response(POLICY, {
      headers: {
        "cache-control": "public, max-age=3600",
        "content-type": "text/plain; charset=utf-8",
      },
    });
  },
};
