-- What is signed, and what is only sent (decisions.md, Documents and
-- forms; the ninth site prompt, 4, 5 and 9).
--
-- 1. Thirteen kinds are signed: role-agreement,
--    conflict-of-interest-declaration, confidentiality-agreement, handover,
--    media-release, partnership-memorandum, company-agreement,
--    publication-agreement, trip-consent, parent-consent,
--    qalam-mentor-agreement, qalam-parent-consent, qalam-publishing-consent.
--    Each keeps "Sign as [full official name]", an AGR number, Documents
--    and an emailed copy.
-- 2. The Code of Conduct stops being signed (the sign-up line and the role
--    agreement cover it); an event pitch, a concern and a members' meeting
--    motion become submissions with SUB numbers, unsigned, and members
--    support a motion with one click. Every record already signed is kept.
-- 3. Two email choices, both on by default (Settings → Notifications): a
--    copy of what someone signs, at once; and one daily update gathering
--    what happened to their applications and submissions.
-- 4. Each agreement opens with a three-line summary in both languages,
--    written by the Governance chat; until then staff see "Summary to come".

-- ── 1–2. The register ────────────────────────────────────────────────────
update governance.form_types
set in_register = false, filled = 'removed', submit_rule = 'retired'
where key = 'code-of-conduct';

update governance.form_types
set in_register = false
where key in ('concern', 'event-pitch', 'members-meeting-motion');

-- Only the signed kinds need a signature; the three sent kinds don't.
-- No pledge makes a record any more (the records already made stay).
drop trigger if exists code_of_conduct_record on membership.pledges;
drop function if exists private.code_of_conduct_record();

alter table governance.form_submissions drop constraint form_submissions_signed;
alter table governance.form_submissions add constraint form_submissions_signed
  check (status = 'draft' or signed_at is not null
    or form_key in ('concern', 'event-pitch', 'members-meeting-motion'));

-- SUB numbers have four digits, as decisions.md's table gives them.
create or replace function private.next_code(prefix text, year integer default null)
returns text
language sql
security definer
set search_path = ''
as $$
  insert into core.code_counters as c (prefix, year, last)
  values (next_code.prefix,
    coalesce(next_code.year, extract(year from now() at time zone 'Asia/Baghdad')::integer), 1)
  on conflict (prefix, year) do update set last = c.last + 1
  returning c.prefix || '-' || c.year || '-'
    || lpad(c.last::text, case when c.prefix in ('AGR', 'SUB') then 4 else 3 end, '0');
$$;

-- A signing gets its AGR number and verification code; a submission (sent,
-- not signed) its SUB number.
create or replace function private.number_agreement()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    new.reference := old.reference;
    new.verification_code := old.verification_code;
  end if;
  if new.reference is null and new.status <> 'draft' then
    if new.signed_at is not null then
      new.reference := private.next_code('AGR');
      new.verification_code := substr(encode(extensions.gen_random_bytes(10), 'hex'), 1, 10);
    else
      new.reference := private.next_code('SUB');
    end if;
  end if;
  return new;
end;
$$;

-- The one way in for both: a kind in the register is signed ("Sign as …",
-- with consent to sign electronically); any other kind is sent, with no
-- signature, and goes into the sender's daily update instead of an email.
create or replace function private.sign_form(
  form_key text, data jsonb, signer_name text, subject_id uuid default null,
  signer_contact text default null, anonymous boolean default false,
  routing text default 'none', esign_agreed boolean default false,
  link_token text default null, signer_ip text default null
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
  signed boolean;
begin
  if auth.uid() is not null then
    signer_name := coalesce(private.register_name(auth.uid()), signer_name);
  end if;
  select * into t from governance.form_types where key = sign_form.form_key;
  if not found or t.filled <> 'site' then
    raise exception 'unknown_form' using errcode = 'P0002';
  end if;
  signed := t.in_register;
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
  if signed and char_length(btrim(coalesce(sign_form.signer_name, ''))) < 2 then
    raise exception 'signature_required' using errcode = '23514';
  end if;
  if signed and not (sign_form.esign_agreed or private.esign_given(auth.uid())) then
    raise exception 'esign_agreement_required' using errcode = '23514';
  end if;
  if anonymous and not t.anonymous_ok then
    raise exception 'anonymous_not_allowed' using errcode = '22023';
  end if;
  if coalesce(routing, 'none') <> 'none' and t.key <> 'concern' then
    raise exception 'routing_only_for_concerns' using errcode = '22023';
  end if;
  if t.subject_kind = 'event' and t.key = 'trip-consent' and not exists (
    select 1 from events.events e
    where e.id = sign_form.subject_id and e.off_campus and e.status = 'published'
      and private.can_see_event_id(e.id)
  ) then
    raise exception 'not_a_trip' using errcode = '22023';
  end if;
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
    case when signed and not anonymous then btrim(sign_form.signer_name) end,
    case when signed then now() end,
    case when anonymous then null else nullif(btrim(coalesce(sign_form.signer_contact, '')), '') end,
    sign_form.subject_id,
    signed and (sign_form.esign_agreed or private.esign_given(auth.uid())),
    case when signed and not anonymous then nullif(btrim(coalesce(ip, '')), '') end,
    encode(extensions.digest(jsonb_build_object(
      'form', t.key, 'version', t.version, 'data', data,
      'signer', case when signed and not anonymous then btrim(sign_form.signer_name) end
    )::text, 'sha256'), 'hex')
  )
  returning id into new_id;

  -- A sealed concern: who sent it, kept apart from what the panel reads.
  if anonymous then
    insert into governance.sealed_signers (submission_id, user_id, signer_name)
    values (new_id, auth.uid(), coalesce(private.register_name(auth.uid()), btrim(sign_form.signer_name), ''));
  end if;

  if link.id is not null then
    update governance.form_links set used_at = now(), submission_id = new_id where id = link.id;
    if link.copy_to is not null and signed then
      perform private.enqueue('forms.signed_copy', jsonb_build_object(
        'submission_id', new_id, 'to', link.copy_to));
    end if;
  end if;
  if signed and not anonymous then
    -- The signer's copy by email, at once.
    perform private.enqueue('forms.signed_copy', jsonb_build_object('submission_id', new_id));
  elsif not signed and not anonymous then
    -- A submission: one "received" email at once with its SUB number; its
    -- later status changes go in the daily update.
    perform private.enqueue('forms.received', jsonb_build_object('submission_id', new_id));
  end if;
  return new_id;
end;
$$;

-- ── Supporting a motion, with one click ───────────────────────────────────
create table governance.motion_supports (
  submission_id uuid not null references governance.form_submissions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (submission_id, user_id)
);

comment on table governance.motion_supports is
  'Members supporting a motion or petition for a members'' meeting, one click each.';

create index motion_supports_user_id_idx on governance.motion_supports (user_id);

alter table governance.motion_supports enable row level security;

create policy "No third-party apps" on governance.motion_supports
  as restrictive for all to authenticated, anon
  using ((select private.client_allows('governance')))
  with check ((select private.client_allows('governance')));
create policy "Members read their own support" on governance.motion_supports
  for select to authenticated
  using (user_id = (select auth.uid()));

grant select on governance.motion_supports to authenticated;
grant all on governance.motion_supports to service_role;

-- Open motions, for members to read and support: the motion's own words
-- and its sender's short name (a motion is put to the members by name).
create function private.open_motions()
returns table (
  id uuid, reference text, title text, notes text, believes text, resolves text,
  motion_type text, mover_en text, mover_ar text, submitted_at timestamptz,
  supporters bigint, mine boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_member((select auth.uid())) then
    raise exception 'members only' using errcode = '42501';
  end if;
  return query
  select s.id, s.reference, s.data ->> 'title', s.data ->> 'notes',
    s.data ->> 'believes', s.data ->> 'resolves', s.data ->> 'motion_type',
    p.full_name_en, p.full_name_ar, s.submitted_at,
    (select count(*) from governance.motion_supports m where m.submission_id = s.id),
    exists (select 1 from governance.motion_supports m
      where m.submission_id = s.id and m.user_id = (select auth.uid()))
  from governance.form_submissions s
  left join core.profiles p on p.id = s.submitted_by
  where s.form_key = 'members-meeting-motion'
    and s.status in ('submitted', 'acknowledged')
    and s.withdrawn_at is null
  order by s.submitted_at desc;
end;
$$;
revoke all on function private.open_motions() from public, anon;
grant execute on function private.open_motions() to authenticated;

create function governance.open_motions()
returns table (
  id uuid, reference text, title text, notes text, believes text, resolves text,
  motion_type text, mover_en text, mover_ar text, submitted_at timestamptz,
  supporters bigint, mine boolean
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.open_motions() $$;
revoke all on function governance.open_motions() from public, anon;
grant execute on function governance.open_motions() to authenticated;

create function private.support_motion(submission_id uuid, support boolean)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_member((select auth.uid())) then
    raise exception 'members only' using errcode = '42501';
  end if;
  if not exists (
    select 1 from governance.form_submissions s
    where s.id = support_motion.submission_id and s.form_key = 'members-meeting-motion'
      and s.status in ('submitted', 'acknowledged') and s.withdrawn_at is null
  ) then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  if support then
    insert into governance.motion_supports (submission_id, user_id)
    values (support_motion.submission_id, (select auth.uid()))
    on conflict do nothing;
  else
    delete from governance.motion_supports m
    where m.submission_id = support_motion.submission_id and m.user_id = (select auth.uid());
  end if;
  return (select count(*) from governance.motion_supports m
    where m.submission_id = support_motion.submission_id);
end;
$$;
revoke all on function private.support_motion(uuid, boolean) from public, anon;
grant execute on function private.support_motion(uuid, boolean) to authenticated;

create function governance.support_motion(submission_id uuid, support boolean)
returns bigint
language sql
security invoker
set search_path = ''
as $$ select private.support_motion(submission_id, support) $$;
revoke all on function governance.support_motion(uuid, boolean) from public, anon;
grant execute on function governance.support_motion(uuid, boolean) to authenticated;

-- ── 3. The two email choices and the daily update ─────────────────────────
alter table core.profiles
  add column email_signed_copy boolean not null default true,
  add column email_receipts boolean not null default true,
  add column email_daily_updates boolean not null default true;

comment on column core.profiles.email_signed_copy is
  'Email a copy of what the person signs, at once (Settings → Notifications).';
comment on column core.profiles.email_daily_updates is
  'Gather updates on the person''s applications and submissions into one email a day (Settings → Notifications).';

comment on column core.profiles.email_receipts is
  'The "received" email, at once, for an application or a submission (decisions.md, Documents and forms). On by default.';
grant update (email_signed_copy, email_receipts, email_daily_updates) on core.profiles to authenticated;

create table core.daily_updates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (char_length(kind) between 1 and 60),
  ref text check (char_length(ref) <= 100),
  detail jsonb not null default '{}'::jsonb check (jsonb_typeof(detail) = 'object'),
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

comment on table core.daily_updates is
  'What happened to a person''s applications and submissions, gathered into one email a day (and kept in Your account either way).';

create index daily_updates_waiting_idx on core.daily_updates (user_id, created_at) where sent_at is null;

alter table core.daily_updates enable row level security;

create policy "No third-party apps" on core.daily_updates
  as restrictive for all to authenticated, anon
  using ((select private.client_allows('core')))
  with check ((select private.client_allows('core')));
create policy "People read their own updates" on core.daily_updates
  for select to authenticated
  using (user_id = (select auth.uid()));

grant select on core.daily_updates to authenticated;
grant all on core.daily_updates to service_role;

create function private.add_update(uid uuid, kind text, ref text, detail jsonb default '{}'::jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into core.daily_updates (user_id, kind, ref, detail)
  values (uid, kind, ref, coalesce(detail, '{}'::jsonb));
$$;
revoke all on function private.add_update(uuid, text, text, jsonb) from public, anon, authenticated;

-- Once a day (8:00 p.m. Baghdad time), one email per person with updates
-- waiting, for those who keep the daily update on; the rest are marked
-- read, since Your account shows them either way.
create function private.enqueue_daily_updates()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer := 0;
  r record;
begin
  -- The email carries the updates it reports, so each goes out once.
  for r in
    select u.user_id, array_agg(u.id order by u.created_at) as ids
    from core.daily_updates u
    join core.profiles p on p.id = u.user_id
    where u.sent_at is null and p.email_daily_updates
    group by u.user_id
  loop
    perform private.enqueue('account.daily_update',
      jsonb_build_object('user_id', r.user_id, 'update_ids', to_jsonb(r.ids)));
    n := n + 1;
  end loop;
  update core.daily_updates set sent_at = now() where sent_at is null;
  return n;
end;
$$;
revoke all on function private.enqueue_daily_updates() from public, anon, authenticated;

select cron.schedule('sal-daily-updates', '0 17 * * *', $$select private.enqueue_daily_updates()$$);

-- ── 4. The agreements' summaries ──────────────────────────────────────────
alter table governance.form_types
  add column summary_en text check (char_length(summary_en) <= 600),
  add column summary_ar text check (char_length(summary_ar) <= 600);

comment on column governance.form_types.summary_en is
  'Three lines on what the signer agrees to, above the full text (decisions.md, Documents and forms). Written by the Governance chat; staff see "Summary to come" until then.';
