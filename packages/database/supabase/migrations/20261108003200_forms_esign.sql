-- Forms signed on the site to the electronic-signature standard (audit C11;
-- decisions §11, E-SIGN and UETA).
--
-- 1. The signer agrees to sign electronically and types their name; the
--    signed copy keeps the name, the time, the IP address, the form's
--    version and the SHA-256 fingerprint of what was signed, and the
--    signer is emailed a copy.
-- 2. Signing without an account, and anonymous concerns, go through the
--    API route (/api/forms/sign), which checks Turnstile and limits each
--    address; the browser can no longer call the function signed out.
-- 3. Parents sign by a single-use link (Qalam's F-38 and F-39), sent to
--    the teacher, who passes it on: contact goes only through the teacher.

-- ── 1. The signed copy ──────────────────────────────────────────────────────

alter table governance.form_submissions
  add column esign_agreed boolean not null default false,
  add column signer_ip text check (char_length(signer_ip) <= 64),
  add column document_sha256 text check (document_sha256 ~ '^[0-9a-f]{64}$');

comment on column governance.form_submissions.esign_agreed is
  'The signer agreed to sign electronically ("I agree"), E-SIGN and UETA.';
comment on column governance.form_submissions.signer_ip is
  'The IP address the signature came from, kept with the signed copy; never shown publicly.';
comment on column governance.form_submissions.document_sha256 is
  'SHA-256 of what was signed: the form, its version and the answers, as JSON.';

-- ── 3. Single-use links ─────────────────────────────────────────────────────

alter table governance.form_types add column by_link boolean not null default false;
comment on column governance.form_types.by_link is
  'Signed only through a single-use link the form''s handler issues (a parent''s consent, sent through the teacher).';
update governance.form_types set by_link = true, needs_account = false where key in ('f38', 'f39');

create table governance.form_links (
  id uuid primary key default gen_random_uuid(),
  form_key text not null references governance.form_types (key),
  -- Where the link was sent (the teacher's address), to say so on the list.
  sent_to text not null check (char_length(sent_to) between 3 and 320),
  note text check (char_length(note) <= 300),
  token_hash text not null unique,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '14 days',
  used_at timestamptz,
  submission_id uuid references governance.form_submissions (id) on delete set null
);

create index form_links_form_key_idx on governance.form_links (form_key, created_at desc);
create index form_links_created_by_idx on governance.form_links (created_by);
create index form_links_submission_id_idx on governance.form_links (submission_id);

alter table governance.form_links enable row level security;

create policy "No third-party apps" on governance.form_links
  as restrictive for all to authenticated, anon
  using ((select private.client_allows('governance')))
  with check ((select private.client_allows('governance')));

create policy "The form's handlers read its links" on governance.form_links
  for select to authenticated
  using (exists (
    select 1 from governance.form_types t
    where t.key = form_links.form_key and (select access.has_permission_anywhere(t.handle_permission))
  ));

grant select on governance.form_links to authenticated;

comment on table governance.form_links is
  'Single-use links to sign a form without an account (decisions §11): valid 14 days, used once. Only a hash of the token is kept.';

-- The handler issues a link; the token is returned once and emailed.
create function private.issue_form_link(form_key text, sent_to text, note text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  t governance.form_types;
  token text := encode(extensions.gen_random_bytes(24), 'hex');
  new_id uuid;
begin
  select * into t from governance.form_types where key = issue_form_link.form_key;
  if not found or not t.by_link then
    raise exception 'not_a_link_form' using errcode = '22023';
  end if;
  if not access.has_permission_anywhere(t.handle_permission) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if issue_form_link.sent_to !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid_email' using errcode = '22023';
  end if;
  insert into governance.form_links (form_key, sent_to, note, token_hash)
  values (t.key, lower(btrim(issue_form_link.sent_to)), nullif(btrim(coalesce(note, '')), ''),
    encode(extensions.digest(token, 'sha256'), 'hex'))
  returning id into new_id;
  perform private.enqueue('forms.link', jsonb_build_object(
    'link_id', new_id, 'token', token, 'form_key', t.key));
  return new_id;
end;
$$;

revoke all on function private.issue_form_link(text, text, text) from public, anon;
grant execute on function private.issue_form_link(text, text, text) to authenticated;

create function governance.issue_form_link(form_key text, sent_to text, note text default null)
returns uuid
language sql
security invoker
set search_path = ''
as $$ select private.issue_form_link(form_key, sent_to, note) $$;

revoke all on function governance.issue_form_link(text, text, text) from public, anon;
grant execute on function governance.issue_form_link(text, text, text) to authenticated;

-- Whether a link may still be used (the page asks before showing the form).
create function private.form_link_open(form_key text, token text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from governance.form_links l
    where l.form_key = form_link_open.form_key
      and l.token_hash = encode(extensions.digest(form_link_open.token, 'sha256'), 'hex')
      and l.used_at is null and l.expires_at > now()
  );
$$;

revoke all on function private.form_link_open(text, text) from public;
grant execute on function private.form_link_open(text, text) to anon, authenticated, service_role;

create function governance.form_link_open(form_key text, token text)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$ select private.form_link_open(form_key, token) $$;

revoke all on function governance.form_link_open(text, text) from public;
grant execute on function governance.form_link_open(text, text) to anon, authenticated, service_role;

-- ── 2. Signing ──────────────────────────────────────────────────────────────

drop function governance.sign_form(text, jsonb, text, uuid, text, boolean, text);
drop function private.sign_form(text, jsonb, text, uuid, text, boolean, text);

create function private.sign_form(
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
  -- Signed out, or anonymous: only through the API route (Turnstile, a
  -- limit per address).
  if (auth.uid() is null or anonymous) and not via_api then
    raise exception 'use_the_form_page' using errcode = '42501';
  end if;
  if auth.uid() is null and t.needs_account then
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
  -- A concern sent without a name carries no signature either.
  if not anonymous then
    if char_length(btrim(coalesce(sign_form.signer_name, ''))) < 2 then
      raise exception 'signature_required' using errcode = '23514';
    end if;
    if not sign_form.esign_agreed then
      raise exception 'esign_agreement_required' using errcode = '23514';
    end if;
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
  if t.by_link then
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
    nullif(btrim(coalesce(sign_form.signer_contact, '')), ''),
    sign_form.subject_id,
    not anonymous and sign_form.esign_agreed,
    case when anonymous then null else nullif(btrim(coalesce(ip, '')), '') end,
    encode(extensions.digest(jsonb_build_object(
      'form', t.code, 'version', t.version, 'data', data,
      'signer', case when anonymous then null else btrim(sign_form.signer_name) end
    )::text, 'sha256'), 'hex')
  )
  returning id into new_id;

  if link.id is not null then
    update governance.form_links set used_at = now(), submission_id = new_id where id = link.id;
  end if;
  -- The signer's copy by email (an anonymous concern sends none).
  if not anonymous then
    perform private.enqueue('forms.signed_copy', jsonb_build_object('submission_id', new_id));
  end if;
  return new_id;
end;
$$;

revoke all on function private.sign_form(text, jsonb, text, uuid, text, boolean, text, boolean, text, text) from public, anon;
grant execute on function private.sign_form(text, jsonb, text, uuid, text, boolean, text, boolean, text, text) to authenticated, service_role;

create function governance.sign_form(
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
language sql
security invoker
set search_path = ''
as $$ select private.sign_form(form_key, data, signer_name, subject_id, signer_contact, anonymous, routing, esign_agreed, link_token, signer_ip) $$;

revoke all on function governance.sign_form(text, jsonb, text, uuid, text, boolean, text, boolean, text, text) from public, anon;
grant execute on function governance.sign_form(text, jsonb, text, uuid, text, boolean, text, boolean, text, text) to authenticated, service_role;
