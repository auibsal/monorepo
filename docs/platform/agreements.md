# Agreements and consents: names, not numbers

decisions.md (Documents and forms: "Names, not numbers") retires the
F-numbers and auibsal.org/forms. Each kind of agreement, consent, letter or
record has a stable **name** and **version** (`media-release`, version 1),
which the signature record, `/verify` and the retention rules point to:

- **The kind:** `governance.form_types.key` is the name; `version` is its
  version; `legacy_number` keeps the old F-number, the one-time mapping
  below, so anything signed or shared under it still resolves.
- **Each signing:** its own record number (`form_submissions.reference`,
  AGR-<year>-<four digits>, given on signing) and a verification code
  (`verification_code`), both on the signer's copy and its email;
  `/verify/<code>` shows the kind, version, record number, signer, date and
  fingerprint (`governance.verify_agreement`), never the answers.
- **Addresses:** every shared `/forms` address (`/forms/21`, `/forms/F-21`,
  `/forms/f21`, `/forms/f-21`, and `/forms/<name>`) redirects (308) to the
  kind's place in its flow (`formRedirects` in `lib/data/form-paths.ts`);
  `/forms` itself goes to Your account → Record, where signed copies are kept.
- **The register:** the Leadership Handbook's register is "Agreements and
  consents" (SAL-EXB-01), by name, one toggle per kind headed
  "<name> · <Title>"; `bun run check:forms` compares it with the site.

## The one-time mapping

F-08, F-22, F-31 and F-44 were retired before this change and have no
name.

| Old number | Name | Title | Signed |
|---|---|---|---|
| F-01 | `role-application` | Role application | In its page on the site |
| F-02 | `interview-score-sheet` | Interview score sheet | In its page on the site |
| F-03 | `appointment-letter` | Appointment letter | Notion template |
| F-04 | `role-holder-checklist` | New role holder’s checklist | In its page on the site |
| F-05 | `service-letter` | Service letter | Notion template |
| F-06 | `conflict-of-interest-declaration` | Conflict-of-interest declaration | `/account/settings/disclosures/declare` |
| F-07 | `handover` | Handover page | Notion template |
| F-09 | `council-minutes` | Council meeting agenda and minutes | Notion template |
| F-10 | `members-meeting-motion` | Motion for a members’ meeting | `/account/elections/motion` |
| F-11 | `event-pitch` | Event pitch | `/get-involved/propose-an-event` |
| F-12 | `event-plan` | Event plan and risk check | Notion template |
| F-13 | `event-debrief` | Event debrief | Notion template |
| F-14 | `semester-report` | Semester report | Notion template |
| F-15 | `media-release` | Media release | `/consent/media-release` |
| F-16 | `incident-report` | Incident report | Notion template |
| F-17 | `partnership-memorandum` | Partnership memorandum | `/partners/dashboard/memorandum/sign` |
| F-18 | `needs-list` | Needs list | Notion template |
| F-19 | `student-life-request` | Request to Student Life | Notion template |
| F-20 | `charity-collection-count` | Charity collection count and handover | On paper |
| F-21 | `concern` | Concern | `/about/contact/concern` |
| F-23 | `tour-tally` | Tour tally | Notion template |
| F-24 | `audition-form` | Audition form | In its page on the site |
| F-25 | `audition-score-sheet` | Audition score sheet | In its page on the site |
| F-26 | `company-agreement` | Company agreement | `/company/agreement` |
| F-27 | `stage-risk-checklist` | Stage manager’s risk checklist | Notion template |
| F-28 | `rights-request-letter` | Rights request letter | Notion template |
| F-29 | `faculty-advisor-invitation` | Faculty Advisor invitation | Notion template |
| F-30 | `thank-you-letter` | Thank-you to a partner or sponsor | Notion template |
| F-32 | `application-outcome` | Application outcome | Notion template |
| F-33 | `welcome-letter` | Welcome to new members | Notion template |
| F-34 | `honorary-membership-invitation` | Honorary Membership invitation | Notion template |
| F-35 | `members-meeting-notice` | Notice of a members’ meeting | Notion template |
| F-36 | `election-notice` | Notice of election | Notion template |
| F-37 | `qalam-mentor-agreement` | Qalam mentor agreement | `/get-involved/qalam-mentor-agreement` |
| F-38 | `qalam-parent-consent` | Qalam parental consent | `/consent/qalam` |
| F-39 | `qalam-publishing-consent` | Qalam publishing consent | `/consent/qalam-publishing` |
| F-40 | `confidentiality-agreement` | Confidentiality pledge | In its page on the site |
| F-41 | `reader-score-sheet` | Reader score sheet | In its page on the site |
| F-42 | `author-letters` | Author letters | In its page on the site |
| F-43 | `publication-agreement` | Publication Agreement | In its page on the site |
| F-45 | `trip-consent` | Trip consent | `/consent/trip` |
| F-46 | `parent-consent` | Parent’s consent for a member under 18 | `/consent/parent` |
