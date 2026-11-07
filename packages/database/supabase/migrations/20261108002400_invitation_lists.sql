-- Invitation lists (decisions §2, owner, Nov 7, 2026, night). The one
-- invitation flow now carries more than one list: the spring 2026 Tour
-- (sent Nov 7) and the fall 2026 club fair's paper sign-ups, typed in by
-- staff in the Diwan (Membership → Invitations). Each list is tested on
-- the President first, sent only on the President's go, and deletes
-- itself thirty days after its own send. The addresses never pass through
-- a migration: only the lists' names are here.

create table membership.invitation_lists (
  source text primary key check (source ~ '^[a-z0-9_]+$'),
  title_en text not null check (char_length(title_en) <= 120),
  title_ar text not null check (char_length(title_ar) <= 120),
  tested_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

alter table membership.invitation_lists enable row level security;

create policy "No third-party apps" on membership.invitation_lists
  as restrictive for all to authenticated, anon
  using ((select private.client_allows('membership')))
  with check ((select private.client_allows('membership')));

create policy "Membership and the Tour read the lists" on membership.invitation_lists
  for select to authenticated
  using ((select private.has_permission('members.manage')) or (select private.runs_the_tour()));

comment on table membership.invitation_lists is
  'Each invitation list (decisions §2): tested on the President (tested_at, by /api/invitations/test), sent once on the President''s go (sent_at), its addresses deleted thirty days after its own send.';

revoke all on membership.invitation_lists from anon, authenticated;
grant select on membership.invitation_lists to authenticated;
grant all on membership.invitation_lists to service_role;

insert into membership.invitation_lists (source, title_en, title_ar, tested_at, sent_at)
values
  ('tour_2026', 'Typewriter Tour, spring 2026', '«جولة الآلة الكاتبة»، ربيع 2026',
    (select min(i.sent_at) from membership.invitations i where i.source = 'tour_2026'),
    (select min(i.sent_at) from membership.invitations i where i.source = 'tour_2026')),
  ('club_fair_2026', 'Club fair, fall 2026', 'معرض الأندية، خريف 2026', null, null);

alter table membership.invitations drop constraint invitations_source_check;
alter table membership.invitations
  add constraint invitations_source_fkey foreign key (source)
  references membership.invitation_lists (source) on delete cascade;
create index invitations_source_idx on membership.invitations (source);

comment on table membership.invitations is
  'The one-time invitation to join (decisions §2), by list (source → invitation_lists): tour (a spring 2026 Tour writer; words quoted only when quote_words) or plain (no page on record, or a club fair sign-up). Each list is sent once, when the President says go, and deleted thirty days after its own send.';

-- ── Staff type in the paper sign-ups ────────────────────────────────────────

-- Adds the people to a list not yet sent: AUIB addresses only, each once
-- (an address already on any list stays where it is). Returns how many
-- were added; addresses that aren't AUIB's are skipped, not refused, so a
-- page of sign-ups goes in at once.
create function private.add_invitations(list text, people jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  p jsonb;
  address text;
  n integer := 0;
  added integer;
begin
  if not (private.has_permission('members.manage') or private.runs_the_tour()) then
    raise exception 'Membership keeps the invitation lists' using errcode = '42501';
  end if;
  if not exists (
    select 1 from membership.invitation_lists l where l.source = list and l.sent_at is null
  ) then
    raise exception 'invitation_list_closed' using errcode = 'P0001',
      hint = 'A list takes names only until it is sent.';
  end if;
  for p in select * from jsonb_array_elements(coalesce(people, '[]'::jsonb)) loop
    address := lower(btrim(coalesce(p ->> 'email', '')));
    continue when address !~ '^[a-z0-9._%+-]+@auib\.edu\.iq$';
    insert into membership.invitations (email, first_name, kind, source)
    values (address, nullif(left(btrim(coalesce(p ->> 'first_name', '')), 80), ''), 'plain', list)
    on conflict (email) do nothing;
    get diagnostics added = row_count;
    n := n + added;
  end loop;
  return n;
end;
$$;

revoke all on function private.add_invitations(text, jsonb) from public, anon;
grant execute on function private.add_invitations(text, jsonb) to authenticated;

create function membership.add_invitations(list text, people jsonb)
returns integer
language sql
security invoker
set search_path = ''
as $$ select private.add_invitations(list, people) $$;

revoke all on function membership.add_invitations(text, jsonb) from public, anon;
grant execute on function membership.add_invitations(text, jsonb) to authenticated;

-- Takes a mistyped address off a list before it is sent.
create function private.remove_invitation(address text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  removed integer;
begin
  if not (private.has_permission('members.manage') or private.runs_the_tour()) then
    raise exception 'Membership keeps the invitation lists' using errcode = '42501';
  end if;
  delete from membership.invitations i where i.email = lower(btrim(address)) and i.sent_at is null;
  get diagnostics removed = row_count;
  return removed > 0;
end;
$$;

revoke all on function private.remove_invitation(text) from public, anon;
grant execute on function private.remove_invitation(text) to authenticated;

create function membership.remove_invitation(address text)
returns boolean
language sql
security invoker
set search_path = ''
as $$ select private.remove_invitation(address) $$;

revoke all on function membership.remove_invitation(text) from public, anon;
grant execute on function membership.remove_invitation(text) to authenticated;

-- What the Diwan shows: one list's addresses, for those who keep it.
create function private.invitation_list(list text)
returns table (email text, first_name text, sent_at timestamptz, joined_at timestamptz, has_account boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select i.email, i.first_name, i.sent_at, i.joined_at,
    exists (select 1 from auth.users u where lower(u.email) = i.email)
  from membership.invitations i
  where i.source = list
    and (private.has_permission('members.manage') or private.runs_the_tour())
  order by i.created_at desc, i.email
$$;

revoke all on function private.invitation_list(text) from public, anon;
grant execute on function private.invitation_list(text) to authenticated;

create function membership.invitation_list(list text)
returns table (email text, first_name text, sent_at timestamptz, joined_at timestamptz, has_account boolean)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.invitation_list(list) $$;

revoke all on function membership.invitation_list(text) from public, anon;
grant execute on function membership.invitation_list(text) to authenticated;

-- ── Sending, one list at a time ─────────────────────────────────────────────

drop function membership.send_invitations();
drop function private.send_invitations();

-- The President's go for one list, after its test reached the President.
-- Every address on it not yet sent and with no account is marked sent;
-- one Broadcast job goes out for the list. A list is sent once.
create function private.send_invitations(list text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
  l membership.invitation_lists;
begin
  if not (access.has_permission('roles.assign') and access.has_permission('governance.manage')) then
    raise exception 'The President sends the invitations' using errcode = '42501';
  end if;
  select * into l from membership.invitation_lists where source = list for update;
  if not found or l.sent_at is not null then
    return 0;
  end if;
  if l.tested_at is null then
    raise exception 'invitation_untested' using errcode = 'P0001',
      hint = 'Send the test to the President first.';
  end if;
  update membership.invitations i set sent_at = now()
  where i.source = list
    and i.sent_at is null
    and not exists (select 1 from auth.users u where lower(u.email) = i.email);
  get diagnostics n = row_count;
  update membership.invitation_lists set sent_at = now() where source = list;
  if n > 0 then
    perform private.enqueue('membership.invitations',
      jsonb_build_object('sent_at', now(), 'source', list));
  end if;
  return n;
end;
$$;

revoke all on function private.send_invitations(text) from public, anon;
grant execute on function private.send_invitations(text) to authenticated;

create function membership.send_invitations(list text)
returns integer
language sql
security invoker
set search_path = ''
as $$ select private.send_invitations(list) $$;

revoke all on function membership.send_invitations(text) from public, anon;
grant execute on function membership.send_invitations(text) to authenticated;

-- How many wait on one list (and the Tour's pages, for its page).
drop function membership.invitations_waiting();
drop function private.invitations_waiting();

create function private.invitations_waiting(list text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case when private.has_permission('members.manage') or private.runs_the_tour() then
    jsonb_build_object(
      'waiting', (select count(*) from membership.invitations i
        where i.source = list and i.sent_at is null
          and not exists (select 1 from auth.users u where lower(u.email) = i.email)),
      'sent', (select count(*) from membership.invitations i where i.source = list and i.sent_at is not null),
      'joined', (select count(*) from membership.invitations i where i.source = list and i.joined_at is not null),
      'tested_at', (select l.tested_at from membership.invitation_lists l where l.source = list),
      'list_sent_at', (select l.sent_at from membership.invitation_lists l where l.source = list),
      'pages', (select count(*) from programmes.six_words w where w.tour is not null),
      'unclaimed', (select count(*) from programmes.six_words w where w.tour is not null and w.user_id is null)
    )
  end
$$;

revoke all on function private.invitations_waiting(text) from public, anon;
grant execute on function private.invitations_waiting(text) to authenticated;

create function membership.invitations_waiting(list text)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$ select private.invitations_waiting(list) $$;

revoke all on function membership.invitations_waiting(text) from public, anon;
grant execute on function membership.invitations_waiting(text) to authenticated;

-- ── Each list deletes itself thirty days after its own send ────────────────

create or replace function private.purge_tour_lists()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer := 0;
  m integer := 0;
  until date := (private.setting('tour.unclaimed_until') #>> '{}')::date;
begin
  -- Every address on a list sent more than thirty days ago, those skipped
  -- because they already had an account among them.
  delete from membership.invitations i
  using membership.invitation_lists l
  where l.source = i.source and l.sent_at is not null and l.sent_at < now() - interval '30 days';
  get diagnostics n = row_count;
  if until is not null and private.today() > until then
    delete from programmes.six_words where user_id is null and tour is not null;
    get diagnostics m = row_count;
  end if;
  return n + m;
end;
$$;

revoke all on function private.purge_tour_lists() from public, anon, authenticated;
