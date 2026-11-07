-- The President and Qirtas (decisions §1: Qirtas has editorial
-- independence; the President, as Publisher, never selects work). Every
-- Qirtas editorial, Qalam and Prize permission comes off the President.
delete from access.role_permissions where role = 'president' and permission = 'journal.manage';
delete from access.role_permissions where role = 'president' and permission = 'journal.advise';
delete from access.role_permissions where role = 'president' and permission = 'journal.decide';
delete from access.role_permissions where role = 'president' and permission = 'journal.publish';
delete from access.role_permissions where role = 'president' and permission = 'journal.edit.news';
delete from access.role_permissions where role = 'president' and permission = 'journal.edit.letters';
delete from access.role_permissions where role = 'president' and permission = 'journal.edit.gallery';
delete from access.role_permissions where role = 'president' and permission = 'journal.edit.video';
delete from access.role_permissions where role = 'president' and permission = 'journal.edit.voices';
delete from access.role_permissions where role = 'president' and permission = 'journal.edit.games';
delete from access.role_permissions where role = 'president' and permission = 'journal.approve';
delete from access.role_permissions where role = 'president' and permission = 'journal.copy';
delete from access.role_permissions where role = 'president' and permission = 'journal.frontpage';
delete from access.role_permissions where role = 'president' and permission = 'journal.prize';
delete from access.role_permissions where role = 'president' and permission = 'qalam.manage';

-- No Acting President role (decisions §4, §10, §11): while the President is
-- recorded as absent, the Vice President performs the President's duties,
-- with the President's powers on the site for that period (Constitution
-- 4.4).
delete from access.role_assignments where role = 'acting_president';
delete from access.role_permissions where role = 'acting_president';
delete from access.roles where key in ('acting_president');

create table governance.president_absences (
  id uuid primary key default gen_random_uuid(),
  starts_on date not null,
  ends_on date not null check (ends_on >= starts_on),
  recorded_by uuid references auth.users (id) on delete set null default auth.uid(),
  note text check (char_length(note) <= 500),
  created_at timestamptz not null default now()
);

comment on table governance.president_absences is
  'The President''s recorded absences (decisions §4: Jan 24 – May 15, 2027). While one covers today, the Vice President holds the President''s permissions on the site.';

create index president_absences_recorded_by_idx on governance.president_absences (recorded_by);

alter table governance.president_absences enable row level security;

create policy "No third-party apps" on governance.president_absences
  as restrictive for all to authenticated, anon
  using ((select private.client_allows('governance')))
  with check ((select private.client_allows('governance')));

create policy "Officers read and record absences" on governance.president_absences
  for all to authenticated
  using ((select private.has_permission('governance.manage')))
  with check ((select private.has_permission('governance.manage')));

grant select, insert, update, delete on governance.president_absences to authenticated;

create function private.president_absent()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from governance.president_absences a
    where current_date between a.starts_on and a.ends_on
  );
$$;

revoke all on function private.president_absent() from public, anon;
grant execute on function private.president_absent() to authenticated;

-- has_permission: a role's own grants, and, while the President is recorded
-- absent, the President's grants for whoever holds the Vice Presidency.
create or replace function private.has_permission(
  permission text,
  scope_type text default 'global',
  scope_id uuid default null
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from access.role_assignments a
    join access.roles r on r.key = a.role
    join access.role_permissions rp
      on rp.permission = has_permission.permission
      and (
        rp.role = a.role
        or (
          a.role = 'vice_president' and rp.role = 'president'
          and private.president_absent()
        )
      )
    where a.user_id = (select auth.uid())
      and a.starts_at <= now()
      and (a.ends_at is null or a.ends_at > now())
      and (not r.requires_mfa or (select private.session_two_step()))
      and (
        a.scope_type = 'global'
        or (
          a.scope_type = has_permission.scope_type
          and a.scope_id = has_permission.scope_id
        )
      )
  );
$$;

-- The Council page lists the nine seats only (no Acting President).
create or replace function private.council_seats()
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
  where r.is_council
  group by r.key, r.sort
  order by r.sort;
$$;
