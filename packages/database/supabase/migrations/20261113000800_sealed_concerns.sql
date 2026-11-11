-- Concerns (decisions.md, Governance): raised signed in. The person may ask
-- to keep their name from the panel: it is sealed, opened only for a safety
-- risk or with their agreement, and the reply notes that anonymous
-- concerns are harder to act on.
--
-- A sealed concern (F-21, `anonymous` in sign_form) keeps no name on the
-- submission the panel reads; the signer is kept apart, in
-- governance.sealed_signers, which only the signer reads. A handler opens it
-- with governance.open_sealed and a reason, and the opening is recorded.

update governance.form_types set needs_account = true where key = 'f21';

create table governance.sealed_signers (
  submission_id uuid primary key references governance.form_submissions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  signer_name text not null,
  opened_at timestamptz,
  opened_by uuid references auth.users (id) on delete set null,
  opened_reason text check (opened_reason in ('safety', 'agreed')),
  created_at timestamptz not null default now(),
  check ((opened_at is null) = (opened_reason is null))
);

comment on table governance.sealed_signers is
  'Who raised a sealed concern (decisions.md, Governance): read only by the signer; a handler opens it through governance.open_sealed for a safety risk or with the signer''s agreement, and the opening is kept here.';

create index sealed_signers_user_id_idx on governance.sealed_signers (user_id);
create index sealed_signers_opened_by_idx on governance.sealed_signers (opened_by);

alter table governance.sealed_signers enable row level security;

create policy "Signers read their own sealed concerns" on governance.sealed_signers
  for select to authenticated
  using (user_id = (select auth.uid()));
create policy "No third-party apps" on governance.sealed_signers
  as restrictive for all to authenticated
  using ((select private.client_allows('governance')))
  with check ((select private.client_allows('governance')));

grant select on governance.sealed_signers to authenticated;
grant all on governance.sealed_signers to service_role;

-- The signer still reads their sealed concern (it carries no name).
drop policy "Submitters, handlers and subjects read submissions" on governance.form_submissions;
create policy "Submitters, handlers and subjects read submissions" on governance.form_submissions
  for select to authenticated
  using (
    submitted_by = (select auth.uid())
    or exists (
      select 1 from governance.sealed_signers s
      where s.submission_id = form_submissions.id and s.user_id = (select auth.uid())
    )
    or (status <> 'draft' and (select private.may_handle_form(form_key, routing)))
    or (
      status <> 'draft'
      and subject_user_id = (select auth.uid())
      and exists (
        select 1 from governance.form_types t
        where t.key = form_submissions.form_key and t.subject_reads
      )
    )
  );

-- Signing: an anonymous concern is now a sealed one, signed in and signed.
create or replace function private.sign_form(
  form_key text,
  data jsonb,
  signer_name text,
  subject_id uuid default null,
  signer_contact text default null,
  anonymous boolean default false,
  routing text default 'none',
  esign_agreed boolean default false,
  link_token text default null,
  signer_ip text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  t governance.form_types;
  new_id uuid;
  via_api boolean := coalesce(auth.role(), '') = 'service_role';
  link governance.form_links;
  ip text;
begin
  select * into t from governance.form_types where key = sign_form.form_key;
  if not found or t.filled <> 'site' then
    raise exception 'unknown_form' using errcode = 'P0002';
  end if;
  -- Signed out: only through the API route (Turnstile, a limit per address).
  if auth.uid() is null and not via_api then
    raise exception 'use_the_form_page' using errcode = '42501';
  end if;
  if auth.uid() is null and (t.needs_account or anonymous) then
    raise exception 'sign_in_required' using errcode = '42501';
  end if;
  if auth.uid() is not null and not private.may_submit_form(t.key) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if auth.uid() is null and not core.take_rate('forms:' || t.key, 60, 3600) then
    raise exception 'rate_limited' using errcode = '54000';
  end if;
  if data is null or jsonb_typeof(data) <> 'object' or length(data::text) > 40000 then
    raise exception 'invalid_data' using errcode = '22023';
  end if;
  -- Every form is signed, a sealed concern too (its name is kept apart).
  if char_length(btrim(coalesce(sign_form.signer_name, ''))) < 2 then
    raise exception 'signature_required' using errcode = '23514';
  end if;
  if not sign_form.esign_agreed then
    raise exception 'esign_agreement_required' using errcode = '23514';
  end if;
  if anonymous and not t.anonymous_ok then
    raise exception 'anonymous_not_allowed' using errcode = '22023';
  end if;
  if coalesce(routing, 'none') <> 'none' and t.key <> 'f21' then
    raise exception 'routing_only_for_concerns' using errcode = '22023';
  end if;
  if t.subject_kind = 'event' and t.key = 'f45' and not exists (
    select 1 from events.events e
    where e.id = sign_form.subject_id and e.off_campus and e.status = 'published'
      and private.can_see_event_id(e.id)
  ) then
    raise exception 'not_a_trip' using errcode = '22023';
  end if;
  -- A link-only form needs its link; any form given a link uses it once
  -- (a guest's F-15 release for a Next Stop episode).
  if t.by_link or sign_form.link_token is not null then
    select * into link from governance.form_links l
    where l.form_key = t.key
      and l.token_hash = encode(extensions.digest(coalesce(sign_form.link_token, ''), 'sha256'), 'hex')
      and l.used_at is null and l.expires_at > now()
    for update;
    if not found then
      raise exception 'link_not_valid' using errcode = '42501';
    end if;
  end if;

  -- The IP: given by the API route, or read from the request.
  ip := case when via_api then sign_form.signer_ip else split_part(coalesce(
    (nullif(current_setting('request.headers', true), '')::jsonb) ->> 'x-forwarded-for', ''), ',', 1) end;

  insert into governance.form_submissions (
    form_key, submitted_by, routing, data, status, submitted_at, form_version,
    signer_name, signed_at, signer_contact, subject_id,
    esign_agreed, signer_ip, document_sha256
  ) values (
    t.key,
    case when anonymous then null else auth.uid() end,
    coalesce(routing, 'none'),
    data,
    'submitted',
    now(),
    t.version,
    case when anonymous then null else btrim(sign_form.signer_name) end,
    now(),
    case when anonymous then null else nullif(btrim(coalesce(sign_form.signer_contact, '')), '') end,
    sign_form.subject_id,
    sign_form.esign_agreed,
    case when anonymous then null else nullif(btrim(coalesce(ip, '')), '') end,
    encode(extensions.digest(jsonb_build_object(
      'form', t.code, 'version', t.version, 'data', data,
      'signer', case when anonymous then null else btrim(sign_form.signer_name) end
    )::text, 'sha256'), 'hex')
  )
  returning id into new_id;

  -- A sealed concern: the signer, kept apart from what the panel reads.
  if anonymous then
    insert into governance.sealed_signers (submission_id, user_id, signer_name)
    values (new_id, auth.uid(), btrim(sign_form.signer_name));
  end if;

  if link.id is not null then
    update governance.form_links set used_at = now(), submission_id = new_id where id = link.id;
  end if;
  -- The signer's copy by email (a sealed concern sends none: the panel's
  -- mailbox would hold their address).
  if not anonymous then
    perform private.enqueue('forms.signed_copy', jsonb_build_object('submission_id', new_id));
  end if;
  return new_id;
end;
$$;

-- Opening a sealed name: only whoever handles the concern, only for a
-- safety risk or with the signer's agreement, and the opening is kept.
create function private.open_sealed(submission_id uuid, reason text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  s governance.form_submissions;
  sealed governance.sealed_signers;
begin
  if reason is null or reason not in ('safety', 'agreed') then
    raise exception 'reason_required' using errcode = '22023';
  end if;
  select * into s from governance.form_submissions f where f.id = open_sealed.submission_id;
  if not found or s.status = 'draft' or not private.may_handle_form(s.form_key, s.routing) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  select * into sealed from governance.sealed_signers g
  where g.submission_id = open_sealed.submission_id
  for update;
  if not found then
    raise exception 'not_sealed' using errcode = 'P0002';
  end if;
  if sealed.opened_at is null then
    update governance.sealed_signers g
    set opened_at = now(), opened_by = auth.uid(), opened_reason = open_sealed.reason
    where g.submission_id = open_sealed.submission_id;
  end if;
  return sealed.signer_name;
end;
$$;

revoke all on function private.open_sealed(uuid, text) from public, anon;
grant execute on function private.open_sealed(uuid, text) to authenticated, service_role;

create function governance.open_sealed(submission_id uuid, reason text)
returns text
language sql
security invoker
set search_path = ''
as $$ select private.open_sealed(submission_id, reason) $$;

revoke all on function governance.open_sealed(uuid, text) from public, anon;
grant execute on function governance.open_sealed(uuid, text) to authenticated, service_role;

-- Whether a concern is sealed, and whether it was opened (never who): for
-- the panel's page.
create function private.sealed_state(submission_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case when g.opened_at is null then 'sealed' else 'opened' end
  from governance.sealed_signers g
  join governance.form_submissions f on f.id = g.submission_id
  where g.submission_id = sealed_state.submission_id
    and (g.user_id = auth.uid() or private.may_handle_form(f.form_key, f.routing));
$$;

revoke all on function private.sealed_state(uuid) from public, anon;
grant execute on function private.sealed_state(uuid) to authenticated, service_role;

create function governance.sealed_state(submission_id uuid)
returns text
language sql
stable
security invoker
set search_path = ''
as $$ select private.sealed_state(submission_id) $$;

revoke all on function governance.sealed_state(uuid) from public, anon;
grant execute on function governance.sealed_state(uuid) to authenticated, service_role;
