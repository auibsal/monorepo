-- Getting back into two-step sign-in (owner, 2026-10-25): recovery codes,
-- and a reset by whoever can assign roles. A passkey stays a first step
-- only (owner).
--
-- Recovery codes: ten one-time codes an officer saves after setting up the
-- authenticator. Only a keyed hash of each is stored (the API route makes
-- and checks them with the server's secret). Using one, signed in with the
-- first step, removes the lost authenticator so a new one can be set up at
-- once, which is what restores the second step. Supabase's own recovery
-- codes are still experimental and can't be turned on from config.toml.
--
-- Resets: every reset, by an officer or with a recovery code, is recorded
-- here and emails the person (access.two_step_reset), so one they didn't ask
-- for is noticed. Both tables are written only by the API (service role).

create table access.recovery_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  code_hash text not null unique,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

comment on table access.recovery_codes is
  'Two-step recovery codes, as keyed hashes. Written only by the API; the owner reads whether codes are left, never the hashes.';

create index recovery_codes_user_id_idx on access.recovery_codes (user_id);

alter table access.recovery_codes enable row level security;

create policy "People read their own recovery codes"
  on access.recovery_codes as permissive for select to authenticated
  using (user_id = (select auth.uid()));
create policy "Third-party apps reach only their areas"
  on access.recovery_codes as restrictive for all to authenticated
  using ((select private.client_allows('access')))
  with check ((select private.client_allows('access')));

revoke all on access.recovery_codes from anon, authenticated;
-- How many are left and when they were made; the hashes stay server-side.
grant select (id, user_id, used_at, created_at) on access.recovery_codes
  to authenticated;
grant all on access.recovery_codes to service_role;

create table access.two_step_resets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Who reset it: an officer, or null when the person used a recovery code.
  reset_by uuid references auth.users (id) on delete set null,
  via text not null check (via in ('officer', 'recovery_code')),
  created_at timestamptz not null default now()
);

comment on table access.two_step_resets is
  'Each time a person''s two-step sign-in was reset. Written only by the API; read by the person and by roles.assign.';

create index two_step_resets_user_id_idx on access.two_step_resets (user_id);
create index two_step_resets_reset_by_idx on access.two_step_resets (reset_by);

alter table access.two_step_resets enable row level security;

create policy "People and role managers read two-step resets"
  on access.two_step_resets as permissive for select to authenticated
  using (
    user_id = (select auth.uid())
    or (select private.has_permission('roles.assign'))
  );
create policy "Third-party apps reach only their areas"
  on access.two_step_resets as restrictive for all to authenticated
  using ((select private.client_allows('access')))
  with check ((select private.client_allows('access')));

revoke all on access.two_step_resets from anon, authenticated;
grant select on access.two_step_resets to authenticated;
grant all on access.two_step_resets to service_role;

-- Tell the person, whoever did it.
create function private.after_two_step_reset()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.enqueue('access.two_step_reset', jsonb_build_object(
    'user_id', new.user_id, 'via', new.via));
  return null;
end;
$$;

revoke all on function private.after_two_step_reset() from public, anon, authenticated;

create trigger after_two_step_reset after insert on access.two_step_resets
  for each row execute function private.after_two_step_reset();

create trigger log_activity after insert on access.two_step_resets
  for each row execute function private.log_activity();
