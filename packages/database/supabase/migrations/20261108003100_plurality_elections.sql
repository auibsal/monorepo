-- Elections by plurality with a majority (audit C10; decisions §4).
--
-- One vote per seat. A candidate needs a majority of the votes cast
-- (abstentions are not votes cast, Robert's Rules); otherwise the top two
-- go to a runoff within a week, on the same voter list. A tie in the
-- runoff is decided by lot at a public meeting, and the draw is recorded.
-- An uncontested race keeps its one choice: elect, or reopen nominations.
-- Ranked ballots and instant runoff are retired.
--
-- Also: the Student Life lists (the candidates, and the Council each term)
-- and the date by which a Council member found not eligible must recover.

-- ── Results and runoffs ──────────────────────────────────────────────────────

alter table governance.election_results
  add column abstained integer not null default 0,
  add column runoff_candidate_ids uuid[],
  add column decided_by_lot boolean not null default false;

comment on column governance.election_results.rounds is
  'The count: [{ "tallies": { "<candidate id>" | "RON": votes }, "votes_cast": n, "abstained": n }].';
comment on column governance.election_results.runoff_candidate_ids is
  'No majority: the candidates who go to the runoff (the top two, more on a tie for second). In a runoff, the candidates tied for first, to be decided by lot.';
comment on column governance.election_results.decided_by_lot is
  'A runoff tied and the seat was decided by lot at a public meeting (Bylaws 1.7).';

alter table governance.elections
  add column runoff_of uuid references governance.elections (id) on delete cascade;
create index elections_runoff_of_idx on governance.elections (runoff_of);

comment on column governance.elections.runoff_of is
  'A runoff: the election whose count gave no majority. Same voters, the top two candidates, within a week of its close.';

-- A ballot is one choice per seat: { "<position id>": ["<candidate id>" | "RON"] },
-- or an empty list to abstain on that seat.
create or replace function private.cast_ballot(election_id uuid, choices jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  e governance.elections;
  position_key text;
  pick jsonb;
  choice text;
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
    for position_key, pick in select * from jsonb_each(choices) loop
      if not exists (
        select 1 from governance.positions p
        where p.id::text = position_key and p.election_id = e.id
      ) or jsonb_typeof(pick) <> 'array' then
        raise exception 'Invalid ballot' using errcode = '22023';
      end if;
      if jsonb_array_length(pick) > 1 then
        raise exception 'One choice per seat' using errcode = '22023';
      end if;
      if jsonb_array_length(pick) = 0 then
        continue;
      end if;

      choice := pick ->> 0;
      select count(*) into approved_count from governance.candidates c
      where c.position_id::text = position_key and c.status = 'approved';
      if choice = 'RON' then
        if approved_count > 1 then
          raise exception 'Reopening nominations is offered on uncontested races only' using errcode = '22023';
        end if;
      elsif not exists (
        select 1 from governance.candidates c
        where c.id::text = choice and c.position_id::text = position_key and c.status = 'approved'
      ) then
        raise exception 'Invalid ballot' using errcode = '22023';
      end if;
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

-- The count for one seat: plurality, a majority of the votes cast to win.
create or replace function private.count_position(election_id uuid, position_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  options text[];
  tallies jsonb;
  cast_total integer;
  abstained_total integer;
  top_option text;
  top_votes integer;
  second_votes integer;
  runoff uuid[];
  is_runoff boolean;
begin
  select e.runoff_of is not null into is_runoff
  from governance.elections e where e.id = count_position.election_id;

  select array_agg(c.id::text order by c.id) into options
  from governance.candidates c
  where c.position_id = count_position.position_id and c.status = 'approved';
  options := coalesce(options, array[]::text[]);
  if cardinality(options) <= 1 and not is_runoff then
    options := options || 'RON'::text;
  end if;

  with picks as (
    select b.choices -> count_position.position_id::text ->> 0 as pick
    from governance.ballots b
    where b.election_id = count_position.election_id
  )
  select
    coalesce(jsonb_object_agg(o, coalesce(t.n, 0)), '{}'),
    coalesce(sum(t.n), 0)::integer,
    (select count(*) from picks where pick is null)::integer
  into tallies, cast_total, abstained_total
  from unnest(options) o
  left join (select pick, count(*)::integer as n from picks where pick is not null group by pick) t
    on t.pick = o;

  select key, value::integer into top_option, top_votes
  from jsonb_each_text(tallies) order by value::integer desc, key limit 1;

  runoff := null;
  if cast_total = 0 or top_votes * 2 <= cast_total then
    -- No majority. A runoff takes the top two (and anyone tied for second);
    -- in a runoff, a tie for first goes to the draw.
    if cast_total > 0 and not is_runoff then
      select value::integer into second_votes from jsonb_each_text(tallies)
      where key <> 'RON' order by value::integer desc offset 1 limit 1;
      select array_agg(key::uuid order by value::integer desc, key) into runoff
      from jsonb_each_text(tallies)
      where key <> 'RON' and value::integer >= coalesce(second_votes, top_votes) and value::integer > 0;
    elsif cast_total > 0 then
      select array_agg(key::uuid order by key) into runoff
      from jsonb_each_text(tallies)
      where key <> 'RON' and value::integer = top_votes;
    end if;
    top_option := null;
  end if;

  insert into governance.election_results
    (election_id, position_id, rounds, winner_candidate_id, ron_won, ballots_counted,
     abstained, runoff_candidate_ids, decided_by_lot)
  values (
    count_position.election_id,
    count_position.position_id,
    jsonb_build_array(jsonb_build_object(
      'tallies', tallies, 'votes_cast', cast_total, 'abstained', abstained_total)),
    case when top_option is not null and top_option <> 'RON' then top_option::uuid end,
    coalesce(top_option = 'RON', false),
    cast_total,
    abstained_total,
    runoff,
    false
  )
  on conflict (election_id, position_id) do update
    set rounds = excluded.rounds,
        winner_candidate_id = excluded.winner_candidate_id,
        ron_won = excluded.ron_won,
        ballots_counted = excluded.ballots_counted,
        abstained = excluded.abstained,
        runoff_candidate_ids = excluded.runoff_candidate_ids,
        decided_by_lot = false,
        computed_at = now();
end;
$$;

-- The Elections Committee opens a seat's runoff: the same voters, the
-- candidates the count named, voting closing within a week of the first
-- election's close.
create function private.start_runoff(
  election_id uuid,
  position_id uuid,
  opens_at timestamptz,
  closes_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  e governance.elections;
  p governance.positions;
  r governance.election_results;
  new_id uuid := gen_random_uuid();
  new_position uuid := gen_random_uuid();
begin
  if not access.has_permission('elections.manage') then
    raise exception 'elections.manage is required' using errcode = '42501';
  end if;
  select * into e from governance.elections where id = start_runoff.election_id;
  select * into p from governance.positions
  where id = start_runoff.position_id and positions.election_id = start_runoff.election_id;
  select * into r from governance.election_results
  where election_results.election_id = start_runoff.election_id
    and election_results.position_id = start_runoff.position_id;
  if e.id is null or p.id is null or r.position_id is null
     or e.status not in ('closed', 'published') or e.runoff_of is not null
     or coalesce(cardinality(r.runoff_candidate_ids), 0) < 2 then
    raise exception 'no_runoff_due' using errcode = '22023';
  end if;
  if exists (
    select 1 from governance.elections x
    join governance.positions xp on xp.election_id = x.id
    where x.runoff_of = e.id and xp.role_key = p.role_key
  ) then
    raise exception 'runoff_exists' using errcode = '23505';
  end if;
  if opens_at < now() - interval '5 minutes' or closes_at <= opens_at
     or closes_at > e.voting_closes_at + interval '7 days' then
    raise exception 'runoff_within_a_week' using errcode = '22023';
  end if;

  insert into governance.elections (
    id, title_en, title_ar, status, kind, electorate,
    nominations_open_at, nominations_close_at, voting_opens_at, voting_closes_at,
    eligible_count, voting_point_en, voting_point_ar, voting_point_at, runoff_of, notice_given_at
  ) values (
    new_id,
    'Runoff: ' || p.title_en, 'جولة الإعادة: ' || p.title_ar, 'voting', 'election', e.electorate,
    least(opens_at, now()) - interval '2 seconds', least(opens_at, now()) - interval '1 second',
    opens_at, closes_at,
    e.eligible_count, e.voting_point_en, e.voting_point_ar, e.voting_point_at, e.id, e.notice_given_at
  );
  insert into governance.positions (id, election_id, role_key, title_en, title_ar, sort)
  values (new_position, new_id, p.role_key, p.title_en, p.title_ar, p.sort);
  insert into governance.candidates (
    position_id, user_id, statement_en, statement_ar, status, decided_by, decided_at,
    gpa_consent, student_life_answer
  )
  select new_position, c.user_id, c.statement_en, c.statement_ar, 'approved', auth.uid(), now(),
    c.gpa_consent, c.student_life_answer
  from governance.candidates c
  where c.id = any (r.runoff_candidate_ids);
  insert into governance.voters (election_id, user_id)
  select new_id, v.user_id from governance.voters v where v.election_id = e.id;
  return new_id;
end;
$$;

revoke all on function private.start_runoff(uuid, uuid, timestamptz, timestamptz) from public, anon;
grant execute on function private.start_runoff(uuid, uuid, timestamptz, timestamptz) to authenticated;

create function governance.start_runoff(
  election_id uuid,
  position_id uuid,
  opens_at timestamptz,
  closes_at timestamptz
)
returns uuid
language sql
security invoker
set search_path = ''
as $$ select private.start_runoff(election_id, position_id, opens_at, closes_at) $$;

revoke all on function governance.start_runoff(uuid, uuid, timestamptz, timestamptz) from public, anon;
grant execute on function governance.start_runoff(uuid, uuid, timestamptz, timestamptz) to authenticated;

-- A runoff that tied: the Committee records the draw made at a public meeting.
create function private.record_lot(election_id uuid, position_id uuid, candidate_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not access.has_permission('elections.manage') then
    raise exception 'elections.manage is required' using errcode = '42501';
  end if;
  update governance.election_results r
  set winner_candidate_id = record_lot.candidate_id, decided_by_lot = true, computed_at = now()
  from governance.elections e
  where r.election_id = record_lot.election_id and r.position_id = record_lot.position_id
    and e.id = r.election_id and e.runoff_of is not null
    and r.winner_candidate_id is null
    and record_lot.candidate_id = any (r.runoff_candidate_ids);
  if not found then
    raise exception 'no_tie_to_draw' using errcode = '22023';
  end if;
end;
$$;

revoke all on function private.record_lot(uuid, uuid, uuid) from public, anon;
grant execute on function private.record_lot(uuid, uuid, uuid) to authenticated;

create function governance.record_lot(election_id uuid, position_id uuid, candidate_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.record_lot(election_id, position_id, candidate_id) $$;

revoke all on function governance.record_lot(uuid, uuid, uuid) from public, anon;
grant execute on function governance.record_lot(uuid, uuid, uuid) to authenticated;

-- ── The Student Life lists ─────────────────────────────────────────────────

-- The names Student Life checks for GPA eligibility: an election's
-- candidates, or (no election given) everyone holding a Council seat now.
-- Name, AUIB address and seat only; the answer is recorded on the site.
create function private.student_life_list(election_id uuid default null)
returns table (full_name_en text, full_name_ar text, email text, seat_en text, seat_ar text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if student_life_list.election_id is not null then
    if not access.has_permission('elections.manage') then
      raise exception 'elections.manage is required' using errcode = '42501';
    end if;
    return query
    select p.full_name_en, p.full_name_ar, u.email::text, pos.title_en, pos.title_ar
    from governance.candidates c
    join governance.positions pos on pos.id = c.position_id
    join core.profiles p on p.id = c.user_id
    join auth.users u on u.id = c.user_id
    where pos.election_id = student_life_list.election_id
      and c.status in ('nominated', 'approved')
    order by pos.sort, p.full_name_en;
  else
    if not access.has_permission('governance.manage') then
      raise exception 'governance.manage is required' using errcode = '42501';
    end if;
    return query
    select p.full_name_en, p.full_name_ar, u.email::text, r.name_en, r.name_ar
    from access.role_assignments a
    join access.roles r on r.key = a.role
    join core.profiles p on p.id = a.user_id
    join auth.users u on u.id = a.user_id
    where r.is_council and a.scope_type = 'global'
      and a.starts_at <= now() and (a.ends_at is null or a.ends_at > now())
    order by r.sort, p.full_name_en;
  end if;
end;
$$;

revoke all on function private.student_life_list(uuid) from public, anon;
grant execute on function private.student_life_list(uuid) to authenticated;

create function governance.student_life_list(election_id uuid default null)
returns table (full_name_en text, full_name_ar text, email text, seat_en text, seat_ar text)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.student_life_list(election_id) $$;

revoke all on function governance.student_life_list(uuid) from public, anon;
grant execute on function governance.student_life_list(uuid) to authenticated;

-- ── One term to recover ─────────────────────────────────────────────────────

-- A Council member Student Life finds not eligible has until the end of
-- the next semester to recover (Bylaws 4.6); the date is kept with the
-- answer, and cleared when a later answer is "eligible".
alter table access.role_assignments add column recovery_by date;

comment on column access.role_assignments.recovery_by is
  'Set when Student Life answers not_eligible: the end of the next semester, by which the holder must be eligible again (Bylaws 4.6). Cleared on an eligible answer.';

create function private.set_recovery_by()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.student_life_answer = 'not_eligible'
     and old.student_life_answer is distinct from 'not_eligible' then
    new.recovery_by := coalesce(
      (select s.ends_on from core.semesters s
       where s.starts_on > current_date and s.code !~ '^summer'
       order by s.starts_on limit 1),
      current_date + 180
    );
  elsif new.student_life_answer = 'eligible' then
    new.recovery_by := null;
  end if;
  return new;
end;
$$;

revoke all on function private.set_recovery_by() from public, anon, authenticated;

create trigger set_recovery_by before update of student_life_answer on access.role_assignments
  for each row execute function private.set_recovery_by();
