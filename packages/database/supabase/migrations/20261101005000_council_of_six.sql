-- The Council of six (owner, Nov 5, 2026; claude/decisions.md §3).
--
-- Officers: the President (owns events), the Vice President (owns
-- partnerships, charities among them) and the General Secretary (owns
-- membership, records, the Typewriter Tour and every request to Student
-- Life). Directors: the Editor-in-Chief, the Artistic Director and the
-- Director of Media. There is no Director of Programs, Events,
-- Partnerships or Membership: the officers hold those jobs as part of
-- their offices, so the roles go and their permissions stay with the
-- officers. The generic Director goes too: every director's seat is its
-- own role.
--
-- While the President is abroad (Jan 24 – May 15, 2027), the Acting
-- President owns events: a role the Council assigns for those dates.
--
-- The Typewriter Tour belongs to membership (§2): `tour.run` lets the
-- General Secretary and the Tour Lead transcribe, attach and moderate Six
-- Words, out of the programs' scope.

-- A generic Director whose title names a seat that is its own role moves
-- to that role.
update access.role_assignments set role = 'media_director', title_en = null, title_ar = null
where role = 'director' and (title_en ~* 'media' or title_ar like '%الإعلام%');
update access.role_assignments set role = 'eic', title_en = null, title_ar = null
where role = 'director' and (title_en ~* 'editor' or title_ar like '%التحرير%');
update access.role_assignments set role = 'artistic_director', title_en = null, title_ar = null
where role = 'director' and (title_en ~* 'artistic' or title_ar like '%الفني%');

-- The retired seats: their openings close (the replies stay on record),
-- their election seats and assignments go. The officers already hold
-- these jobs.
update programmes.openings set role = null, is_open = false
where role in ('director', 'membership_director', 'partnerships_director', 'programs_director');
delete from governance.positions
where role_key in ('director', 'membership_director', 'partnerships_director', 'programs_director');
delete from access.role_assignments
where role in ('director', 'membership_director', 'partnerships_director', 'programs_director');

delete from access.roles where key in ('director', 'membership_director', 'partnerships_director', 'programs_director');

-- The Vice President keeps partnerships (and the checks on the
-- President); events go to the President, membership and certificates to
-- the General Secretary, the Company to the Artistic Director.
delete from access.role_permissions where role = 'vice_president' and permission = 'events.manage';
delete from access.role_permissions where role = 'vice_president' and permission = 'programs.manage';
delete from access.role_permissions where role = 'vice_president' and permission = 'members.manage';
delete from access.role_permissions where role = 'vice_president' and permission = 'members.verify';
delete from access.role_permissions where role = 'vice_president' and permission = 'productions.manage';
delete from access.role_permissions where role = 'vice_president' and permission = 'certificates.prepare';

insert into access.permissions (key, description) values
  ('tour.run', 'Run the Typewriter Tour: transcribe, attach and approve Six Words (the General Secretary and the Tour Lead)');

insert into access.roles (key, name_en, name_ar, is_council, sort) values
  ('acting_president', 'Acting President', 'الرئيس بالإنابة', false, 15),
  ('tour_lead', 'Tour Lead', 'مسؤول جولة الآلة الكاتبة', false, 158);

update access.roles set requires_mfa = true, hiring_owner = 'council' where key = 'acting_president';
update access.roles set hiring_owner = 'membership' where key = 'tour_lead';

insert into access.role_permissions (role, permission) values
  ('acting_president', 'events.manage'),
  ('acting_president', 'events.checkin'),
  ('acting_president', 'programs.manage'),
  ('acting_president', 'library.read'),
  ('acting_president', 'library.council'),
  ('tour_lead', 'tour.run'),
  ('tour_lead', 'events.checkin'),
  ('tour_lead', 'library.read'),
  ('general_secretary', 'tour.run'),
  ('general_secretary', 'events.checkin'),
  ('president', 'tour.run');

-- Names and descriptions in the current words.
update access.roles set name_en = 'Event Lead', name_ar = 'قائد الفعالية' where key = 'programme_lead';
update access.roles set name_en = 'Director of Media', name_ar = 'مدير الإعلام' where key = 'media_director';

-- The Council's order: the three officers, then the Editor-in-Chief, the
-- Artistic Director and the Director of Media.
update access.roles set sort = 40 where key = 'eic';
update access.roles set sort = 45 where key = 'artistic_director';
update access.roles set sort = 48 where key = 'media_director';

update access.permissions set description = 'Manage event series: needs lists, rotas, prompts, ballots and removal requests (the President, event leads)'
where key = 'programs.manage';
update access.permissions set description = 'Manage media and the content calendar'
where key = 'content.manage';
update access.permissions set description = 'Manage Second Chapter''s campaigns, receipts and impact reports'
where key = 'charity.manage';
update access.permissions set description = 'Manage the Society''s semesters and settings'
where key = 'settings.manage';
update access.permissions set description = 'Qirtas News Editor: assign, edit and fact-check news; approve for the section'
where key = 'journal.edit.news';
update access.permissions set description = 'Qirtas Letters Editor: run blind reading and approve Letters'
where key = 'journal.edit.letters';
update access.permissions set description = 'Qirtas Gallery Editor: curate art, photography and comics; approve for the section'
where key = 'journal.edit.gallery';
update access.permissions set description = 'Qirtas Video Editor: Next Stop and video pieces; approve for the section'
where key = 'journal.edit.video';
update access.permissions set description = 'Qirtas Voices Editor: letters to the editor and columns; approve for the section'
where key = 'journal.edit.voices';
update access.permissions set description = 'Qirtas Editor-in-Chief or Managing Editor: the second approval, Editions'
where key = 'journal.approve';
update access.permissions set description = 'Qirtas Copy Chief: house style in both languages, the last check before publish'
where key = 'journal.copy';
update access.permissions set description = 'Qirtas front page: the lead story and the order of the front page'
where key = 'journal.frontpage';
update access.permissions set description = 'Run Qirtas: calls, the board, editors'' notes'
where key = 'journal.manage';
update access.permissions set description = 'Edit Qirtas pieces and contributors in any section'
where key = 'journal.publish';
update access.permissions set description = 'Qirtas Games Editor: edit crosswords, word searches and anagrams; approve for the section'
where key = 'journal.edit.games';

-- Six Words: whoever runs the Tour, not a program's managers.
create or replace function private.runs_the_tour()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_permission('tour.run');
$$;

create or replace function private.moderate_six_words(entry_id uuid, approve boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.runs_the_tour() then
    raise exception 'tour.run is required' using errcode = '42501';
  end if;
  update programmes.six_words
  set status = case when approve then 'approved' else 'rejected' end,
      moderated_by = auth.uid(),
      moderated_at = now()
  where id = entry_id;
end;
$$;

drop policy "Select by authenticated" on programmes.six_words;
create policy "Select by authenticated" on programmes.six_words
  for select to authenticated
  using (
    status = 'approved'
    or user_id = (select auth.uid())
    or (select private.runs_the_tour())
  );

-- The Council page lists the six seats by their full titles, each with
-- whoever holds it (none while a seat is open), and the Acting President
-- while one is in office.
create function private.council_seats()
returns table (seat text, sort integer, holders_en text[], holders_ar text[])
language sql
stable
security definer
set search_path = ''
as $$
  select
    r.key,
    r.sort,
    coalesce(array_agg(p.full_name_en order by a.starts_at) filter (where p.id is not null), '{}'),
    coalesce(array_agg(coalesce(p.full_name_ar, p.full_name_en) order by a.starts_at) filter (where p.id is not null), '{}')
  from access.roles r
  left join access.role_assignments a
    on a.role = r.key
    and a.scope_type = 'global'
    and a.starts_at <= now()
    and (a.ends_at is null or a.ends_at > now())
  left join core.profiles p on p.id = a.user_id
  where r.is_council or r.key = 'acting_president'
  group by r.key, r.sort
  having r.key <> 'acting_president' or count(p.id) > 0
  order by r.sort;
$$;

revoke all on function private.council_seats() from public;
grant execute on function private.council_seats() to anon, authenticated, service_role;

create function governance.council_seats()
returns table (seat text, sort integer, holders_en text[], holders_ar text[])
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.council_seats() $$;

revoke all on function governance.council_seats() from public;
grant execute on function governance.council_seats() to anon, authenticated, service_role;
