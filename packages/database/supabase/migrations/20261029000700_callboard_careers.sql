-- The Callboard is the careers page (owner, Oct 29, 2026). Besides roles,
-- shifts and auditions, it offers two kinds of place:
--
-- * The Apprenticeship: a one-term place in a Qirtas section or a program.
--   Its sessions are logged as shifts on the apprenticeship's own rota, so
--   their hours count as service as before; at the end the program's
--   manager completes the place and a certificate is drafted (kind
--   'apprenticeship'), to be signed as every certificate is. Qirtas's
--   sections use Qirtas's own program row ('waraq') and name the section.
-- * First Ink: mentor places for AUIB members who volunteer with high
--   school students. It runs through the partner school (a partner in the
--   one register); high school students never get accounts, so nothing
--   about them is kept here. Only members with an AUIB sign-in address take
--   a First Ink place.
--
-- Members say "I'm interested" as for any opening; the managers then give
-- the place (programmes.placements).

-- ── Openings of three kinds ─────────────────────────────────────────────────

alter table programmes.openings
  add column kind text not null default 'role'
    check (kind in ('role', 'apprenticeship', 'first_ink')),
  add column desk journal.desk,
  add column partner_id uuid references governance.partners (id) on delete restrict,
  add column places integer check (places between 1 and 100),
  add column term_from date,
  add column term_to date;

alter table programmes.openings add constraint openings_apprenticeship_term check (
  kind <> 'apprenticeship'
  or (programme_id is not null and term_from is not null and term_to is not null
      and term_to > term_from and term_to <= term_from + 183)
);
alter table programmes.openings add constraint openings_first_ink_partner check (
  kind <> 'first_ink' or partner_id is not null
);
alter table programmes.openings add constraint openings_desk_apprenticeship check (
  desk is null or kind = 'apprenticeship'
);

comment on column programmes.openings.kind is
  'role: a role a program needs; apprenticeship: a one-term place in a Qirtas section or a program; first_ink: a First Ink mentor place with the partner school.';

create index openings_partner_id_idx on programmes.openings (partner_id);

-- An apprenticeship's or First Ink's sessions: the shifts of its rota.
alter table programmes.rotas
  add column opening_id uuid references programmes.openings (id) on delete set null;

create index rotas_opening_id_idx on programmes.rotas (opening_id);

-- ── Places given ────────────────────────────────────────────────────────────

create table programmes.placements (
  id uuid primary key default gen_random_uuid(),
  opening_id uuid not null references programmes.openings (id) on delete cascade,
  user_id uuid not null references core.profiles (id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'completed', 'withdrawn')),
  started_on date not null default (now() at time zone 'Asia/Baghdad')::date,
  completed_on date,
  certificate_id uuid references membership.certificates (id) on delete set null,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (opening_id, user_id),
  check ((status = 'completed') = (completed_on is not null))
);

comment on table programmes.placements is
  'Apprenticeship and First Ink places given on the Callboard. Each member reads their own; the program''s managers give, withdraw and complete them.';

create index placements_user_id_idx on programmes.placements (user_id);
create index placements_certificate_id_idx on programmes.placements (certificate_id);
create index placements_created_by_idx on programmes.placements (created_by);

create trigger set_updated_at before update on programmes.placements
  for each row execute function private.set_updated_at();
create trigger log_activity after insert or update or delete on programmes.placements
  for each row execute function private.log_activity();

-- A place is an apprenticeship or First Ink, within its number of places;
-- First Ink only for members with an AUIB sign-in address.
create function private.placement_valid()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  o programmes.openings;
  taken integer;
begin
  select * into o from programmes.openings where id = new.opening_id;
  if o.kind = 'role' then
    raise exception 'placement_not_a_place' using errcode = '22023';
  end if;
  if not private.is_member(new.user_id) then
    raise exception 'placement_members_only' using errcode = '22023';
  end if;
  if o.kind = 'first_ink' and not exists (
    select 1 from auth.users u where u.id = new.user_id and private.is_auib_email(u.email)
  ) then
    raise exception 'first_ink_auib_only' using errcode = '22023';
  end if;
  if tg_op = 'INSERT' and o.places is not null then
    select count(*) into taken from programmes.placements p
    where p.opening_id = new.opening_id and p.status <> 'withdrawn';
    if taken >= o.places then
      raise exception 'placements_full' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

create trigger placement_valid before insert or update of opening_id, user_id on programmes.placements
  for each row execute function private.placement_valid();

alter table programmes.placements enable row level security;

create policy "Select by authenticated" on programmes.placements
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.manages_opening_id(opening_id)));
create policy "Program managers give places" on programmes.placements
  for insert to authenticated
  with check ((select private.manages_opening_id(opening_id)));
create policy "Program managers change places" on programmes.placements
  for update to authenticated
  using ((select private.manages_opening_id(opening_id)))
  with check ((select private.manages_opening_id(opening_id)) and status <> 'completed');
create policy "Program managers remove places" on programmes.placements
  for delete to authenticated
  using ((select private.manages_opening_id(opening_id)));
create policy "Third-party apps reach only their areas" on programmes.placements
  as restrictive for all to authenticated
  using ((select private.client_allows('programmes')))
  with check ((select private.client_allows('programmes')));

revoke all on programmes.placements from anon, authenticated;
grant select, insert, update, delete on programmes.placements to authenticated;
grant all on programmes.placements to service_role;

-- ── The end of an apprenticeship ────────────────────────────────────────────

-- The program's manager completes an apprenticeship: the place is marked
-- done, and a certificate is drafted for the President and the Faculty
-- Advisor to sign, with the hours the apprentice's sessions gave. Returns
-- the draft certificate.
create function private.complete_apprenticeship(placement uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  pl programmes.placements;
  o programmes.openings;
  given numeric;
  made uuid;
begin
  select * into pl from programmes.placements where id = complete_apprenticeship.placement;
  if pl.id is null then
    raise exception 'Placement not found' using errcode = 'P0002';
  end if;
  select * into o from programmes.openings where id = pl.opening_id;
  if not private.manages_opening(o.programme_id) then
    raise exception 'programmes.manage is required for this program' using errcode = '42501';
  end if;
  if o.kind <> 'apprenticeship' then
    raise exception 'not_an_apprenticeship' using errcode = '22023';
  end if;
  if pl.status <> 'active' then
    raise exception 'placement_not_active' using errcode = '22023';
  end if;
  if pl.user_id = (select auth.uid()) then
    raise exception 'not_your_own' using errcode = '42501';
  end if;

  select coalesce(sum(s.hours), 0) into given
  from membership.service_records s
  join programmes.shifts sh on sh.id = s.source_id
  join programmes.rotas r on r.id = sh.rota_id
  where s.source = 'shift' and s.status = 'confirmed'
    and s.user_id = pl.user_id and r.opening_id = o.id;

  insert into membership.certificates (user_id, kind, role_en, role_ar, period_from, period_to, hours)
  values (pl.user_id, 'apprenticeship', o.title_en, o.title_ar,
    least(pl.started_on, coalesce(o.term_from, pl.started_on)),
    greatest(coalesce(o.term_to, (now() at time zone 'Asia/Baghdad')::date), pl.started_on),
    nullif(given, 0))
  returning id into made;

  update programmes.placements set
    status = 'completed',
    completed_on = (now() at time zone 'Asia/Baghdad')::date,
    certificate_id = made
  where id = pl.id;
  return made;
end;
$$;

revoke all on function private.placement_valid() from public, anon, authenticated;
revoke all on function private.complete_apprenticeship(uuid) from public, anon;
grant execute on function private.complete_apprenticeship(uuid) to authenticated, service_role;

create function programmes.complete_apprenticeship(placement uuid)
returns uuid
language sql
volatile
security invoker
set search_path = ''
as $$ select private.complete_apprenticeship($1) $$;

revoke all on function programmes.complete_apprenticeship(uuid) from public, anon;
grant execute on function programmes.complete_apprenticeship(uuid) to authenticated, service_role;
