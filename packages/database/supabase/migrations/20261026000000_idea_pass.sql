-- The IDEA Pass (owner, 2026-10-26): the only way to sign in to
-- auibsal.org, and where students prove their AUIB address. SAL keeps its
-- own accounts and data: a Pass is linked to one SAL account here, and a
-- sign-in through it opens that account's ordinary session (RLS, roles and
-- the officers' second step are unchanged).
--
-- An existing member is found by the AUIB address the Pass has checked
-- (every AUIB account signs in with that address), or by the Pass's own
-- verified address; anyone else links their account once from the old
-- sign-in. Only the API routes call these, with the secret key.

create table access.pass_links (
  user_id uuid primary key references auth.users (id) on delete cascade,
  -- The Pass's id for the person (the id_token's sub): never reused.
  pass_sub text not null unique check (char_length(pass_sub) between 1 and 255),
  linked_at timestamptz not null default now(),
  last_signed_in_at timestamptz not null default now()
);

comment on table access.pass_links is
  'Which IDEA Pass signs in to which SAL account (one each way). Written only by the API routes; read by the person.';

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

-- The SAL account a Pass signs in to, linking it on first use: the account
-- already linked to it, else the one whose sign-in address is the AUIB
-- address the Pass has checked, else the one whose address is the Pass's
-- own verified address. Null when none is found (a new person, or an
-- account under another address). An account already linked to another
-- Pass is never taken over.
create function private.pass_account(
  pass_sub text,
  verified_email text default null,
  auib_email text default null
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
  if found is not null then
    return found;
  end if;

  select u.id into found from auth.users u
  where auib_email is not null and lower(u.email) = lower(auib_email)
  limit 1;
  if found is null then
    select u.id into found from auth.users u
    where verified_email is not null
      and lower(u.email) = lower(verified_email)
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
  return found;
end;
$$;

-- Links a Pass to an account the person has just signed in to the old way
-- (their account is under an address the Pass doesn't know), or to an
-- account just made for them. Refuses a Pass or an account already linked
-- elsewhere.
create function private.pass_link(pass_sub text, user_id uuid)
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
end;
$$;

revoke all on function private.pass_account(text, text, text) from public, anon, authenticated;
revoke all on function private.pass_link(text, uuid) from public, anon, authenticated;
grant execute on function private.pass_account(text, text, text) to service_role;
grant execute on function private.pass_link(text, uuid) to service_role;

create function access.pass_account(
  pass_sub text,
  verified_email text default null,
  auib_email text default null
)
returns uuid
language sql
security invoker
set search_path = ''
as $$ select private.pass_account(pass_sub, verified_email, auib_email) $$;

create function access.pass_link(pass_sub text, user_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.pass_link(pass_sub, user_id) $$;

revoke all on function access.pass_account(text, text, text) from public, anon, authenticated;
revoke all on function access.pass_link(text, uuid) from public, anon, authenticated;
grant execute on function access.pass_account(text, text, text) to service_role;
grant execute on function access.pass_link(text, uuid) to service_role;
