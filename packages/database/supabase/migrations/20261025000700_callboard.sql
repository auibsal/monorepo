-- The Callboard (owner, 2026-10-25: "go for everything"; link text "Get
-- involved"): roles, shifts and auditions on one board for members, matched
-- to the skills they give in Profile (core.member_details.skills), with the
-- hours they give counting toward their service record and certificates.
--
-- * programmes.openings: a role a program needs filled ("A photographer for
--   Open Stage"), with the skills it wants. Members say they are
--   interested (programmes.opening_replies); the program's managers read the
--   replies and follow up.
-- * Shifts take the skills they want too.

create function private.callboard_skills_valid(skills text[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select skills <@ array['writing', 'editing', 'translation', 'design', 'photography',
    'video', 'social_media', 'acting', 'directing', 'stage_crew', 'music',
    'organizing', 'web'];
$$;

alter table programmes.shifts
  add column skills text[] not null default '{}'
    check (private.callboard_skills_valid(skills));

create table programmes.openings (
  id uuid primary key default gen_random_uuid(),
  programme_id uuid references core.programmes (id) on delete cascade,
  title_en text not null check (char_length(title_en) between 1 and 200),
  title_ar text not null check (char_length(title_ar) between 1 and 200),
  body_en text check (char_length(body_en) <= 2000),
  body_ar text check (char_length(body_ar) <= 2000),
  skills text[] not null default '{}' check (private.callboard_skills_valid(skills)),
  closes_at timestamptz,
  is_open boolean not null default true,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table programmes.openings is
  'Roles a program needs filled, on the Callboard. Members read open ones; the program''s managers write them.';

create index openings_programme_id_idx on programmes.openings (programme_id);
create index openings_created_by_idx on programmes.openings (created_by);

create trigger set_updated_at before update on programmes.openings
  for each row execute function private.set_updated_at();

alter table programmes.openings enable row level security;

-- Managing an opening: programmes.manage for its program (or anywhere, for
-- openings that belong to no program).
create function private.manages_opening(programme_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when manages_opening.programme_id is null then private.has_permission_anywhere('programmes.manage')
    else private.has_permission('programmes.manage', 'programme', manages_opening.programme_id)
  end;
$$;

create policy "Select by authenticated" on programmes.openings
  for select to authenticated
  using (
    (is_open and (closes_at is null or closes_at > now()) and (select private.membership_is_member()))
    or (select private.manages_opening(programme_id))
  );
create policy "Program managers post openings" on programmes.openings
  for insert to authenticated
  with check ((select private.manages_opening(programme_id)));
create policy "Program managers edit openings" on programmes.openings
  for update to authenticated
  using ((select private.manages_opening(programme_id)))
  with check ((select private.manages_opening(programme_id)));
create policy "Program managers remove openings" on programmes.openings
  for delete to authenticated
  using ((select private.manages_opening(programme_id)));
create policy "Third-party apps reach only their areas" on programmes.openings
  as restrictive for all to authenticated
  using ((select private.client_allows('programmes')))
  with check ((select private.client_allows('programmes')));

grant select, insert, update, delete on programmes.openings to authenticated;
grant all on programmes.openings to service_role;

create table programmes.opening_replies (
  opening_id uuid not null references programmes.openings (id) on delete cascade,
  user_id uuid not null references core.profiles (id) on delete cascade default auth.uid(),
  note text check (char_length(note) <= 1000),
  created_at timestamptz not null default now(),
  primary key (opening_id, user_id)
);

comment on table programmes.opening_replies is
  '"I''m interested" on a Callboard opening. Each member reads their own; the program''s managers read them all.';

create index opening_replies_user_id_idx on programmes.opening_replies (user_id);

alter table programmes.opening_replies enable row level security;

create function private.manages_opening_id(opening_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from programmes.openings o
    where o.id = manages_opening_id.opening_id and private.manages_opening(o.programme_id)
  );
$$;

create function private.opening_is_open(opening_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from programmes.openings o
    where o.id = opening_is_open.opening_id
      and o.is_open and (o.closes_at is null or o.closes_at > now())
  );
$$;

create policy "Select by authenticated" on programmes.opening_replies
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.manages_opening_id(opening_id)));
create policy "Members reply to open openings" on programmes.opening_replies
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (select private.membership_is_member())
    and (select private.opening_is_open(opening_id))
  );
create policy "Members take back their reply" on programmes.opening_replies
  for delete to authenticated
  using (user_id = (select auth.uid()));
create policy "Third-party apps reach only their areas" on programmes.opening_replies
  as restrictive for all to authenticated
  using ((select private.client_allows('programmes')))
  with check ((select private.client_allows('programmes')));

grant select, insert, delete on programmes.opening_replies to authenticated;
grant all on programmes.opening_replies to service_role;

revoke all on function private.callboard_skills_valid(text[]), private.manages_opening(uuid),
  private.manages_opening_id(uuid), private.opening_is_open(uuid) from public;
grant execute on function private.callboard_skills_valid(text[]), private.manages_opening(uuid),
  private.manages_opening_id(uuid), private.opening_is_open(uuid)
  to anon, authenticated, service_role;

-- The program's managers hear about each reply.
create function private.after_opening_reply()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.enqueue('programmes.opening_reply',
    jsonb_build_object('opening_id', new.opening_id, 'user_id', new.user_id));
  return new;
end;
$$;

create trigger after_opening_reply after insert on programmes.opening_replies
  for each row execute function private.after_opening_reply();
