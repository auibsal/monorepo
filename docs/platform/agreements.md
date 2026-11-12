# Agreements and consents: names, not numbers

decisions.md (Documents and forms: "Names, not numbers") retires the
F-numbers and auibsal.org/forms. Each kind has a stable **name** and
**version** (`media-release`, version 1), which the signature record,
`/verify` and the retention rules point to:

- **The kind:** `governance.form_types.key` is the name and `version` its
  version. `legacy_number` keeps the old F-number, the one-time mapping
  below, so anything signed or shared under it still resolves.
  `in_register` marks the kinds people sign.
- **Each signing:** its own record number (`form_submissions.reference`,
  AGR-<year>-<four digits>, given on signing) and a verification code
  (`verification_code`), both on the signer's copy and its email.
  `/verify/<code>` shows the kind, version, record number, signer, date and
  fingerprint (`governance.verify_agreement`), never the answers. Signed
  copies are kept in Your account → Documents (`/account/documents`, each at
  `/account/documents/signed/<id>`), the countersigner's too. Consent to
  sign electronically (E-SIGN) is asked once for the account, on its own
  line at sign-up or at the next sign-in for older accounts, and can be
  withdrawn in Settings (`core.profiles.esign_agreed_at`).
- **Addresses:** every shared `/forms` address (`/forms/21`, `/forms/F-21`,
  `/forms/f21`, `/forms/f-21` and `/forms/<name>`) redirects (308) to the
  kind's place in its flow (`formRedirects` in `lib/data/form-paths.ts`).
  `/forms` itself, and any other old form address, goes to Documents.

## The register

The Leadership Handbook's register, "Agreements and consents"
(SAL-EXB-01), holds only what people sign, every one signed on the site:
one toggle per kind, headed "<name> · <Title>", titles in sentence case
("Publication agreement"). `bun run check:forms` compares it with the kinds marked
`in_register` (`registerKinds` in `lib/data/forms.ts`).

| Name | Title | Old number | Signed |
|---|---|---|---|
| `code-of-conduct` | Code of Conduct (a proper name, kept) | none | On joining (sign-up) |
| `role-agreement` | Role agreement | none | On accepting a role, from Today |
| `conflict-of-interest-declaration` | Conflict-of-interest declaration | F-06 | `/account/settings/disclosures/declare` |
| `confidentiality-agreement` | Confidentiality pledge | F-40 | The reading page |
| `handover` | Handover | F-07 | `/account/roles/handover`, on leaving a role; countersigned by the incoming holder or the seat’s officer |
| `members-meeting-motion` | Motion for a members’ meeting | F-10 | `/account/elections/motion` |
| `event-pitch` | Event pitch | F-11 | `/get-involved/propose-an-event` |
| `concern` | Concern | F-21 | `/about/contact/concern` |
| `media-release` | Media release | F-15 | `/consent/media-release` |
| `partnership-memorandum` | Partnership memorandum | F-17 | `/partners/dashboard/memorandum/sign` |
| `company-agreement` | Company agreement | F-26 | `/company/agreement` |
| `publication-agreement` | Publication agreement | F-43 | Your account → Work, on acceptance |
| `trip-consent` | Trip consent | F-45 | `/consent/trip` |
| `parent-consent` | Parent’s consent for a member under 18 | F-46 | `/consent/parent` (a parent’s single-use link) |
| `qalam-mentor-agreement` | Qalam mentor agreement | F-37 | `/get-involved/qalam-mentor-agreement` |
| `qalam-parent-consent` | Qalam parental consent | F-38 | `/consent/qalam` (each parent’s single-use link) |
| `qalam-publishing-consent` | Qalam publishing consent | F-39 | `/consent/qalam-publishing` (each parent’s single-use link) |

## The templates index

Letters, notices, minutes, score sheets, reports, lists and checklists
keep stable names too but are templates or records, never in the register.

| Name | Title | Old number | Kept |
|---|---|---|---|
| `role-application` | Role application | F-01 | In its page on the site |
| `interview-score-sheet` | Interview score sheet | F-02 | In its page on the site |
| `appointment-letter` | Appointment letter | F-03 | Notion template, sent on the one letter template |
| `role-holder-checklist` | New role holder’s checklist | F-04 | In its page on the site |
| `service-letter` | Service letter | F-05 | On the site, from the record |
| `council-minutes` | Council meeting agenda and minutes | F-09 | Notion template |
| `event-plan` | Event plan and risk check | F-12 | Notion template |
| `event-debrief` | Event debrief | F-13 | Notion template |
| `semester-report` | Semester report | F-14 | Notion template |
| `incident-report` | Incident report | F-16 | Notion template |
| `needs-list` | Needs list | F-18 | Notion template |
| `student-life-request` | Request to Student Life | F-19 | Notion template |
| `charity-collection-count` | Charity collection count and handover | F-20 | On paper |
| `tour-tally` | Tour tally | F-23 | Notion template |
| `audition-application` | Audition application | F-24 | In its page on the site |
| `audition-score-sheet` | Audition score sheet | F-25 | In its page on the site |
| `stage-risk-checklist` | Stage manager’s risk checklist | F-27 | Notion template |
| `rights-request-letter` | Rights request letter | F-28 | Notion template |
| `faculty-advisor-invitation` | Faculty Advisor invitation | F-29 | Notion template |
| `thank-you-letter` | Thank-you to a partner or sponsor | F-30 | Notion template |
| `application-outcome` | Application outcome | F-32 | Notion template |
| `welcome-letter` | Welcome to new members | F-33 | Notion template |
| `honorary-membership-invitation` | Honorary membership invitation | F-34 | Notion template |
| `members-meeting-notice` | Notice of a members’ meeting | F-35 | Notion template |
| `election-notice` | Notice of election | F-36 | Notion template |
| `reader-score-sheet` | Reader score sheet | F-41 | In its page on the site |

## Retired numbers

F-08, F-22, F-31 and F-44 were retired before the names. F-42, the
"author letters" (the letters to a Write for Qirtas author about a
decision), retired with the names: the site sends those as its decision
emails (`qirtas.decision`). Their old `/forms` addresses go to Documents.
