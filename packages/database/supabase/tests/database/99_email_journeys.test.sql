-- The experience audit (migration 20261101001600): the Awards Coordinator
-- role, and the Society's signature kept by name on a memorandum.
begin;
-- <preamble>
-- Shared pgTAP preamble. Each test file includes a copy (pg_prove runs files
-- in isolation); keep them identical. `bun run --cwd packages/database db:test:sync` rewrites them.
create extension if not exists pgtap with schema extensions;
set search_path = extensions, public;

create function pg_temp.login_as(uid uuid, extra jsonb default '{}')
returns void
language plpgsql
as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config(
    'request.jwt.claims',
    -- aal2 by default (two-step sign-in done); pass '{"aal":"aal1"}' to test without it.
    (jsonb_build_object('sub', uid, 'role', 'authenticated', 'aal', 'aal2') || extra)::text,
    true
  );
  perform set_config('role', 'authenticated', true);
end;
$$;

create function pg_temp.login_anon()
returns void
language plpgsql
as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  perform set_config('role', 'anon', true);
end;
$$;

create function pg_temp.logout()
returns void
language plpgsql
as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '', true);
end;
$$;

-- A confirmed account. AUIB addresses are verified by the sign-up trigger.
create function pg_temp.make_user(uid uuid, email text, name text default 'Test User')
returns uuid
language sql
as $$
  insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data, aud, role)
  values (uid, email, now(), jsonb_build_object('full_name_en', name), 'authenticated', 'authenticated')
  returning id;
$$;

create function pg_temp.grant_role(uid uuid, role_key text, kind text default 'global', scope uuid default null)
returns void
language sql
as $$
  insert into access.role_assignments (user_id, role, scope_type, scope_id)
  values (uid, role_key, kind, scope);
$$;

grant execute on all functions in schema pg_temp to public;

-- Semesters around today: older, previous, current.
insert into core.semesters (code, name_en, name_ar, starts_on, ends_on) values
  ('fall-2024', 'Older', 'أقدم', current_date - 420, current_date - 300),
  ('spring-2025', 'Previous', 'السابق', current_date - 200, current_date - 60),
  ('fall-2025', 'Current', 'الحالي', current_date - 30, current_date + 60);

-- Tests check the two-activity rule; the founding-voter tests turn the
-- first-100 rule back on themselves.
update core.settings set value = '0' where key = 'membership.founding_voters';

-- An adopted Council resolution, with its minutes: the Council's vote that
-- approves a partnership (decisions §10).
create function pg_temp.council_resolution(
  id uuid default '00000000-0000-0000-0000-0000000c0001',
  code text default 'R-2026-99'
)
returns uuid
language sql
as $$
  with m as (
    insert into governance.minutes (title_en, text_en, meeting_on, body, status, adopted_on)
    values ('Council meeting', '<p>Minutes.</p>', current_date - 1, 'council', 'approved', current_date)
    returning id
  )
  insert into governance.resolutions (id, code, title_en, text_en, body, status, adopted_on, minutes_id)
  select council_resolution.id, council_resolution.code, 'Approves the partnership', '<p>Resolved.</p>', 'council', 'adopted', current_date, m.id
  from m
  returning id;
$$;
-- </preamble>

-- Every journey added in the email audit queues its notice (Nov 4, 2026).
select plan(14);

select pg_temp.make_user('00000000-0000-0000-0000-0000000e0a01', 'mail-member@auib.edu.iq', 'Mail Member');
select pg_temp.make_user('00000000-0000-0000-0000-0000000e0a02', 'mail-other@auib.edu.iq', 'Mail Other');

create function pg_temp.queued(k text, user_id uuid) returns boolean
language sql as $$
  select exists (select 1 from core.outbox o
    where o.kind = k and o.payload ->> 'user_id' = user_id::text)
$$;

-- 1. An event canceled tells whoever booked it, ten minutes on.
insert into events.events (id, slug, title_en, title_ar, starts_at, status, entry)
values ('0e000000-0000-0000-0000-0000000e0e01', 'mail-evening', 'An evening', 'أمسية',
  now() + interval '3 days', 'published', 'rsvp');
insert into events.rsvps (event_id, user_id, status)
values ('0e000000-0000-0000-0000-0000000e0e01', '00000000-0000-0000-0000-0000000e0a01', 'confirmed');
update events.events set starts_at = starts_at + interval '1 hour'
where id = '0e000000-0000-0000-0000-0000000e0e01';
update events.events set venue_en = 'The library'
where id = '0e000000-0000-0000-0000-0000000e0e01';
select is(
  (select count(*)::int from core.outbox where kind = 'events.changed'
     and payload ->> 'user_id' = '00000000-0000-0000-0000-0000000e0a01'),
  1,
  'Two quick edits to an event make one notice to whoever booked'
);
select ok(
  (select (payload ->> 'send_after')::timestamptz > now() from core.outbox
   where kind = 'events.changed' limit 1),
  'and it waits ten minutes for the last edit'
);

-- 2. Partner applications: received, then decided.
insert into governance.partners (id, slug, name_en, kind, status)
values ('0e000000-0000-0000-0000-0000000e0b01', 'mail-partner', 'Mail Partner', 'other', 'prospect');
insert into governance.partner_agreements (partner_id, purpose_en, starts_on, applied_by)
values ('0e000000-0000-0000-0000-0000000e0b01', 'Readings together.', current_date,
  '00000000-0000-0000-0000-0000000e0a02');
select ok(
  pg_temp.queued('partners.application_received', '00000000-0000-0000-0000-0000000e0a02'),
  'An application is acknowledged'
);
update governance.partners set status = 'ended' where id = '0e000000-0000-0000-0000-0000000e0b01';
select ok(
  exists (select 1 from core.outbox where kind = 'partners.application_decided'
    and payload ->> 'approved' = 'false'),
  'and its decision is sent'
);

-- 3. An election's notice reaches every member.
insert into membership.memberships (user_id)
values ('00000000-0000-0000-0000-0000000e0a01') on conflict do nothing;
insert into governance.elections (id, title_en, title_ar, nominations_open_at,
  nominations_close_at, voting_opens_at, voting_closes_at)
values ('0e000000-0000-0000-0000-0000000e0c01', 'Mail election', 'انتخابات',
  now() + interval '14 days', now() + interval '21 days',
  now() + interval '22 days', now() + interval '23 days');
update governance.elections set status = 'notice', notice_given_at = now()
where id = '0e000000-0000-0000-0000-0000000e0c01';
select ok(
  exists (select 1 from core.outbox where kind = 'governance.election'
    and payload ->> 'stage' = 'notice'
    and payload ->> 'user_id' = '00000000-0000-0000-0000-0000000e0a01'),
  'The election notice goes to every member'
);

-- 5. A request taken up tells its sender; "in progress" doesn't.
insert into governance.form_submissions (id, form_key, submitted_by, status, submitted_at, signer_name, signed_at)
values ('0e000000-0000-0000-0000-0000000e0d01', 'f21', '00000000-0000-0000-0000-0000000e0a01',
  'submitted', now(), 'A Member', now());
update governance.form_submissions set status = 'in_progress'
where id = '0e000000-0000-0000-0000-0000000e0d01';
select ok(
  not pg_temp.queued('forms.updated', '00000000-0000-0000-0000-0000000e0a01'),
  'A request in progress sends nothing'
);
update governance.form_submissions set status = 'closed', closed_at = now()
where id = '0e000000-0000-0000-0000-0000000e0d01';
select ok(
  pg_temp.queued('forms.updated', '00000000-0000-0000-0000-0000000e0a01'),
  'and a closed one tells its sender'
);

-- 6. A removal request done tells its requester.
insert into programmes.removal_requests (id, requester_name, requester_email, details, requester_lang)
values ('0e000000-0000-0000-0000-0000000e0f01', 'Someone', 'someone@example.com', 'My photo', 'ar');
update programmes.removal_requests set status = 'removed', action_taken = 'Taken down'
where id = '0e000000-0000-0000-0000-0000000e0f01';
select ok(
  exists (select 1 from core.outbox where kind = 'removal.done'
    and payload ->> 'request_id' = '0e000000-0000-0000-0000-0000000e0f01'),
  'A removal request done tells its requester'
);

-- 7. An audition time booked confirms.
insert into programmes.productions (id, slug, title_en, title_ar)
values ('0e000000-0000-0000-0000-0000000e1001', 'mail-play', 'A play', 'مسرحية');
insert into programmes.auditions (id, production_id, starts_at, ends_at)
values ('0e000000-0000-0000-0000-0000000e1101', '0e000000-0000-0000-0000-0000000e1001',
  now() + interval '5 days', now() + interval '5 days 2 hours');
insert into programmes.audition_signups (audition_id, user_id, status)
values ('0e000000-0000-0000-0000-0000000e1101', '00000000-0000-0000-0000-0000000e0a01', 'signed_up');
select ok(
  pg_temp.queued('company.audition_update', '00000000-0000-0000-0000-0000000e0a01'),
  'An audition time booked confirms'
);

-- 8. A new role says so; a partner's team role doesn't.
insert into access.role_assignments (user_id, role)
values ('00000000-0000-0000-0000-0000000e0a02', 'letters_editor');
select ok(
  pg_temp.queued('access.role_assigned', '00000000-0000-0000-0000-0000000e0a02'),
  'A new role is announced to its holder'
);

-- 9. No separate welcome: it is part of the confirmation email (audit A1).
delete from membership.pledges where user_id = '00000000-0000-0000-0000-0000000e0a02';
delete from core.outbox where kind = 'membership.welcome';
insert into membership.pledges (user_id, pledge_type, version)
values ('00000000-0000-0000-0000-0000000e0a02', 'member', '1');
insert into membership.pledges (user_id, pledge_type, version)
values ('00000000-0000-0000-0000-0000000e0a02', 'member', '2');
select is(
  (select count(*)::int from core.outbox where kind = 'membership.welcome'
     and payload ->> 'user_id' = '00000000-0000-0000-0000-0000000e0a02'),
  0,
  'A pledge queues no welcome email (one email per sign-up)'
);

-- 10. Shifts tomorrow are reminded.
insert into events.events (id, slug, title_en, title_ar, starts_at, status, entry)
values ('0e000000-0000-0000-0000-0000000e1201', 'the-fair-ej', 'The book fair', 'معرض الكتب',
  now() + interval '1 day', 'published', 'open');
insert into programmes.shifts (id, event_id, role_en, role_ar, starts_at, ends_at)
values ('0e000000-0000-0000-0000-0000000e1301', '0e000000-0000-0000-0000-0000000e1201',
  'Welcome desk', 'الاستقبال',
  ((now() at time zone 'Asia/Baghdad')::date + 1 + time '10:00') at time zone 'Asia/Baghdad',
  ((now() at time zone 'Asia/Baghdad')::date + 1 + time '12:00') at time zone 'Asia/Baghdad');
insert into programmes.shift_signups (shift_id, user_id, status)
values ('0e000000-0000-0000-0000-0000000e1301', '00000000-0000-0000-0000-0000000e0a01', 'signed_up');
select ok(private.daily_notices() >= 1, 'The daily notices run');
select ok(
  pg_temp.queued('events.shift_reminder', '00000000-0000-0000-0000-0000000e0a01'),
  'and remind tomorrow''s shifts'
);

-- Nothing per reply any more: the digest replaces it.
select hasnt_function('private', 'after_opening_reply', 'Replies no longer send one email each');

select * from finish();
rollback;
