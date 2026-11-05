-- Standard events (owner, Nov 5, 2026, later the same day): the recurring
-- events are not series. Second Chapter, the Salon, Book Circle, Open
-- Pages, the Listening Room and the Typewriter Tour's dates are ordinary
-- events, each with the one event page on the site and in the Diwan. What
-- hung off a series now hangs off an event: its prompts, its book vote,
-- its rota and shifts, its needs, and Second Chapter's campaign.
--
-- The rows in core.programmes stay for the Society's own (Qirtas, Next
-- Stop, the Company) and for history (service records, past openings);
-- the five are no longer active, and no event belongs to them.

-- 1. Who may run an event's parts: a series' managers as before (Qirtas,
-- the Company), anyone holding programs.manage everywhere (the President,
-- the Acting President), and the event's own lead.
create function private.runs_part(programme_id uuid, event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.has_permission('programs.manage', 'programme', runs_part.programme_id)
    or (
      runs_part.event_id is not null
      and (
        private.has_permission('programs.manage', 'event', runs_part.event_id)
        or private.has_permission('events.manage', 'event', runs_part.event_id)
      )
    );
$$;

revoke all on function private.runs_part(uuid, uuid) from public, anon;
grant execute on function private.runs_part(uuid, uuid) to authenticated;

create function private.lists_needs(programme_id uuid, event_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.lists_needs(lists_needs.programme_id)
    or private.runs_part(null, lists_needs.event_id);
$$;

revoke all on function private.lists_needs(uuid, uuid) from public, anon;
grant execute on function private.lists_needs(uuid, uuid) to authenticated;

-- 2. An event's parts.
alter table programmes.prompts
  add column event_id uuid references events.events (id) on delete cascade,
  alter column programme_id drop not null;
alter table programmes.book_ballots
  add column event_id uuid references events.events (id) on delete cascade,
  alter column programme_id drop not null;
alter table programmes.rotas
  add column event_id uuid references events.events (id) on delete cascade,
  alter column programme_id drop not null;
alter table programmes.needs
  alter column programme_id drop not null;
alter table charity.campaigns
  add column event_id uuid references events.events (id) on delete set null;

create index prompts_event_id_idx on programmes.prompts (event_id);
create index book_ballots_event_id_idx on programmes.book_ballots (event_id);
create index rotas_event_id_idx on programmes.rotas (event_id);
create index campaigns_event_id_idx on charity.campaigns (event_id);

grant insert (event_id), update (event_id) on programmes.prompts to authenticated;
grant insert (event_id), update (event_id) on programmes.book_ballots to authenticated;
grant insert (event_id), update (event_id) on programmes.rotas to authenticated;
grant insert (event_id), update (event_id) on charity.campaigns to authenticated;

comment on column programmes.prompts.event_id is 'The event the prompts are for (owner, Nov 5, 2026: no series).';
comment on column programmes.book_ballots.event_id is 'The event the book is chosen for.';
comment on column programmes.rotas.event_id is 'The event the rota staffs.';
comment on column charity.campaigns.event_id is 'Second Chapter''s event (the fair), whose page shows the campaign, its catalog and its impact report.';

-- 3. The five's parts move to their next event (or their last, if none is
-- coming); a part with no event at all keeps its row's id, for the record.
create temporary table former_series on commit drop as
  select id from core.programmes
  where slug in ('second-chapter', 'salon', 'book-circle', 'open-pages', 'listening-room', 'typewriter-tour');

create temporary table next_event on commit drop as
  select distinct on (e.programme_id) e.programme_id, e.id as event_id
  from events.events e
  where e.programme_id in (select id from former_series) and e.status <> 'cancelled'
  order by e.programme_id, (e.starts_at < now()), case when e.starts_at >= now() then e.starts_at end, e.starts_at desc;

update programmes.prompts p set event_id = n.event_id, programme_id = null
from next_event n where p.programme_id = n.programme_id;
update programmes.book_ballots b set event_id = n.event_id, programme_id = null
from next_event n where b.programme_id = n.programme_id;
update programmes.rotas r set event_id = n.event_id, programme_id = null
from next_event n where r.programme_id = n.programme_id and r.opening_id is null;
update programmes.needs d set event_id = n.event_id, programme_id = null
from next_event n where d.programme_id = n.programme_id and d.event_id is null;
update programmes.needs d set programme_id = null
where d.event_id is not null and d.programme_id in (select id from former_series);

-- 4. Whoever led a series leads each of its events from today on (scope
-- `event`), and the series assignment ends. No email goes out for these.
alter table access.role_assignments disable trigger after_role_assigned;

insert into access.role_assignments
  (user_id, role, scope_type, scope_id, starts_at, ends_at, title_en, title_ar, assigned_by, note)
select a.user_id, a.role, 'event', e.id, now(), a.ends_at, a.title_en, a.title_ar, a.assigned_by,
  'Was held for the whole series (owner, Nov 5, 2026: standard events).'
from access.role_assignments a
join events.events e on e.programme_id = a.scope_id
where a.scope_type = 'programme'
  and a.scope_id in (select id from former_series)
  and a.starts_at <= now() and (a.ends_at is null or a.ends_at > now())
  and e.starts_at >= now() - interval '1 day'
  and e.status <> 'cancelled';

update access.role_assignments set ends_at = now()
where scope_type = 'programme'
  and scope_id in (select id from former_series)
  and starts_at <= now() and (ends_at is null or ends_at > now());

alter table access.role_assignments enable trigger after_role_assigned;

-- 5. The events stand alone, and the five rows are no longer active.
update events.events set programme_id = null
where programme_id in (select id from former_series);
update core.programmes set is_active = false
where id in (select id from former_series)
  and slug <> 'typewriter-tour';

-- 6. The policies ask about the event too.
drop policy "Program managers change ballots" on programmes.book_ballots;
create policy "Program managers change ballots" on programmes.book_ballots
  as permissive for update to authenticated
  using (( SELECT private.runs_part(book_ballots.programme_id, book_ballots.event_id) AS has_permission))
  with check (( SELECT private.runs_part(book_ballots.programme_id, book_ballots.event_id) AS has_permission));

drop policy "Program managers open ballots" on programmes.book_ballots;
create policy "Program managers open ballots" on programmes.book_ballots
  as permissive for insert to authenticated
  with check (( SELECT private.runs_part(book_ballots.programme_id, book_ballots.event_id) AS has_permission));

drop policy "Program managers remove ballots" on programmes.book_ballots;
create policy "Program managers remove ballots" on programmes.book_ballots
  as permissive for delete to authenticated
  using (( SELECT private.runs_part(book_ballots.programme_id, book_ballots.event_id) AS has_permission));

drop policy "Program managers choose the books" on programmes.book_choices;
create policy "Program managers choose the books" on programmes.book_choices
  as permissive for insert to authenticated
  with check ((EXISTS ( SELECT 1
   FROM programmes.book_ballots b
  WHERE ((b.id = book_choices.ballot_id) AND ( SELECT private.runs_part(b.programme_id, b.event_id) AS has_permission)))));

drop policy "Program managers remove books" on programmes.book_choices;
create policy "Program managers remove books" on programmes.book_choices
  as permissive for delete to authenticated
  using ((EXISTS ( SELECT 1
   FROM programmes.book_ballots b
  WHERE ((b.id = book_choices.ballot_id) AND ( SELECT private.runs_part(b.programme_id, b.event_id) AS has_permission)))));

drop policy "Program managers and the General Secretary update needs" on programmes.needs;
create policy "Program managers and the General Secretary update needs" on programmes.needs
  as permissive for update to authenticated
  using ((( SELECT private.lists_needs(needs.programme_id, needs.event_id) AS lists_needs) OR ( SELECT private.has_permission('governance.manage'::text) AS has_permission)))
  with check ((( SELECT private.lists_needs(needs.programme_id, needs.event_id) AS lists_needs) OR ( SELECT private.has_permission('governance.manage'::text) AS has_permission)));

drop policy "Program managers list needs" on programmes.needs;
create policy "Program managers list needs" on programmes.needs
  as permissive for insert to authenticated
  with check ((( SELECT private.lists_needs(needs.programme_id, needs.event_id) AS lists_needs) OR ( SELECT private.has_permission('governance.manage'::text) AS has_permission)));

drop policy "Program managers remove needs not yet requested" on programmes.needs;
create policy "Program managers remove needs not yet requested" on programmes.needs
  as permissive for delete to authenticated
  using ((((status = 'listed'::text) AND ( SELECT private.lists_needs(needs.programme_id, needs.event_id) AS lists_needs)) OR ( SELECT private.has_permission('governance.manage'::text) AS has_permission)));

drop policy "Select by authenticated" on programmes.needs;
create policy "Select by authenticated" on programmes.needs
  as permissive for select to authenticated
  using ((( SELECT private.lists_needs(needs.programme_id, needs.event_id) AS lists_needs) OR ( SELECT private.has_permission('governance.manage'::text) AS has_permission)));

drop policy "Program managers change prompts" on programmes.prompts;
create policy "Program managers change prompts" on programmes.prompts
  as permissive for update to authenticated
  using (( SELECT private.runs_part(prompts.programme_id, prompts.event_id) AS has_permission))
  with check (( SELECT private.runs_part(prompts.programme_id, prompts.event_id) AS has_permission));

drop policy "Program managers remove prompts" on programmes.prompts;
create policy "Program managers remove prompts" on programmes.prompts
  as permissive for delete to authenticated
  using (( SELECT private.runs_part(prompts.programme_id, prompts.event_id) AS has_permission));

drop policy "Program managers write prompts" on programmes.prompts;
create policy "Program managers write prompts" on programmes.prompts
  as permissive for insert to authenticated
  with check (( SELECT private.runs_part(prompts.programme_id, prompts.event_id) AS has_permission));

drop policy "Published prompts, and the program's own for its managers" on programmes.prompts;
create policy "Published prompts, and the program's own for its managers" on programmes.prompts
  as permissive for select to authenticated
  using ((is_published OR ( SELECT private.runs_part(prompts.programme_id, prompts.event_id) AS has_permission)));

drop policy "Programme managers manage rotas (delete)" on programmes.rotas;
create policy "Programme managers manage rotas (delete)" on programmes.rotas
  as permissive for delete to authenticated
  using (( SELECT private.runs_part(rotas.programme_id, rotas.event_id) AS has_permission));

drop policy "Programme managers manage rotas (insert)" on programmes.rotas;
create policy "Programme managers manage rotas (insert)" on programmes.rotas
  as permissive for insert to authenticated
  with check (( SELECT private.runs_part(rotas.programme_id, rotas.event_id) AS has_permission));

drop policy "Programme managers manage rotas (update)" on programmes.rotas;
create policy "Programme managers manage rotas (update)" on programmes.rotas
  as permissive for update to authenticated
  using (( SELECT private.runs_part(rotas.programme_id, rotas.event_id) AS has_permission))
  with check (( SELECT private.runs_part(rotas.programme_id, rotas.event_id) AS has_permission));

drop policy "Select by authenticated" on programmes.rotas;
create policy "Select by authenticated" on programmes.rotas
  as permissive for select to authenticated
  using ((( SELECT private.membership_is_member() AS is_member) OR ( SELECT private.runs_part(rotas.programme_id, rotas.event_id) AS has_permission)));

drop policy "Select by authenticated" on programmes.shift_signups;
create policy "Select by authenticated" on programmes.shift_signups
  as permissive for select to authenticated
  using (((user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM (programmes.shifts s
     JOIN programmes.rotas r ON ((r.id = s.rota_id)))
  WHERE ((s.id = shift_signups.shift_id) AND ( SELECT private.runs_part(r.programme_id, r.event_id) AS has_permission))))));

drop policy "Update by authenticated" on programmes.shift_signups;
create policy "Update by authenticated" on programmes.shift_signups
  as permissive for update to authenticated
  using (((user_id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM (programmes.shifts s
     JOIN programmes.rotas r ON ((r.id = s.rota_id)))
  WHERE ((s.id = shift_signups.shift_id) AND ( SELECT private.runs_part(r.programme_id, r.event_id) AS has_permission))))))
  with check ((((user_id = ( SELECT auth.uid() AS uid)) AND (status = ANY (ARRAY['confirmed'::text, 'swap_requested'::text, 'cancelled'::text]))) OR (EXISTS ( SELECT 1
   FROM (programmes.shifts s
     JOIN programmes.rotas r ON ((r.id = s.rota_id)))
  WHERE ((s.id = shift_signups.shift_id) AND ( SELECT private.runs_part(r.programme_id, r.event_id) AS has_permission))))));

drop policy "Programme managers manage shifts (delete)" on programmes.shifts;
create policy "Programme managers manage shifts (delete)" on programmes.shifts
  as permissive for delete to authenticated
  using ((EXISTS ( SELECT 1
   FROM programmes.rotas r
  WHERE ((r.id = shifts.rota_id) AND ( SELECT private.runs_part(r.programme_id, r.event_id) AS has_permission)))));

drop policy "Programme managers manage shifts (insert)" on programmes.shifts;
create policy "Programme managers manage shifts (insert)" on programmes.shifts
  as permissive for insert to authenticated
  with check ((EXISTS ( SELECT 1
   FROM programmes.rotas r
  WHERE ((r.id = shifts.rota_id) AND ( SELECT private.runs_part(r.programme_id, r.event_id) AS has_permission)))));

drop policy "Programme managers manage shifts (update)" on programmes.shifts;
create policy "Programme managers manage shifts (update)" on programmes.shifts
  as permissive for update to authenticated
  using ((EXISTS ( SELECT 1
   FROM programmes.rotas r
  WHERE ((r.id = shifts.rota_id) AND ( SELECT private.runs_part(r.programme_id, r.event_id) AS has_permission)))))
  with check ((EXISTS ( SELECT 1
   FROM programmes.rotas r
  WHERE ((r.id = shifts.rota_id) AND ( SELECT private.runs_part(r.programme_id, r.event_id) AS has_permission)))));

drop policy "Select by authenticated" on programmes.shifts;
create policy "Select by authenticated" on programmes.shifts
  as permissive for select to authenticated
  using ((( SELECT private.membership_is_member() AS is_member) OR (EXISTS ( SELECT 1
   FROM programmes.rotas r
  WHERE ((r.id = shifts.rota_id) AND ( SELECT private.runs_part(r.programme_id, r.event_id) AS has_permission))))));

create or replace function private.ballot_counts(ballot uuid)
returns table (choice_id uuid, votes integer)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, (select count(*)::integer from programmes.book_votes v where v.choice_id = c.id)
  from programmes.book_choices c
  join programmes.book_ballots b on b.id = c.ballot_id
  where c.ballot_id = ballot_counts.ballot
    and (b.closes_at <= now()
      or private.runs_part(b.programme_id, b.event_id))
  order by c.created_at;
$$;

create or replace function private.record_shift_service(shift_id uuid, member_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  s programmes.shifts;
  r programmes.rotas;
  new_id uuid;
begin
  select * into s from programmes.shifts where id = record_shift_service.shift_id;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  select * into r from programmes.rotas where id = s.rota_id;
  if not private.runs_part(r.programme_id, r.event_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if member_id = auth.uid() then
    raise exception 'not_your_own' using errcode = '42501';
  end if;
  if s.ends_at > now() then
    raise exception 'shift_not_over' using errcode = '22023';
  end if;
  if not exists (
    select 1 from programmes.shift_signups su
    where su.shift_id = s.id and su.user_id = member_id and su.status <> 'cancelled'
  ) then
    raise exception 'not_signed_up' using errcode = '22023';
  end if;

  insert into membership.service_records (
    user_id, source, source_id, programme_id, occurred_on, activity, what, hours,
    status, confirmed_by, confirmed_at
  ) values (
    member_id, 'shift', s.id, r.programme_id,
    (s.starts_at at time zone 'Asia/Baghdad')::date,
    left(r.title_en || ' · ' || s.role_en, 200), null,
    least(24, greatest(0.25, round(extract(epoch from (s.ends_at - s.starts_at)) / 3600.0 * 4) / 4)),
    'confirmed', auth.uid(), now()
  )
  on conflict (user_id, source, source_id) where source_id is not null do nothing
  returning id into new_id;
  return new_id;
end;
$function$;
