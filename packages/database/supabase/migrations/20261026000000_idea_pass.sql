-- The IDEA Pass (owner, 2026-10-26): the only way to sign in to
-- auibsal.org, and where students prove they study at AUIB. SAL keeps its
-- own accounts and data: a Pass is linked to one SAL account here, and a
-- sign-in through it opens that account's ordinary session (RLS, roles and
-- the officers' second step are unchanged).
--
-- The Pass shares a yes or no for student status and, if the person allows
-- it, their verified university address, and gives SAL its own id for each
-- person.
-- So an existing account is found by the link, or by the Pass's verified
-- address or verified AUIB address (its student_email answer, when the
-- person shares it) when that is the account's own; anyone else links
-- their account once from the old sign-in. A student status from the Pass makes a member
-- (as a confirmed AUIB address does) and counts for ballots while it lasts.
-- Only the API routes call these, with the secret key.

create table access.pass_links (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- SAL's id for the person at the Pass (the id_token's sub): never reused.
  pass_sub text not null unique check (char_length(pass_sub) between 1 and 255),
  -- The last day the Pass vouches the person studies at AUIB (its student
  -- claim's "until"), as of their latest sign-in; null when it doesn't.
  student_until date,
  linked_at timestamptz not null default now(),
  last_signed_in_at timestamptz not null default now()
);

comment on table access.pass_links is
  'Which IDEA Pass signs in to which SAL account (one each way), and the AUIB student status it vouched for. Written only by the API routes; read by the person.';

alter table access.pass_links enable row level security;

create policy "People read their own Pass link"
  on access.pass_links as permissive for select to authenticated
  using (user_id = (select auth.uid()));
create policy "Third-party apps reach only their areas"
  on access.pass_links as restrictive for all to authenticated
  using ((select private.client_allows('access')))
  with check ((select private.client_allows('access')));

revoke all on access.pass_links from anon, authenticated;
grant select on access.pass_links to authenticated;
grant all on access.pass_links to service_role;

-- An AUIB member for ballots: a confirmed AUIB sign-in address, or a
-- student status from The IDEA Pass that hasn't run out.
create function private.is_auib_member(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from auth.users u
    where u.id = uid and u.email_confirmed_at is not null
      and private.is_auib_email(u.email)
  ) or exists (
    select 1 from access.pass_links l
    where l.user_id = uid
      and l.student_until >= (now() at time zone 'Asia/Baghdad')::date
  );
$$;

revoke all on function private.is_auib_member(uuid) from public, anon, authenticated;

-- Records the student status the Pass gave at this sign-in. A current one
-- makes the person a member, as a confirmed AUIB address does, and settles
-- a waiting verification request.
create function private.pass_student(uid uuid, until date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update access.pass_links set student_until = until where user_id = uid;
  if until >= (now() at time zone 'Asia/Baghdad')::date then
    perform private.verify_user(uid);
    update membership.verification_requests
    set status = 'approved', decided_at = now(),
        decision_note = 'AUIB student, confirmed by The IDEA Pass'
    where user_id = uid and status = 'pending';
  end if;
end;
$$;

revoke all on function private.pass_student(uuid, date) from public, anon, authenticated;

-- The SAL account a Pass signs in to, linking it on first use: the account
-- already linked to it, else the one whose sign-in address is the Pass's
-- verified address, else the one whose sign-in address is the verified
-- AUIB address the Pass shared (student_email). Null when none is found (a new person, or an account
-- under another address). An account already linked to another Pass is
-- never taken over.
create function private.pass_account(
  pass_sub text,
  verified_email text default null,
  student_until date default null,
  student_email text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  found uuid;
  other text;
begin
  update access.pass_links l
  set last_signed_in_at = now()
  where l.pass_sub = pass_account.pass_sub
  returning l.user_id into found;

  if found is null then
    select u.id into found from auth.users u
    where verified_email is not null
      and lower(u.email) = lower(verified_email)
    limit 1;
    if found is null then
      select u.id into found from auth.users u
      where pass_account.student_email is not null
        and private.is_auib_email(pass_account.student_email)
        and lower(u.email) = lower(pass_account.student_email)
      limit 1;
    end if;
    if found is null then
      return null;
    end if;
    select l.pass_sub into other from access.pass_links l where l.user_id = found;
    if other is not null then
      raise exception 'This account is linked to another IDEA Pass'
        using errcode = '23505';
    end if;
    insert into access.pass_links (user_id, pass_sub)
    values (found, pass_account.pass_sub);
  end if;

  perform private.pass_student(found, pass_account.student_until);
  return found;
end;
$$;

-- Links a Pass to an account the person has just signed in to the old way
-- (their account is under an address the Pass doesn't have), or to an
-- account just made for them. Refuses a Pass or an account already linked
-- elsewhere.
create function private.pass_link(
  pass_sub text,
  user_id uuid,
  student_until date default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from access.pass_links l
    where (l.pass_sub = pass_link.pass_sub and l.user_id <> pass_link.user_id)
      or (l.user_id = pass_link.user_id and l.pass_sub <> pass_link.pass_sub)
  ) then
    raise exception 'This IDEA Pass or account is already linked'
      using errcode = '23505';
  end if;
  insert into access.pass_links (user_id, pass_sub)
  values (pass_link.user_id, pass_link.pass_sub)
  on conflict on constraint pass_links_pkey do update
    set last_signed_in_at = now();
  perform private.pass_student(pass_link.user_id, pass_link.student_until);
end;
$$;

revoke all on function private.pass_account(text, text, date, text) from public, anon, authenticated;
revoke all on function private.pass_link(text, uuid, date) from public, anon, authenticated;
grant execute on function private.pass_account(text, text, date, text) to service_role;
grant execute on function private.pass_link(text, uuid, date) to service_role;

create function access.pass_account(
  pass_sub text,
  verified_email text default null,
  student_until date default null,
  student_email text default null
)
returns uuid
language sql
security invoker
set search_path = ''
as $$ select private.pass_account(pass_sub, verified_email, student_until, student_email) $$;

create function access.pass_link(
  pass_sub text,
  user_id uuid,
  student_until date default null
)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.pass_link(pass_sub, user_id, student_until) $$;

revoke all on function access.pass_account(text, text, date, text) from public, anon, authenticated;
revoke all on function access.pass_link(text, uuid, date) from public, anon, authenticated;
grant execute on function access.pass_account(text, text, date, text) to service_role;
grant execute on function access.pass_link(text, uuid, date) to service_role;

-- Ballots: an AUIB account, or a current student status from the Pass.
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
  if not private.elections_enabled() then
    raise exception 'Elections are not enabled' using errcode = '42501';
  end if;

  select * into e from governance.elections where id = cast_ballot.election_id;
  if not found or e.status <> 'voting'
     or now() not between e.voting_opens_at and e.voting_closes_at then
    raise exception 'Voting is not open' using errcode = '22023';
  end if;
  if not private.is_auib_member(auth.uid()) then
    raise exception 'Voting needs a confirmed AUIB account (@auib.edu.iq) or AUIB student status from The IDEA Pass' using errcode = '42501';
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

  -- One ballot per voter: the receipt's primary key refuses a second one.
  insert into governance.ballot_receipts (election_id, user_id) values (e.id, auth.uid());
  insert into governance.ballots (election_id, choices) values (e.id, cast_ballot.choices);
exception
  when unique_violation then
    raise exception 'You have already voted' using errcode = '23505';
end;
$$;


