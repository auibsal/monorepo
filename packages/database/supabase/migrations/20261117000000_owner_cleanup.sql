-- Approved by the owner (decisions.md, Documents and forms: "Cleanup, list
-- first"): the four signed records AGR-2026-0045 to AGR-2026-0048, all the
-- owner's own, are deleted by name, with the one role agreement row that
-- points at them and the one memorandum, a draft never sent. The two tables
-- stay: access.role_agreements is how a role agreement is signed today and
-- governance.partner_agreements is the register of memoranda. The current
-- role agreement and conflict-of-interest declaration then show on the
-- owner's Today, to sign fresh; AGR numbers keep counting up
-- (private.next_code) and are never reused.

delete from access.role_agreements
where submission_id in (
  select id from governance.form_submissions
  where reference in ('AGR-2026-0045', 'AGR-2026-0046', 'AGR-2026-0047', 'AGR-2026-0048')
);

delete from governance.form_submissions
where reference in ('AGR-2026-0045', 'AGR-2026-0046', 'AGR-2026-0047', 'AGR-2026-0048');

delete from governance.partner_agreements
where id = 'fd537566-e2c9-4d23-a207-3df9e7354b3c' and status = 'draft';
