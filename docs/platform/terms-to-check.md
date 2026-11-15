# Terms to check

The weekly scan of Notion's documents (`apps/web/lib/api/notion/scan.ts`)
lists every document page that uses one of these terms, for the
document's keeper (the seat in its Owner) on the Desk. They are not
retired names (decisions.md, Retired names, which the scan also looks
for), but words the Society stopped using in documents:

- general submissions
- themed call
- standing call
- Held with
- Supported by
- With the support of
- Write for Qirtas
- pilot issue

The scan also lists personal data, which never belongs in Notion
(decisions.md, Where things live): email addresses, phone numbers,
numbers that look like an ID, and names from the Register.

The list in code is `TERMS_TO_CHECK` in `apps/web/lib/data/retired-names.ts`;
a test keeps it the same as this page. The quarterly sweep of Notion is
now a check that the Desk's list of findings is empty.
