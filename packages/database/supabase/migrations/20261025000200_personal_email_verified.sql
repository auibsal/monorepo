-- The personal email (for after graduation) is verified, and every address
-- belongs to one person (owner, 2026-10-25): "if a person puts a personal
-- email for after graduation it must also be verified + it cannot be the
-- same as any other main email of a member or any other alumni email of
-- any member and vice versa. Also, we shouldn't collect phone numbers until
-- we can actually verify them."
--
-- 1. The personal email is no longer written directly. A member asks for an
--    address (core.request_personal_email); the outbox sends a link to it;
--    the button behind the link (POST /api/personal-email/confirm, then
--    core.confirm_personal_email) records it as verified. Until then the
--    address is only pending, and nothing is sent to it but the link.
-- 2. One address, one person: a personal email can't be anyone's sign-in
--    address (the member's own included) or another member's verified
--    personal email; a sign-in address (new account or changed email)
--    can't be a member's verified personal email. Checked when asked, again
--    when confirmed, and by triggers and a unique index underneath.
-- 3. Phone numbers are not collected (core.member_details.phone dropped).

-- ── 1. Pending and verified ─────────────────────────────────────────────────

alter table core.profiles add column personal_email_verified_at timestamptz;

comment on column core.profiles.personal_email_verified_at is
  'When the member confirmed the personal email from a link sent to it. Null: not verified, never used.';

-- Addresses written before verification existed stay, unverified, until
-- the member confirms them (Profile offers to send the link).

-- Members no longer write the column; the functions below do.
revoke update (personal_email) on core.profiles from authenticated;

create table core.personal_email_requests (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text not null check (email = lower(btrim(email)) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  token text not null unique default encode(extensions.gen_random_bytes(24), 'hex')
    check (char_length(token) >= 32),
  requested_at timestamptz not null default now()
);

comment on table core.personal_email_requests is
  'A personal email waiting for its owner to press the link sent to it. Reached only through functions.';

alter table core.personal_email_requests enable row level security;
revoke all on core.personal_email_requests from anon, authenticated;
grant all on core.personal_email_requests to service_role;

create policy "Third-party apps reach only their areas"
  on core.personal_email_requests as restrictive for all to authenticated
  using ((select private.client_allows('core')))
  with check ((select private.client_allows('core')));

-- ── 2. One address, one person ──────────────────────────────────────────────

-- Whether an address is already someone's: a sign-in address (anyone's,
-- the asker's own included) or another member's verified personal email.
create function private.email_taken(email text, owner uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
      select 1 from auth.users u where lower(u.email) = lower(btrim(email_taken.email))
    )
    or exists (
      select 1 from core.profiles p
      where lower(p.personal_email) = lower(btrim(email_taken.email))
        and p.personal_email_verified_at is not null
        and p.id is distinct from email_taken.owner
    );
$$;

revoke all on function private.email_taken(text, uuid) from public, anon, authenticated;

create unique index profiles_personal_email_verified_key
  on core.profiles (lower(personal_email))
  where personal_email_verified_at is not null;

-- A verified personal email is never a sign-in address.
create function private.guard_personal_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.personal_email is not null and new.personal_email_verified_at is not null
     and exists (select 1 from auth.users u where lower(u.email) = lower(new.personal_email)) then
    raise exception 'email_in_use' using errcode = '23505';
  end if;
  return new;
end;
$$;

revoke all on function private.guard_personal_email() from public, anon, authenticated;

create trigger guard_personal_email
  before insert or update of personal_email, personal_email_verified_at on core.profiles
  for each row execute function private.guard_personal_email();

-- And the other way: a sign-in address (a new account, or a changed email)
-- is never someone's verified personal email.
create function private.guard_sign_in_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is not null and exists (
    select 1 from core.profiles p
    where lower(p.personal_email) = lower(new.email)
      and p.personal_email_verified_at is not null
      and p.id <> new.id
  ) then
    raise exception 'email_in_use' using errcode = '23505';
  end if;
  return new;
end;
$$;

revoke all on function private.guard_sign_in_email() from public, anon, authenticated;

create trigger guard_sign_in_email
  before insert or update of email on auth.users
  for each row execute function private.guard_sign_in_email();

-- ── The functions members call ──────────────────────────────────────────────

-- Ask for a personal email: checked now, sent a link, verified on confirm.
-- Raises email_invalid, email_auib (an AUIB address ends with the degree)
-- or email_in_use.
create function private.request_personal_email(email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  address text := lower(btrim(request_personal_email.email));
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'not_signed_in' using errcode = '42501';
  end if;
  if address !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(address) > 320 then
    raise exception 'email_invalid' using errcode = '22023';
  end if;
  if private.is_auib_email(address) then
    raise exception 'email_auib' using errcode = '22023';
  end if;
  if private.email_taken(address, uid) then
    raise exception 'email_in_use' using errcode = '23505';
  end if;
  insert into core.personal_email_requests (user_id, email)
  values (uid, address)
  on conflict (user_id) do update
    set email = excluded.email,
        token = encode(extensions.gen_random_bytes(24), 'hex'),
        requested_at = now();
  perform private.enqueue('personal_email.confirm', jsonb_build_object('user_id', uid));
end;
$$;

-- The button behind the link. Returns 'confirmed', or raises
-- invalid_token (unknown or older than seven days) or email_in_use (taken
-- since it was asked for).
create function private.confirm_personal_email(token text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  pending core.personal_email_requests;
begin
  select * into pending from core.personal_email_requests r
  where r.token = confirm_personal_email.token
    and r.requested_at > now() - interval '7 days';
  if not found then
    raise exception 'invalid_token' using errcode = 'P0002';
  end if;
  if private.email_taken(pending.email, pending.user_id) then
    delete from core.personal_email_requests where user_id = pending.user_id;
    raise exception 'email_in_use' using errcode = '23505';
  end if;
  update core.profiles
  set personal_email = pending.email, personal_email_verified_at = now()
  where id = pending.user_id;
  delete from core.personal_email_requests where user_id = pending.user_id;
  return 'confirmed';
end;
$$;

-- Remove the personal email, and any pending one.
create function private.remove_personal_email()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update core.profiles
  set personal_email = null, personal_email_verified_at = null
  where id = (select auth.uid());
  delete from core.personal_email_requests where user_id = (select auth.uid());
end;
$$;

-- What Profile shows: the address, whether it is verified, and any address
-- waiting for its link.
create function private.my_personal_email()
returns table (email text, verified boolean, pending_email text, pending_since timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select p.personal_email, p.personal_email_verified_at is not null, r.email, r.requested_at
  from core.profiles p
  left join core.personal_email_requests r on r.user_id = p.id
  where p.id = (select auth.uid());
$$;

create function core.request_personal_email(email text)
returns void
language sql volatile
security invoker
set search_path = ''
as $$ select private.request_personal_email($1) $$;

create function core.confirm_personal_email(token text)
returns text
language sql volatile
security invoker
set search_path = ''
as $$ select private.confirm_personal_email($1) $$;

create function core.remove_personal_email()
returns void
language sql volatile
security invoker
set search_path = ''
as $$ select private.remove_personal_email() $$;

create function core.my_personal_email()
returns table (email text, verified boolean, pending_email text, pending_since timestamptz)
language sql stable
security invoker
set search_path = ''
as $$ select * from private.my_personal_email() $$;

revoke all on function private.request_personal_email(text), private.confirm_personal_email(text),
  private.remove_personal_email(), private.my_personal_email() from public, anon;
grant execute on function private.request_personal_email(text), private.remove_personal_email(),
  private.my_personal_email() to authenticated, service_role;
-- The confirm button works signed out too (the link may open on another
-- device); POST /api/personal-email/confirm calls it as the service role.
grant execute on function private.confirm_personal_email(text) to service_role;

revoke all on function core.request_personal_email(text), core.confirm_personal_email(text),
  core.remove_personal_email(), core.my_personal_email() from public;
grant execute on function core.request_personal_email(text), core.remove_personal_email(),
  core.my_personal_email() to authenticated, service_role;
grant execute on function core.confirm_personal_email(text) to service_role;

-- ── 3. No phone numbers ─────────────────────────────────────────────────────

alter table core.member_details drop column phone;
