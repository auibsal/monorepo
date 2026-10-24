-- One app (owner, Oct 24, 2026): the Nexus is auibsal.org/nexus and the API
-- auibsal.org/api. The two platform policy drafts that named the old hosts
-- now name the paths. Draft text only; the registry status is untouched.
update governance.society_documents
set body_en = replace(
  replace(body_en, 'the Nexus (nexus.auibsal.org)', 'the Nexus (auibsal.org/nexus)'),
  'the Society''s API (api.auibsal.org)', 'the Society''s API (auibsal.org/api)')
where code = 'SAL-PLT-01';

update governance.society_documents
set body_en = replace(
  replace(body_en, 'calls api.auibsal.org.', 'calls the Society''s API at auibsal.org/api.'),
  'The reference is at api.auibsal.org.', 'The reference is at auibsal.org/developers.')
where code = 'SAL-PLT-10';
