# SAL platform: progress

The working checklist for auibsal.org. Every session starts here, after
`claude/decisions.md` and `claude/glossary_ar.md` (the read-only mirror of
the owner's files), and continues from the first open item. It keeps only
open code work (decisions.md, How the Society works: tasks): what is done
lives in git and the merged pull requests, the owner's steps go in each pull
request's report and become tasks in Notion, and nothing here describes a
setting that is off or a weakness not yet fixed.

Branch: `claude/new-session-qosn60`, one pull request per prompt.

## Open

- [ ] **MTA-STS:** the policy's `mode` in `infra/mta-sts/src/index.js`
  moves to `enforce` on or after Monday, November 30, with a new `id` in
  `_mta-sts` (infra/mta-sts/README.md).
- [ ] Events have no short address of their own (decisions.md lists
  /haven, /tour and /join); the kit prints and encodes the event's own
  address, auibsal.org/events/<slug>, until one is decided.
- [ ] TODO(content): Edition 1's title (its theme), proposed by the
  Editor-in-Chief and approved with the Managing Editor before Mon, Dec 7; the Desk
  shows it as a to-do. Then set Edition 1's deadline on its Call tab and
  publish the call.
- [ ] **End the President test period** when the owner says it is over:
  one migration closes it; restore the President test in
  `lib/rbac/rbac.test.ts` and `roles.ts`; drop the set-aside block from
  `95_journal_pipeline`, `99_president_absence`,
  `99_qirtas_by_the_decisions` and `99_two_officers`, and
  `99_president_temporary.test.sql`; restore `private.second_officer()` and
  `private.has_permission()` and drop `private.is_president()`.
- [ ] **The team list** on the pages still to come: a production's
  playbill on the Company's page and an event's lead and "With" team,
  each drawn by `TeamList` (`components/team-list.tsx`).
- [ ] **The staging loop:** create, publish and edit an event and a
  document from Notion once a staging URL and its keys exist.
- [ ] **The promo kit to the screening kit's files:** once the owner sends
  them, match each layout's sizes and type to the reference (the kit
  builds every piece from the event's fields and its Program today).
- [ ] **Rename `journal` to `qirtas`** and `journal.issues` to
  `qirtas.editions`, in a pull request of its own once the owner approves
  the plan in prompt 26's report.
- [ ] **Record pages** for requests to Student Life and disclosures, which
  still open on their lists (decisions.md, The site: One record page).
- [ ] **Autosave** on the remaining long forms (an event's sections, a
  piece's text, an opening), with `useAutosave` as the announcement editor
  and the Edition call form use it.
