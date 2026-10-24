-- Every Society document is in force as Version 1 (owner, Oct 24, 2026:
-- "make everything already ratified and published … version 1"). Statuses
-- and codes stay in the registry for administrators; the site and the
-- members' library no longer show them. The cover lines inside the texts
-- that said "1.0 (draft)" now say "1.0".
update governance.society_documents set
  status = 'adopted',
  version = 'Version 1',
  adopted_on = coalesce(adopted_on, date '2026-10-24'),
  ratification = null,
  body_en = replace(body_en, '1.0 (draft)', '1.0'),
  body_ar = replace(body_ar, '1.0 (draft)', '1.0')
where status <> 'superseded';
