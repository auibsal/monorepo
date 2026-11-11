-- One-event jobs (decisions.md, Events): box custodians, cashiers, ushers
-- and check-in are volunteer shifts on the event, signed up for with no
-- application. Only an event lead (and a Company production role) is
-- appointed through Get involved, so an event's opening is for its lead:
-- one place, and the person onboarded holds the event lead role for that
-- event alone.

comment on column programmes.openings.kind is
  'role (a Council or team role), event_team (the lead of one event: one place, the event lead role scoped to it; everyone else on the night signs up for a shift) or qalam_mentor. Auditions come from the Company''s productions.';

create function private.event_lead_opening()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.kind = 'event_team' then
    new.role := 'programme_lead';
    new.places := 1;
  end if;
  return new;
end;
$$;

revoke all on function private.event_lead_opening() from public, anon, authenticated;

-- Before opening_role (triggers run by name), which takes the owner and
-- title from the role.
create trigger event_lead_opening before insert or update of kind, role, places
  on programmes.openings
  for each row execute function private.event_lead_opening();

update programmes.openings set kind = kind where kind = 'event_team';

-- The person onboarded leads that event only.
create or replace function private.onboarded_takes_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  o programmes.openings;
  r access.roles;
  director boolean;
begin
  if new.status <> 'onboarded' or old.status = 'onboarded' then
    return new;
  end if;
  select * into o from programmes.openings where id = new.opening_id;
  if o.role is null then
    return new;
  end if;
  select * into r from access.roles where key = o.role;
  director := private.is_director_role(o.role);
  if exists (
    select 1 from access.role_assignments a
    where a.user_id = new.user_id and a.role = o.role
      and a.scope_id is not distinct from o.event_id
      and (a.ends_at is null or a.ends_at > now())
  ) then
    return new;
  end if;
  insert into access.role_assignments (user_id, role, scope_type, scope_id, title_en, title_ar, assigned_by,
    confirmed_at, student_life_answer, student_life_answered_at, note)
  values (
    new.user_id, o.role,
    case when o.event_id is null then 'global' else 'event' end,
    o.event_id,
    case when o.title_en <> r.name_en and not director then left(o.title_en, 120) end,
    case when o.title_ar <> r.name_ar and not director then left(o.title_ar, 120) end,
    (select auth.uid()),
    case when director then now() end,
    case when director then 'eligible' end,
    case when director then new.student_life_eligible_at end,
    case when director then 'Executive Board resolution ' || new.appointed_by_resolution end
  );
  return new;
end;
$$;
