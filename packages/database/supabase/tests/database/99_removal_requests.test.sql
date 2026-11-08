-- Removal requests (SAL-MEM-02, decisions §13): hidden at once, decided
-- within two business days, back as it was if declined.
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

select plan(6);

select pg_temp.make_user('00000000-0000-0000-0000-0000000e0b04', 'photographer@auib.edu.iq', 'A Photographer');
insert into journal.contributors (id, slug, name_en, name_ar, user_id)
values ('00000000-0000-0000-0000-0000000e0b03', 'removal-photographer', 'A Photographer', 'مصوّر',
  '00000000-0000-0000-0000-0000000e0b04');
insert into journal.pieces (id, slug, category, language, title_en, title_ar, status, published_at, contributor_id)
values ('00000000-0000-0000-0000-0000000e0b01', 'fair-photos', 'photography', 'en', 'Fair photos', 'صور', 'published',
  now() - interval '1 day', '00000000-0000-0000-0000-0000000e0b03');

insert into programmes.removal_requests (id, requester_name, requester_email, content_url, details)
values ('00000000-0000-0000-0000-0000000e0b02', 'Someone', 'someone@example.com',
  'https://auibsal.org/qirtas/gallery/fair-photos?x=1', 'I am in the second photo.');

select is((select status from journal.pieces where id = '00000000-0000-0000-0000-0000000e0b01'), 'unpublished',
  'What the request points to is hidden as it arrives');
select is((select hidden_kind from programmes.removal_requests where id = '00000000-0000-0000-0000-0000000e0b02'), 'piece',
  'and the request records what it hid');
select is(extract(dow from private.add_business_days('2026-11-12 09:00+03', 2) at time zone 'Asia/Baghdad')::integer, 1,
  'Two business days from a Thursday end on the Monday (Friday and Saturday are off)');
select ok((select due_at > now() from programmes.removal_requests where id = '00000000-0000-0000-0000-0000000e0b02'),
  'The request is due within two business days');

update programmes.removal_requests set status = 'declined', action_taken = 'Not the requester in the photo.'
where id = '00000000-0000-0000-0000-0000000e0b02';
select is((select status from journal.pieces where id = '00000000-0000-0000-0000-0000000e0b01'), 'published',
  'A declined request brings it back');

insert into programmes.removal_requests (requester_name, requester_email, content_url, details)
values ('Someone', 'someone@example.com', 'https://www.instagram.com/p/abc', 'On Instagram.');
select is((select status from journal.pieces where id = '00000000-0000-0000-0000-0000000e0b01'), 'published',
  'An address off the site hides nothing here');

select * from finish();
rollback;
