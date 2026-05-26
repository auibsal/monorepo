# Security Policy

## Supported Versions

Security updates and patches are exclusively provided for the current production deployment branch of the AUIB Society of Arts and Letters monorepo.

| Version | Branch | Supported          |
| :------ | :----- | :----------------- |
| v1.x.x  | `main` | :white_check_mark: |
| Pre-v1  | `dev`  | :x:                |

## Reporting a Vulnerability

We take the security of our platform and the data of our members very seriously. **Please do not report security vulnerabilities through public GitHub issues, discussions, or pull requests.**

### Private Reporting

You can report security vulnerabilities privately via:

1.  **GitHub Private Vulnerability Reporting**: Use the "Report a vulnerability" button in the "Security" tab of the repository.
2.  **Email**: Send reports directly to **security@auibsal.org**.

When reporting, please include:

- A detailed description of the vulnerability.
- Step-by-step instructions to reproduce the issue.
- The potential impact on the system or user data.
- Suggested mitigations or patches (if applicable).

### Response & Disclosure

- **Acknowledgment**: You will receive a response within 48 hours acknowledging receipt of your report.
- **Coordination**: We will prioritize investigation and patching. We request that researchers keep the report confidential until a fix is deployed.
- **Disclosure**: We commit to a coordinated disclosure timeline of 90 days following a patch deployment.

## Out of Scope

The following items are strictly out of scope for this policy:

- Volumetric/Denial of Service (DoS/DDoS) attacks.
- Vulnerabilities within third-party managed infrastructure (e.g., Supabase, Vercel, Stripe). Please report these directly to the respective vendors.
- Spam, social engineering, or phishing attacks against platform members.

---

## Content Security Policy (CSP) Architecture

The AUIB Society of Arts and Letters application employs a strictly-typed Content Security Policy (CSP) injected at the edge via Next.js Middleware.

Our policy is designed to achieve maximum protection against Cross-Site Scripting (XSS) and data injection attacks while maintaining full compatibility with the Next.js 15 App Router and Supabase capabilities.

### The Active Policy

\`\`\`http
Content-Security-Policy:
default-src 'self';
script-src 'self' 'nonce-{dynamic}' 'strict-dynamic';
style-src 'self' 'unsafe-inline';
connect-src 'self' _.supabase.co;
img-src 'self' data: blob: _.supabase.co;
frame-src 'self' _.supabase.co;
\`\`\`
_(Note: During local development \`NODE_ENV === 'development'\`, \`'unsafe-eval'\` is appended to \`script-src\` strictly to allow the Turbopack/Next.js Hot Module Replacement engine to function. This is automatically stripped in production builds.)\*

### Directive Breakdown

| Directive           | Policy                                        | Security Rationale                                                                                                                                                                                 |
| :------------------ | :-------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **\`default-src\`** | \`'self'\`                                    | The default fallback. Blocks all unknown external scripts, fonts, and media from loading unless explicitly whitelisted below.                                                                      |
| **\`script-src\`**  | \`'self' 'nonce-{dynamic}' 'strict-dynamic'\` | Next.js natively mints a cryptographic nonce per-request. \`'strict-dynamic'\` ensures that only scripts trusted by the Next.js compiler (and scripts they natively spawn) are allowed to execute. |
| **\`style-src\`**   | \`'self' 'unsafe-inline'\`                    | Required by the Tailwind v4 CSS-in-JS variables and Next.js inline style engine to paint the initial brutalist DOM without render-blocking.                                                        |
| **\`connect-src\`** | \`'self' \*.supabase.co\`                     | Permits the browser to make secure WebSocket and REST API calls to our backend Supabase cluster for authentication and database interactions.                                                      |
| **\`img-src\`**     | \`'self' data: blob: \*.supabase.co\`         | Allows first-party images, base64 placeholders (\`data:\`), blob URLs (for client-side file previews before upload), and images hosted in Supabase Storage buckets.                                |
| **\`frame-src\`**   | \`'self' \*.supabase.co\`                     | Prevents Clickjacking. Only permits framing from our own domain and secure Supabase endpoints (e.g., for OAuth popup flows).                                                                       |
