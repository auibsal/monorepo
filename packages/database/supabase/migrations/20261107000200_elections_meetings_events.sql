-- Elections, meetings and events (owner, Nov 7, 2026; claude/decisions.md
-- §1, §2 and §4), on the American standard.

-- 1. Elections and members' votes.
--
-- Officers are elected by voting members; the Editor-in-Chief by Qirtas's
-- staff (editors and contributors with at least one term on Qirtas).
-- Members may also vote online on any members' vote (a motion or an
-- amendment). Votes are cast online on auibsal.org over a set window, with
-- a voting point in person at the meeting: a staffed device where members
-- sign in and vote on the same ballot.
alter table governance.elections
  add column kind text not null default 'election' check (kind in ('election', 'vote')),
  add column electorate text not null default 'members' check (electorate in ('members', 'qirtas_staff')),
  add column question_en text check (char_length(question_en) <= 2000),
  add column question_ar text check (char_length(question_ar) <= 2000),
  add column voting_point_en text check (char_length(voting_point_en) <= 300),
  add column voting_point_ar text check (char_length(voting_point_ar) <= 300),
  add column voting_point_at timestamptz,
  add constraint elections_vote_question check (kind <> 'vote' or question_en is not null);

comment on column governance.elections.kind is
  'election (seats, with positions and candidates) or vote (a members'' vote on a motion or an amendment: yes, no or abstain). Owner, Nov 7, 2026.';
comment on column governance.elections.electorate is
  'members (voting members: two events or general meetings this academic year) or qirtas_staff (editors and contributors with at least one term on Qirtas, for the Editor-in-Chief).';
comment on column governance.elections.voting_point_en is
  'Where the in-person voting point is, at the meeting; members vote there on the same online ballot.';

-- Qirtas's staff for the Editor-in-Chief's election: members who held a
-- Qirtas role, or had a piece published, before the current term began.
create function private.is_qirtas_staff_voter(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with term as (
    select coalesce((select c.starts_on from core.current_semester() c), private.academic_year_start()) as starts_on
  )
  select private.is_member(uid) and (
    exists (
      select 1 from access.role_assignments a
      join access.role_permissions rp on rp.role = a.role
      where a.user_id = uid
        and rp.permission like 'journal.%'
        and (a.starts_at at time zone 'Asia/Baghdad')::date < (select starts_on from term)
    )
    or exists (
      select 1 from journal.pieces p
      join journal.contributors c on c.id = p.contributor_id
      where c.user_id = uid and p.status = 'published'
        and (p.published_at at time zone 'Asia/Baghdad')::date < (select starts_on from term)
    )
  );
$$;

revoke all on function private.is_qirtas_staff_voter(uuid) from public, anon, authenticated;

create or replace function private.give_notice(election_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  e governance.elections;
  n integer;
begin
  if not access.has_permission('elections.manage') then
    raise exception 'elections.manage is required' using errcode = '42501';
  end if;
  select * into e from governance.elections where id = give_notice.election_id for update;
  if not found or e.status <> 'draft' then
    raise exception 'Notice can be given only for a draft election' using errcode = '22023';
  end if;
  if e.kind = 'election' and not exists (select 1 from governance.positions p where p.election_id = e.id) then
    raise exception 'Add the offices before giving notice' using errcode = '22023';
  end if;
  -- Two weeks' written notice for a members' vote (an amendment's text
  -- above all); one week before nominations for an election.
  if e.kind = 'vote' and e.voting_opens_at < now() + interval '14 days' then
    raise exception 'A members'' vote needs two weeks'' notice' using errcode = '22023';
  end if;
  if e.kind = 'election' and e.nominations_open_at < now() + interval '7 days' then
    raise exception 'Notice must be given at least one week before nominations open'
      using errcode = '22023';
  end if;

  insert into governance.voters (election_id, user_id)
  select e.id, m.user_id from membership.memberships m
  where case e.electorate
    when 'qirtas_staff' then private.is_qirtas_staff_voter(m.user_id)
    else private.is_voting_member(m.user_id)
  end
  on conflict do nothing;
  get diagnostics n = row_count;

  update governance.elections
  set status = 'notice', notice_given_at = now(), eligible_count = n
  where id = e.id;
  return n;
end;
$$;

-- Candidates (decisions §4): members in good standing, enrolled at AUIB,
-- members for at least one term, with a cumulative GPA of at least 2.0.
-- The GPA is checked only through Student Life, never by asking for
-- grades: each candidate consents on the nomination form, the Elections
-- Committee sends the candidate list to Student Life before the ballot
-- opens and records the answer, "eligible" or "not eligible". The Society
-- never sees or stores grades.
alter table governance.candidates
  add column gpa_consent boolean not null default false,
  add column student_life_answer text check (student_life_answer in ('eligible', 'not_eligible')),
  add column student_life_answered_at timestamptz;

comment on column governance.candidates.student_life_answer is
  'Student Life''s answer to the GPA check: eligible or not_eligible. No grade is ever stored (owner, Nov 7, 2026).';

drop function if exists governance.nominate(uuid, text, text);
drop function if exists private.nominate(uuid, text, text);

create function private.nominate(position_id uuid, statement_en text, gpa_consent boolean, statement_ar text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  p governance.positions;
  e governance.elections;
  new_id uuid;
  past_terms integer;
  term_start date := coalesce((select c.starts_on from core.current_semester() c), private.academic_year_start());
begin
  select * into p from governance.positions where id = nominate.position_id;
  select * into e from governance.elections where id = p.election_id;
  if not found or e.status <> 'nominations'
     or now() not between e.nominations_open_at and e.nominations_close_at then
    raise exception 'Nominations are not open' using errcode = '22023';
  end if;
  if not coalesce(nominate.gpa_consent, false) then
    raise exception 'gpa_consent_required' using errcode = '23514';
  end if;
  if not exists (
    select 1 from membership.memberships m
    where m.user_id = auth.uid() and m.tier = 'member'
      and m.member_since < term_start
  ) or not private.is_member(auth.uid()) then
    raise exception 'Candidates are Members of at least one term' using errcode = '42501';
  end if;
  -- Only someone on the voter list, frozen when notice was given, stands.
  if not exists (
    select 1 from governance.voters v
    where v.election_id = e.id and v.user_id = auth.uid()
  ) then
    raise exception 'Only voting members on the voter list can stand' using errcode = '42501';
  end if;
  if e.electorate = 'qirtas_staff' and not private.is_qirtas_staff_voter(auth.uid()) then
    raise exception 'Only Qirtas staff of at least one term can stand' using errcode = '42501';
  end if;
  if private.is_elections_committee_member(auth.uid()) then
    raise exception 'Members of the Elections Committee cannot stand' using errcode = '42501';
  end if;

  -- The President may serve at most two terms.
  if p.role_key = 'president' then
    select count(*) into past_terms from access.role_assignments a
    where a.user_id = auth.uid() and a.role = 'president' and a.scope_type = 'global'
      and a.note is distinct from 'founder-pre-election';
    if past_terms >= 2 then
      raise exception 'The President may serve at most two terms' using errcode = '23514';
    end if;
  end if;

  insert into governance.candidates (position_id, user_id, statement_en, statement_ar, gpa_consent)
  values (p.id, auth.uid(), nominate.statement_en, nominate.statement_ar, true)
  returning id into new_id;
  return new_id;
end;
$$;

revoke all on function private.nominate(uuid, text, boolean, text) from public, anon;
grant execute on function private.nominate(uuid, text, boolean, text) to authenticated;

create function governance.nominate(position_id uuid, statement_en text, gpa_consent boolean, statement_ar text default null)
returns uuid
language sql
security invoker
set search_path = ''
as $$ select private.nominate(position_id, statement_en, gpa_consent, statement_ar) $$;

revoke all on function governance.nominate(uuid, text, boolean, text) from public, anon;
grant execute on function governance.nominate(uuid, text, boolean, text) to authenticated;

-- The Elections Committee records Student Life's answer for each candidate.
create function private.record_gpa_check(candidate_id uuid, eligible boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not access.has_permission('elections.manage') then
    raise exception 'elections.manage is required' using errcode = '42501';
  end if;
  update governance.candidates
  set student_life_answer = case when eligible then 'eligible' else 'not_eligible' end,
      student_life_answered_at = now()
  where id = record_gpa_check.candidate_id;
end;
$$;

revoke all on function private.record_gpa_check(uuid, boolean) from public, anon;
grant execute on function private.record_gpa_check(uuid, boolean) to authenticated;

create function governance.record_gpa_check(candidate_id uuid, eligible boolean)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.record_gpa_check(candidate_id, eligible) $$;

revoke all on function governance.record_gpa_check(uuid, boolean) from public, anon;
grant execute on function governance.record_gpa_check(uuid, boolean) to authenticated;

-- A candidate is approved only with Student Life's "eligible".
create or replace function private.decide_candidate(candidate_id uuid, approve boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not access.has_permission('elections.manage') then
    raise exception 'elections.manage is required' using errcode = '42501';
  end if;
  if approve and not exists (
    select 1 from governance.candidates c
    where c.id = decide_candidate.candidate_id and c.student_life_answer = 'eligible'
  ) then
    raise exception 'student_life_check_required' using errcode = '23514';
  end if;
  update governance.candidates
  set status = case when approve then 'approved' else 'rejected' end,
      decided_by = auth.uid(), decided_at = now()
  where id = candidate_id and status in ('nominated', 'approved', 'rejected');
end;
$$;

-- Voting can't open while a candidate waits for Student Life's answer.
create or replace function private.open_voting(election_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  e governance.elections;
begin
  if not access.has_permission('elections.manage') then
    raise exception 'elections.manage is required' using errcode = '42501';
  end if;
  select * into e from governance.elections where id = open_voting.election_id for update;
  if not found then
    raise exception 'Election not found' using errcode = 'P0002';
  end if;
  if e.kind = 'election' and e.status not in ('nominations', 'review') then
    raise exception 'Voting can only open after nominations' using errcode = '22023';
  end if;
  if e.kind = 'vote' and e.status not in ('notice', 'nominations', 'review') then
    raise exception 'Give notice before the vote opens' using errcode = '22023';
  end if;
  if exists (
    select 1 from governance.candidates c
    join governance.positions p on p.id = c.position_id
    where p.election_id = e.id and c.status = 'nominated'
  ) then
    raise exception 'Decide every candidate first' using errcode = '22023';
  end if;
  update governance.elections set status = 'voting' where id = e.id;
  return e.eligible_count;
end;
$$;

-- A members' vote is cast as {"answer": "yes" | "no" | "abstain"}.
create or replace function private.cast_ballot(election_id uuid, choices jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  e governance.elections;
  position_key text;
  ranking jsonb;
  choice text;
  seen text[];
  approved_count integer;
begin
  select * into e from governance.elections where id = cast_ballot.election_id;
  if not found or e.status <> 'voting'
     or now() not between e.voting_opens_at and e.voting_closes_at then
    raise exception 'Voting is not open' using errcode = '22023';
  end if;
  if not exists (
    select 1 from auth.users u
    where u.id = auth.uid() and u.email_confirmed_at is not null
      and private.is_auib_email(u.email)
  ) then
    raise exception 'Voting needs a confirmed AUIB account (@auib.edu.iq)' using errcode = '42501';
  end if;
  if not exists (
    select 1 from governance.voters v
    where v.election_id = e.id and v.user_id = auth.uid()
  ) then
    raise exception 'You are not on the voter list for this election' using errcode = '42501';
  end if;
  if jsonb_typeof(choices) <> 'object' then
    raise exception 'Invalid ballot' using errcode = '22023';
  end if;

  if e.kind = 'vote' then
    if (select count(*) from jsonb_object_keys(choices)) <> 1
      or coalesce(choices ->> 'answer', '') not in ('yes', 'no', 'abstain') then
      raise exception 'Invalid ballot' using errcode = '22023';
    end if;
  else
    for position_key, ranking in select * from jsonb_each(choices) loop
      if not exists (
        select 1 from governance.positions p
        where p.id::text = position_key and p.election_id = e.id
      ) or jsonb_typeof(ranking) <> 'array' then
        raise exception 'Invalid ballot' using errcode = '22023';
      end if;

      select count(*) into approved_count from governance.candidates c
      where c.position_id::text = position_key and c.status = 'approved';

      seen := array[]::text[];
      for choice in select jsonb_array_elements_text(ranking) loop
        if choice = any (seen) then
          raise exception 'Each choice may be ranked once' using errcode = '22023';
        end if;
        if choice = 'RON' then
          if approved_count > 1 then
            raise exception 'RON is offered on uncontested races only' using errcode = '22023';
          end if;
        elsif not exists (
          select 1 from governance.candidates c
          where c.id::text = choice and c.position_id::text = position_key and c.status = 'approved'
        ) then
          raise exception 'Invalid ballot' using errcode = '22023';
        end if;
        seen := seen || choice::text;
      end loop;
    end loop;
  end if;

  -- One ballot per voter: the receipt's primary key refuses a second one.
  insert into governance.ballot_receipts (election_id, user_id) values (e.id, auth.uid());
  insert into governance.ballots (election_id, choices) values (e.id, cast_ballot.choices);
exception
  when unique_violation then
    raise exception 'You have already voted' using errcode = '23505';
end;
$$;

-- The tally of a members' vote: yes, no and abstain, once it has closed.
create function private.vote_tally(election_id uuid)
returns table (answer text, votes integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  e governance.elections;
begin
  select * into e from governance.elections where id = vote_tally.election_id;
  if not found or e.kind <> 'vote' then
    raise exception 'Not a members'' vote' using errcode = '22023';
  end if;
  if e.status not in ('closed', 'published') and not access.has_permission('elections.manage') then
    raise exception 'The tally shows once the vote has closed' using errcode = '42501';
  end if;
  return query
  select a.answer, count(b.*)::integer
  from (values ('yes'), ('no'), ('abstain')) a(answer)
  left join governance.ballots b on b.election_id = e.id and b.choices ->> 'answer' = a.answer
  group by a.answer
  order by array_position(array['yes', 'no', 'abstain'], a.answer);
end;
$$;

revoke all on function private.vote_tally(uuid) from public, anon;
grant execute on function private.vote_tally(uuid) to authenticated;

create function governance.vote_tally(election_id uuid)
returns table (answer text, votes integer)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.vote_tally(election_id) $$;

revoke all on function governance.vote_tally(uuid) from public, anon;
grant execute on function governance.vote_tally(uuid) to authenticated;

-- Appointed directors are checked the same way before confirmation, and
-- the General Secretary sends the full Council list to Student Life each
-- term; the answer is recorded on the assignment, never a grade.
alter table access.role_assignments
  add column student_life_answer text check (student_life_answer in ('eligible', 'not_eligible')),
  add column student_life_answered_at timestamptz;

comment on column access.role_assignments.student_life_answer is
  'Student Life''s answer to the GPA check for a Council seat (each term and before a director is confirmed): eligible or not_eligible. No grade is ever stored. Owner, Nov 7, 2026.';

create function private.record_seat_check(assignment_id uuid, eligible boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not access.has_permission('governance.manage') then
    raise exception 'governance.manage is required' using errcode = '42501';
  end if;
  update access.role_assignments
  set student_life_answer = case when eligible then 'eligible' else 'not_eligible' end,
      student_life_answered_at = now()
  where id = record_seat_check.assignment_id;
end;
$$;

revoke all on function private.record_seat_check(uuid, boolean) from public, anon;
grant execute on function private.record_seat_check(uuid, boolean) to authenticated;

create function access.record_seat_check(assignment_id uuid, eligible boolean)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.record_seat_check(assignment_id, eligible) $$;

revoke all on function access.record_seat_check(uuid, boolean) from public, anon;
grant execute on function access.record_seat_check(uuid, boolean) to authenticated;

-- A Council director is confirmed only with Student Life's "eligible".
create or replace function private.confirm_assignment(assignment_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  a access.role_assignments;
begin
  select * into a from access.role_assignments where id = confirm_assignment.assignment_id;
  if not found then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if not (
    access.has_permission('roles.assign')
    or (a.assigned_by is not null and a.assigned_by = (select auth.uid()))
  ) then
    raise exception 'roles.assign or the appointer is required' using errcode = '42501';
  end if;
  if exists (select 1 from access.roles r where r.key = a.role and r.is_council)
    and a.student_life_answer is distinct from 'eligible' then
    raise exception 'student_life_check_required' using errcode = '23514';
  end if;
  update access.role_assignments
  set confirmed_at = now(), confirmed_by = (select auth.uid())
  where id = a.id and confirmed_at is null;
end;
$$;

-- 2. Meetings (decisions §4): Council meetings, general meetings (every
-- two weeks in term), the Annual Meeting, special meetings and the
-- Founding Meeting. "General Assembly" and "AGM" are retired names.
alter table governance.minutes drop constraint minutes_body_check;
update governance.minutes set body = 'general' where body = 'general_assembly';
alter table governance.minutes add constraint minutes_body_check
  check (body in ('council', 'general', 'annual', 'special', 'founding'));

alter table governance.resolutions drop constraint resolutions_body_check;
update governance.resolutions set body = 'general' where body = 'general_assembly';
alter table governance.resolutions add constraint resolutions_body_check
  check (body in ('council', 'general', 'annual', 'special', 'founding'));

comment on column governance.minutes.body is
  'council, general (a general meeting), annual (the Annual Meeting), special or founding (the Founding Meeting). Owner, Nov 7, 2026.';

-- 3. Off campus stays a standard field on every event (owner's answer,
-- Nov 7, 2026): Student Life's written approval is recorded on the event,
-- the day and who approved, before an off-campus event can be published.
alter table events.events
  add column student_life_approved_by text check (char_length(student_life_approved_by) <= 120);

comment on column events.events.student_life_approved_by is
  'Who approved an off-campus event in writing for Student Life (for example "Ali Najm, Campus Recreation Officer"). Recorded with student_life_approved_on by the General Secretary.';

drop function if exists events.record_approval(uuid, date);
drop function if exists private.record_approval(uuid, date);

create function private.record_approval(event_id uuid, approved_on date, approved_by text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  e events.events;
begin
  if not access.has_permission('governance.manage', 'global', null) then
    raise exception 'approval_by_general_secretary' using errcode = '42501';
  end if;
  select * into e from events.events where id = record_approval.event_id;
  if not found or not e.off_campus then
    raise exception 'not_a_trip' using errcode = '22023';
  end if;
  if approved_on is null and e.status = 'published' then
    raise exception 'unpublish_first' using errcode = '22023';
  end if;
  if approved_on is not null and nullif(btrim(coalesce(approved_by, '')), '') is null then
    raise exception 'approved_by_required' using errcode = '23514';
  end if;
  if approved_on > (now() at time zone 'Asia/Baghdad')::date then
    raise exception 'approval_in_future' using errcode = '22023';
  end if;
  perform set_config('sal.recording_approval', 'on', true);
  update events.events
  set student_life_approved_on = record_approval.approved_on,
      student_life_approved_by = case when record_approval.approved_on is null then null
        else btrim(record_approval.approved_by) end
  where id = record_approval.event_id;
  perform set_config('sal.recording_approval', 'off', true);
end;
$$;

revoke all on function private.record_approval(uuid, date, text) from public, anon;
grant execute on function private.record_approval(uuid, date, text) to authenticated;

create function events.record_approval(event_id uuid, approved_on date, approved_by text)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.record_approval(event_id, approved_on, approved_by) $$;

revoke all on function events.record_approval(uuid, date, text) from public, anon;
grant execute on function events.record_approval(uuid, date, text) to authenticated;

create or replace function private.trip_needs_approval()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Only the record_approval function writes the approval.
  if (
      new.student_life_approved_on is distinct from
        (case when tg_op = 'UPDATE' then old.student_life_approved_on end)
      or new.student_life_approved_by is distinct from
        (case when tg_op = 'UPDATE' then old.student_life_approved_by end)
    )
    and coalesce(current_setting('sal.recording_approval', true), '') <> 'on'
  then
    raise exception 'approval_by_general_secretary' using errcode = '42501';
  end if;
  -- An event stays off campus unless the General Secretary changes it.
  if tg_op = 'UPDATE'
    and old.off_campus
    and not new.off_campus
    and auth.uid() is not null
    and not access.has_permission('governance.manage', 'global', null)
  then
    raise exception 'approval_by_general_secretary' using errcode = '42501';
  end if;
  if new.off_campus
    and new.status = 'published'
    and (new.student_life_approved_on is null or new.student_life_approved_by is null)
  then
    raise exception 'trip_needs_approval' using errcode = '23514';
  end if;
  return new;
end;
$$;

-- 4. Events are made in Notion's Events database and copied to the site
-- (decisions §1); the Diwan no longer creates them. Officers still edit
-- an event's site-only parts on its page (needs, shifts, the partner
-- checklist, links, minutes).
--
-- The April 9, 2027 trip was canceled in Notion (owner, Nov 7, 2026): its
-- draft goes. The April 23 trip is the Earth Day event (backup April 30).
delete from core.notion_links
where kind = 'event'
  and record_key in (
    select id::text from events.events where slug = 'book-circle-2027-04-09' and status = 'draft'
  );
delete from events.events where slug = 'book-circle-2027-04-09' and status = 'draft';
