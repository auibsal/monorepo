-- The IDEA Pass is removed (owner, 2026-10-29): sign-in, sign-up and the
-- membership card are SAL's own again, as before migration 20261026000000.
-- This drops what the Pass added (its links, card pictures and door scans,
-- and every function that read them) and puts the ballot's AUIB check back
-- to a confirmed AUIB sign-in address only. Accounts made through the Pass
-- stay, under the address they were made with; they sign in by email.

drop function if exists programmes.attach_six_words_pass(uuid, uuid);
drop function if exists programmes.record_six_words_pass(text, text, uuid);
drop function if exists events.check_in_pass(uuid, uuid);
drop function if exists access.can_scan_passes();
drop function if exists access.pass_card(text, text, text);
drop function if exists access.record_pass_scan(text, uuid);
drop function if exists access.pass_link(text, uuid, date);
drop function if exists access.pass_account(text, text, date, text);

drop function if exists private.attach_six_words_pass(uuid, uuid);
drop function if exists private.record_six_words_pass(text, text, uuid);
drop function if exists private.check_in_pass(uuid, uuid);
drop function if exists private.can_scan_passes();
drop function if exists private.use_pass_scan(uuid);
drop function if exists private.pass_card(text, text, text);
drop function if exists private.record_pass_scan(text, uuid);
drop function if exists private.pass_link(text, uuid, date);
drop function if exists private.pass_account(text, text, date, text);
drop function if exists private.pass_student(uuid, date);

drop table if exists access.pass_scans;
drop table if exists access.pass_links;

-- Ballots: a confirmed AUIB account, as before the Pass.
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

drop function if exists private.is_auib_member(uuid);
