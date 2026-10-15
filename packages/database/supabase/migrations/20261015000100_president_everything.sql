-- The President has access to everything (owner, Oct 15, 2026) except what
-- the owner kept with other officers as checks on the President:
--   • concerns.about_president: concerns about the President are routed
--     away from the President (F-20).
--   • journal.review and journal.identity.view: Waraq's reading stays blind;
--     only the Submissions Manager knows who wrote a submission.
--   • elections.manage: the Elections Committee runs elections, not an
--     officer who may stand in them.
--   • spending.countersign and charity.ledger.signoff: the Treasurer's
--     countersignature and ledger sign-off (Bylaws).
--   • certificates.countersign: the Faculty Advisor's countersignature.
-- rbac.test.ts fails if a new permission is not given to the President.

insert into access.role_permissions (role, permission) values
  ('president', 'journal.advise'),
  ('president', 'journal.decide'),
  ('president', 'journal.publish'),
  ('president', 'journal.edit.news'),
  ('president', 'journal.edit.letters'),
  ('president', 'journal.edit.gallery'),
  ('president', 'journal.edit.video'),
  ('president', 'journal.edit.voices'),
  ('president', 'journal.approve'),
  ('president', 'journal.copy'),
  ('president', 'journal.frontpage'),
  ('president', 'charity.ledger.write'),
  ('president', 'governance.minutes.write')
on conflict do nothing;
