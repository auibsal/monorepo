-- "Tech admin" is retired (fourth prompt, 7r): the role was already named
-- the web lead; its key follows, so no code, test or export says tech_admin.
-- The key is copied, every reference moved, then the old row removed. The
-- assignment triggers are paused for the move: nothing is assigned or ended.

insert into access.roles (key, name_en, name_ar, description, is_council, sort,
  requires_mfa, hiring_owner, name_ar_feminine, kind, retired, requires_mfa_from)
select 'web_lead', name_en, name_ar, description, is_council, sort,
  requires_mfa, hiring_owner, name_ar_feminine, kind, retired, requires_mfa_from
from access.roles where key = 'tech_admin';

update access.role_permissions set role = 'web_lead' where role = 'tech_admin';

alter table access.role_assignments disable trigger user;
update access.role_assignments set role = 'web_lead' where role = 'tech_admin';
alter table access.role_assignments enable trigger user;

update governance.positions set role_key = 'web_lead' where role_key = 'tech_admin';
update programmes.openings set role = 'web_lead' where role = 'tech_admin';

delete from access.roles where key = 'tech_admin';
