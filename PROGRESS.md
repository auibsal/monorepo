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
- [ ] Still in two places: Notion's Meetings rows hold a meeting's date
  (When) beside its event's; the event's day now wins when a row links its
  event, but a meeting with no event row is dated from Notion.
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
- [ ] **The team list** as one component: the Council page with covering,
  Our people, the masthead, Next Stop's credits, the Company's playbills,
  an event's lead and team.
- [ ] **The staging loop:** create, publish and edit an event and a
  document from Notion once a staging URL and its keys exist.
- [ ] **Unused API functions with tests:** `governance.council_members`
  (the Council page uses `council_seats`), `core.current_term`,
  `core.pledge_versions`, `core.my_topics`, `core.is_partner_guest`,
  `access.two_step_from`, `journal.accepted_unplaced`,
  `journal.is_edition_desk` and `programs.shift_places` are called by no
  page; drop each with its pgTAP assertions, or give it its page.
- [ ] **The promo kit to the screening kit's files:** once the owner sends
  them, match each layout's sizes and type to the reference (the kit
  builds every piece from the event's fields and its Program today).
