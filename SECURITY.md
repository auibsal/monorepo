# Security Policy

## Supported Versions

Security updates and patches are exclusively provided for the current production deployment branch of the AUIB Society of Arts and Letters monorepo.

| Version | Branch | Supported |
| :--- | :--- | :--- |
| v1.x.x | `main` | :white_check_mark: |
| Pre-v1 | `dev` | :x: |

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
