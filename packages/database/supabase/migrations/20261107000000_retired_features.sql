-- The owner's decisions of Nov 7, 2026 (claude/decisions.md): what the
-- Society no longer keeps on the site. Every table dropped here was empty
-- in production on Nov 7, 2026 (checked before writing this migration).
--
-- * Charity collections are not a site feature: each collection's record
--   is a Notion page kept by the General Secretary (decisions §3).
-- * The Qirtas Awards are retired; the Mutanabbi Prize replaces them
--   (decisions §5, migration 20261107000700).
-- * The Apprenticeship and First Ink are retired; Qalam replaces First Ink
--   (decisions §1).
-- * An event's parts are the standard ones only (decisions §1): RSVP and
--   check-in, needs, volunteer shifts, the partner checklist and links.
--   Prompts and the book vote go; shifts belong to their event, with no
--   rota between them, and log no hours.

-- 1. Charity collections.
drop schema charity cascade;
drop function if exists private.campaign_is_public(uuid);
drop function if exists private.campaign_progress(uuid);
drop function if exists private.before_ledger_entry();
drop function if exists private.before_ledger_signoff();

drop policy "Insert by authenticated" on storage.objects;
create policy "Insert by authenticated" on storage.objects
  for insert to authenticated
  with check (
(((bucket_id = 'submissions'::text) AND (EXISTS ( SELECT 1
   FROM journal.submissions s
  WHERE (((s.id)::text = (storage.foldername(objects.name))[1]) AND (s.author_id = ( SELECT auth.uid() AS uid)) AND ((s.status = 'received'::journal.submission_status) OR ((s.status = 'intake_check'::journal.submission_status) AND (s.intake_returned_at IS NOT NULL))))))) OR ((bucket_id = 'library'::text) AND ( SELECT private.has_permission('governance.manage'::text) AS has_permission)) OR ((bucket_id = 'media'::text) AND ((storage.foldername(name))[1] = 'partners'::text) AND ( SELECT private.has_permission('partners.manage'::text) AS has_permission)) OR ((bucket_id = 'library'::text) AND ((storage.foldername(name))[1] = 'partners'::text) AND (( SELECT private.has_permission('partners.manage'::text) AS has_permission) OR ( SELECT private.has_permission('partners.sign'::text) AS has_permission))) OR ((bucket_id = 'media'::text) AND ((storage.foldername(name))[1] = 'waraq'::text) AND ( SELECT private.piece_editor(((storage.foldername(objects.name))[2])::uuid) AS piece_editor)) OR ((bucket_id = 'media'::text) AND ((storage.foldername(name))[1] = 'productions'::text) AND ( SELECT private.has_permission_anywhere('productions.manage'::text) AS has_permission_anywhere)) OR ((bucket_id = 'library'::text) AND ((storage.foldername(name))[1] = 'productions'::text) AND ( SELECT private.has_permission_anywhere('productions.manage'::text) AS has_permission_anywhere)) OR ((bucket_id = 'media'::text) AND (( SELECT private.has_permission_anywhere('content.manage'::text) AS has_permission_anywhere) OR ( SELECT private.has_permission_anywhere('journal.publish'::text) AS has_permission_anywhere) OR ( SELECT private.has_permission_anywhere('programs.manage'::text) AS has_permission_anywhere) OR ( SELECT private.has_permission_anywhere('events.manage'::text) AS has_permission_anywhere))) OR ((bucket_id = 'media'::text) AND ((storage.foldername(name))[1] = 'avatars'::text) AND ((storage.foldername(name))[2] = (( SELECT auth.uid() AS uid))::text)) OR ((bucket_id = 'readings'::text) AND ( SELECT private.piece_editor(((storage.foldername(objects.name))[1])::uuid) AS piece_editor)))  );

-- 2. The Qirtas Awards.
drop function if exists journal.award_results(text);
drop function if exists journal.prepare_award_certificates(uuid);
drop function if exists private.award_results(text);
drop function if exists private.prepare_award_certificates(uuid);
drop function if exists private.award_entry_valid() cascade;
drop function if exists private.runs_the_awards() cascade;
drop table journal.award_entries, journal.award_judges, journal.award_rounds, journal.awards cascade;

-- 3. The Apprenticeship and First Ink.
drop function if exists programmes.complete_apprenticeship(uuid);
drop function if exists private.complete_apprenticeship(uuid);
drop function if exists private.after_placement_given() cascade;
drop function if exists private.placement_valid() cascade;
drop table programmes.placements cascade;

-- 4. Prompts and the book vote.
drop function if exists programmes.ballot_counts(uuid);
drop function if exists private.ballot_counts(uuid);
drop function if exists private.book_choices_guard() cascade;
drop function if exists private.book_vote_matches() cascade;
drop table programmes.book_votes, programmes.book_choices, programmes.book_ballots, programmes.prompts cascade;

-- 5. Shifts belong to their event; no rotas, and no hours from shifts.
drop function if exists membership.record_shift_service(uuid, uuid);
drop function if exists private.record_shift_service(uuid, uuid);

drop policy "Programme managers manage shifts (delete)" on programmes.shifts;
drop policy "Programme managers manage shifts (insert)" on programmes.shifts;
drop policy "Programme managers manage shifts (update)" on programmes.shifts;
drop policy "Select by authenticated" on programmes.shifts;
drop policy "Select by authenticated" on programmes.shift_signups;
drop policy "Update by authenticated" on programmes.shift_signups;

delete from programmes.shifts where event_id is null;
alter table programmes.shifts drop column rota_id;
alter table programmes.shifts alter column event_id set not null;
drop table programmes.rotas cascade;

create policy "Select by authenticated" on programmes.shifts
  for select to authenticated
  using (
    (select private.membership_is_member())
    or (select private.manages_event(event_id))
  );
create policy "Event leads manage shifts (insert)" on programmes.shifts
  for insert to authenticated
  with check ((select private.manages_event(event_id)));
create policy "Event leads manage shifts (update)" on programmes.shifts
  for update to authenticated
  using ((select private.manages_event(event_id)))
  with check ((select private.manages_event(event_id)));
create policy "Event leads manage shifts (delete)" on programmes.shifts
  for delete to authenticated
  using ((select private.manages_event(event_id)));

create policy "Select by authenticated" on programmes.shift_signups
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from programmes.shifts s
      where s.id = shift_signups.shift_id and (select private.manages_event(s.event_id))
    )
  );
create policy "Update by authenticated" on programmes.shift_signups
  for update to authenticated
  using (
    user_id = (select auth.uid())
    or exists (
      select 1 from programmes.shifts s
      where s.id = shift_signups.shift_id and (select private.manages_event(s.event_id))
    )
  )
  with check (
    (user_id = (select auth.uid()) and status in ('confirmed', 'swap_requested', 'cancelled'))
    or exists (
      select 1 from programmes.shifts s
      where s.id = shift_signups.shift_id and (select private.manages_event(s.event_id))
    )
  );

-- 6. Service records are staff hours only (decisions §2); certificates
-- only for finishing Qalam and for the Mutanabbi Prize.
delete from membership.service_records where source <> 'manual';
alter table membership.service_records drop constraint service_records_source_check;
alter table membership.service_records drop constraint service_records_check;
alter table membership.service_records
  add constraint service_records_source_check check (source = 'manual');

delete from membership.certificates where kind not in ('qalam', 'prize');
alter table membership.certificates
  drop constraint certificates_kind_check,
  drop constraint certificates_check1,
  drop constraint certificates_check2,
  drop constraint certificates_check3,
  drop constraint certificates_check4,
  drop constraint certificates_award_citation;
alter table membership.certificates
  add constraint certificates_kind_check check (kind in ('qalam', 'prize')),
  add constraint certificates_prize_citation check (kind <> 'prize' or citation_en is not null);

comment on table membership.certificates is
  'Certificates for finishing Qalam and for the Mutanabbi Prize, nothing else (owner, Nov 7, 2026).';
comment on table membership.service_records is
  'Staff hours and service (the Council, the Qirtas masthead, team members), for service letters on request (owner, Nov 7, 2026). Event volunteers are logged by Student Life, not here.';

-- 7. Get involved lists open roles only (decisions §1): Council and team
-- roles, event teams and Qalam mentors; auditions come from productions.
drop function if exists programmes.open_places();
drop function if exists private.open_places();
delete from programmes.openings where kind not in ('role');
alter table programmes.openings
  drop constraint openings_kind_check,
  drop constraint openings_first_ink_partner,
  drop constraint openings_apprenticeship_term,
  drop constraint openings_desk_apprenticeship,
  drop constraint openings_partner_place;
alter table programmes.openings
  drop column desk,
  drop column term_from,
  drop column term_to,
  drop column partner_id,
  add column event_id uuid references events.events (id) on delete cascade;
create index openings_event_id_idx on programmes.openings (event_id);
alter table programmes.openings
  add constraint openings_kind_check check (kind in ('role', 'event_team', 'qalam_mentor')),
  add constraint openings_event_team check ((kind = 'event_team') = (event_id is not null));
comment on column programmes.openings.kind is
  'role (a Council or team role), event_team (a place on one event''s team) or qalam_mentor (owner, Nov 7, 2026). Auditions come from the Company''s productions.';

create function private.open_places()
returns table (
  id uuid, kind text, owner text, title_en text, title_ar text, body_en text,
  body_ar text, skills text[], closes_at timestamptz, places integer,
  event_slug text, created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select * from (
    select o.id, o.kind, o.owner, o.title_en, o.title_ar, o.body_en, o.body_ar,
      o.skills, o.closes_at, o.places, e.slug, o.created_at
    from programmes.openings o
    left join events.events e on e.id = o.event_id
    where o.is_open and (o.closes_at is null or o.closes_at > now())
      and (o.event_id is null or (e.status = 'published' and not e.members_only))
    union all
    select a.id, 'audition', 'program', pr.title_en, pr.title_ar,
      a.prepare_en, a.prepare_ar, '{}'::text[], a.starts_at, a.capacity,
      null, a.created_at
    from programmes.auditions a
    join programmes.productions pr on pr.id = a.production_id
    where pr.is_public and pr.stage = 'auditions' and a.starts_at > now()
  ) places
  order by places.closes_at nulls last, places.created_at desc;
$$;
revoke all on function private.open_places() from public;
grant execute on function private.open_places() to anon, authenticated, service_role;

create function programmes.open_places()
returns table (
  id uuid, kind text, owner text, title_en text, title_ar text, body_en text,
  body_ar text, skills text[], closes_at timestamptz, places integer,
  event_slug text, created_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.open_places() $$;
revoke all on function programmes.open_places() from public;
grant execute on function programmes.open_places() to anon, authenticated, service_role;

-- 8. The shared functions lose their retired parts.
create or replace function private.history_tables()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array[
    'events.events',
    'journal.pieces',
    'journal.issues',
    'journal.calls',
    'journal.puzzles',
    'programmes.productions',
    'programmes.episodes',
    'governance.partners',
    'governance.partner_agreements',
    'governance.elections',
    'governance.society_documents'
  ]
$$;

create or replace function private.profile_names_to_bylines()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update journal.contributors c
  set name_en = new.full_name_en, name_ar = new.full_name_ar
  where c.user_id = new.id and not c.is_pen_name;
  return null;
end;
$$;

CREATE OR REPLACE FUNCTION private.admin_overview()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  result jsonb := '{}'::jsonb;
begin
  if access.has_permission('members.manage') then
    result := result || jsonb_build_object(
      'members', (
        select count(*)
        from membership.memberships m
        join core.profiles p on p.id = m.user_id
        where p.verified_at is not null
      ),
      'voting_members', (
        select count(*)
        from membership.memberships m
        join core.profiles p on p.id = m.user_id
        where p.verified_at is not null and private.is_voting_member(m.user_id)
      )
    );
  end if;

  -- The Society verifies partners; partners verify their own people
  -- (owner, Oct 31, 2026). What waits is partner applications.
  if access.has_permission('partners.manage') or access.has_permission('partners.sign') then
    result := result || jsonb_build_object(
      'verification_pending', (
        select count(*) from private.partner_applications()
      ),
      'verification_oldest_at', (
        select min(applied_at) from private.partner_applications()
      )
    );
  end if;

  if access.has_permission_anywhere('events.manage') then
    result := result || jsonb_build_object(
      'upcoming_rsvps', (
        select count(*)
        from events.rsvps r
        join events.events e on e.id = r.event_id
        where r.status = 'confirmed'
          and e.starts_at > now()
          and (
            access.has_permission('events.manage')
            or access.has_permission('events.manage', 'programme', e.programme_id)
          )
      ),
      'next_event', (
        select jsonb_build_object(
          'title_en', e.title_en, 'title_ar', e.title_ar, 'starts_at', e.starts_at,
          'capacity', e.capacity, 'booked', events.confirmed_count(e.id)
        )
        from events.events e
        where e.status = 'published' and e.starts_at > now()
          and (
            access.has_permission('events.manage')
            or access.has_permission('events.manage', 'programme', e.programme_id)
          )
        order by e.starts_at
        limit 1
      )
    );
  end if;

  if access.has_permission_anywhere('journal.manage') then
    result := result || jsonb_build_object(
      'open_submissions', (
        select count(*)
        from journal.submissions s
        where s.status in ('received', 'intake_check', 'in_review', 'third_read', 'selection')
          and (
            access.has_permission('journal.manage')
            or access.has_permission('journal.manage', 'issue', private.call_issue(s.call_id))
          )
      ),
      'submissions_by_status', coalesce((
        select jsonb_object_agg(status, n)
        from (
          select s.status, count(*) as n, min(s.created_at) as oldest
          from journal.submissions s
          where s.status in ('received', 'intake_check', 'in_review', 'third_read', 'selection')
            and (
              access.has_permission('journal.manage')
              or access.has_permission('journal.manage', 'issue', private.call_issue(s.call_id))
            )
          group by s.status
        ) grouped
      ), '{}'::jsonb),
      'intake_oldest_at', (
        select min(s.created_at)
        from journal.submissions s
        where s.status in ('received', 'intake_check')
          and (
            access.has_permission('journal.manage')
            or access.has_permission('journal.manage', 'issue', private.call_issue(s.call_id))
          )
      )
    );
  end if;

  return result;
end;
$function$;

CREATE OR REPLACE FUNCTION private.daily_notices()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  queued integer := 0;
  today date := (now() at time zone 'Asia/Baghdad')::date;
  r record;
begin
  -- Events tomorrow (Baghdad): a reminder to everyone booked, and to
  -- everyone who asked to be reminded ("Remind me").
  for r in
    select e.id as event_id, v.user_id
    from events.events e
    join (
      select x.event_id, x.user_id from events.rsvps x where x.status = 'confirmed'
      union
      select m.event_id, m.user_id from events.reminders m
    ) v on v.event_id = e.id
    where e.status = 'published'
      and (e.starts_at at time zone 'Asia/Baghdad')::date = today + 1
  loop
    if private.enqueue_once('events.reminder',
         jsonb_build_object('event_id', r.event_id, 'user_id', r.user_id), interval '2 days') then
      queued := queued + 1;
    end if;
  end loop;

  -- Shifts tomorrow: a reminder to everyone on them.
  for r in
    select s.id as shift_id, g.user_id
    from programmes.shifts s
    join programmes.shift_signups g on g.shift_id = s.id
    where g.status in ('signed_up', 'confirmed')
      and (s.starts_at at time zone 'Asia/Baghdad')::date = today + 1
  loop
    if private.enqueue_once('programmes.shift_reminder',
         jsonb_build_object('shift_id', r.shift_id, 'user_id', r.user_id), interval '2 days') then
      queued := queued + 1;
    end if;
  end loop;

  -- Accepted work with no signed agreement after three days: weekly, for
  -- four weeks (then the editors follow up in person).
  for r in
    select s.id as submission_id, s.author_id as user_id
    from journal.submissions s
    join journal.blind_keys k on k.submission_id = s.id
    join journal.decisions d on d.blind_entry_id = k.blind_entry_id
    where s.status = 'accepted'
      and d.decided_at < now() - interval '3 days'
      and d.decided_at > now() - interval '31 days'
      and not exists (select 1 from journal.agreements a where a.submission_id = s.id)
  loop
    if private.enqueue_once('journal.agreement_reminder',
         jsonb_build_object('submission_id', r.submission_id, 'user_id', r.user_id), interval '7 days') then
      queued := queued + 1;
    end if;
  end loop;

  -- Roles ending within seven days: one notice.
  for r in
    select a.id as assignment_id, a.user_id
    from access.role_assignments a
    where a.ends_at between now() and now() + interval '7 days'
      and a.scope_type <> 'partner'
  loop
    if private.enqueue_once('access.role_ending',
         jsonb_build_object('assignment_id', r.assignment_id, 'user_id', r.user_id), interval '30 days') then
      queued := queued + 1;
    end if;
  end loop;

  -- Removal requests past their 24 hours: tell the managers again, daily.
  for r in
    select q.id as request_id, q.programme_id
    from programmes.removal_requests q
    where q.status in ('open', 'in_progress') and q.due_at < now()
  loop
    if private.enqueue_once('programmes.removal_overdue',
         jsonb_build_object('request_id', r.request_id, 'programme_id', r.programme_id), interval '20 hours') then
      queued := queued + 1;
    end if;
  end loop;

  -- A call opened since yesterday: tell everyone who asked ("Tell me when").
  for r in
    select c.id as call_id, a.user_id
    from journal.calls c
    cross join journal.call_alerts a
    where c.is_published
      and c.opens_at between now() - interval '1 day' and now()
      and c.closes_at > now()
  loop
    if private.enqueue_once('journal.call_opened',
         jsonb_build_object('call_id', r.call_id, 'user_id', r.user_id), interval '60 days') then
      queued := queued + 1;
    end if;
  end loop;

  -- Replies on Get involved since yesterday: one digest for Membership.
  if exists (
    select 1 from programmes.opening_replies x
    where x.created_at > now() - interval '1 day'
  ) then
    if private.enqueue_once('programmes.replies_digest',
         jsonb_build_object('day', today), interval '2 days') then
      queued := queued + 1;
    end if;
  end if;

  return queued;
end;
$function$;
