# Security Policy

## Supported Versions

Security updates and patches are exclusively provided for the current production deployment branch of the AUIB Society of Arts and Letters monorepo. GitHub automatically parses this table for dependency alerts.

| Version | Branch | Supported          |
| ------- | ------ | ------------------ |
| v1.x.x  | `main` | :white_check_mark: |
| Pre-v1  | `dev`  | :x:                |

## Reporting a Vulnerability

We take the security of our platform and the data of our members very seriously. **Please do not report security vulnerabilities through public GitHub issues, discussions, or pull requests.**

Instead, please report them directly via email to: **security@auibsal.org**

When reporting, please include:
- A detailed description of the vulnerability.
- Step-by-step instructions to reproduce the issue.
- The potential impact on the system or user data.
- Any suggested mitigations or patches (if applicable).

You should expect a response within 48 hours acknowledging receipt of the vulnerability report. We will prioritize the investigation, patching, and secure deployment of any confirmed security issues prior to any public disclosure.

## Out of Scope

The following items are strictly out of scope for this disclosure policy:
- Volumetric/Denial of Service (DoS/DDoS) attacks.
- Vulnerabilities within third-party managed infrastructure (e.g., Supabase, Vercel, Stripe). Please report these directly to the respective vendors.
- Spam, social engineering, or phishing attacks against platform members.
