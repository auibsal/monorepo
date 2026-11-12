-- TEMPORARY (the owner's ask): the President holds every permission, to
-- see, test, edit and submit everything on the site while it is set up.
--
-- This lifts, for the President only, the checks decisions.md keeps on the
-- seat: Qirtas's independence and blind review (journal.*, qalam.manage,
-- journal.identity.view), concerns about the President, the Elections
-- Committee's elections, the Faculty Advisor's countersignature, Next
-- Stop's guest ideas and a partner's own page. Nothing else changes: the
-- second-officer rule, two-step sign-in and RLS on people's own rows stay.
-- While the President is recorded absent, the Vice President holds these
-- too (private.has_permission).
--
-- To undo, delete exactly these rows in a new migration:
--   delete from access.role_permissions where role = 'president'
--     and permission in (<the list below>);

insert into access.role_permissions (role, permission) values
  ('president', 'certificates.countersign'),
  ('president', 'concerns.about_president'),
  ('president', 'elections.manage'),
  ('president', 'journal.advise'),
  ('president', 'journal.approve'),
  ('president', 'journal.copy'),
  ('president', 'journal.decide'),
  ('president', 'journal.edit.gallery'),
  ('president', 'journal.edit.games'),
  ('president', 'journal.edit.letters'),
  ('president', 'journal.edit.news'),
  ('president', 'journal.edit.video'),
  ('president', 'journal.edit.voices'),
  ('president', 'journal.frontpage'),
  ('president', 'journal.identity.view'),
  ('president', 'journal.manage'),
  ('president', 'journal.prize'),
  ('president', 'journal.publish'),
  ('president', 'journal.review'),
  ('president', 'media.guest_ideas'),
  ('president', 'partners.lead'),
  ('president', 'partners.own'),
  ('president', 'qalam.manage')
on conflict do nothing;
