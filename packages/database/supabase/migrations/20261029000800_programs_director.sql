-- Roles (owner, Oct 29, 2026).
--
-- * The Director of Programs holds the program permissions for every
--   program: the Program Lead's bundle, everywhere, with a director's seat
--   on the Council. Directors with other portfolios don't manage programs
--   (the Director role carries no program permissions).
-- * Program Leads are scoped to one program (as assigned, scope
--   'programme').
-- * The "Director of the Company" title is removed: the Company's lead is
--   a Program Lead for the Company, titled "Artistic Director". A director
--   who held that title becomes the Company's Artistic Director and leaves
--   the director's seat.
-- * "Programme Lead" is "Program Lead" (American English; the key stays).

insert into access.roles (key, name_en, name_ar, is_council, spending_limit_iqd, sort) values
  ('programs_director', 'Director of Programs', 'مدير البرامج', true, 50000, 56);

update access.roles set requires_mfa = true where key = 'programs_director';

insert into access.role_permissions (role, permission) values
  ('programs_director', 'events.manage'),
  ('programs_director', 'events.checkin'),
  ('programs_director', 'programmes.manage'),
  ('programs_director', 'content.manage'),
  ('programs_director', 'library.read'),
  ('programs_director', 'library.council'),
  ('programs_director', 'spending.request');

update access.roles set name_en = 'Program Lead' where key = 'programme_lead';

-- The Director of Programs, by the title of their director's assignment.
update access.role_assignments
set role = 'programs_director'
where role = 'director'
  and (title_en ~* '^Director of Programs' or title_ar like 'مدير البرامج%');

-- The Company's lead: an Artistic Director, scoped to the Company.
do $$
declare
  company uuid := (select id from core.programmes where slug = 'company');
  a record;
begin
  for a in
    select * from access.role_assignments
    where role = 'director'
      and (title_en ~* 'Director of the Company' or title_ar like '%مدير الفرقة%')
      and (ends_at is null or ends_at > now())
  loop
    update access.role_assignments set ends_at = now() where id = a.id;
    if company is not null then
      insert into access.role_assignments (
        user_id, role, scope_type, scope_id, title_en, title_ar, starts_at, ends_at, assigned_by, note
      ) values (
        a.user_id, 'programme_lead', 'programme', company, 'Artistic Director', 'المدير الفني',
        now(), a.ends_at, a.assigned_by,
        'The Company''s lead (owner, Oct 29, 2026): was Director of the Company.'
      );
    end if;
  end loop;
end;
$$;
