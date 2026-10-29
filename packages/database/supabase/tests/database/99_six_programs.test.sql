-- Six programs, no groupings (migration 20261029000100, owner, Oct 29, 2026).
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
-- </preamble>
select plan(10);

select is(
  (select array_agg(slug order by sort) from core.programmes where is_active),
  array['second-chapter', 'typewriter-tour', 'company', 'salon', 'book-circle', 'open-pages'],
  'Six programs, in order'
);
select ok(
  not exists (select 1 from core.programmes where is_active and (rhythm_en is null or rhythm_ar is null)),
  'Each program shows its rhythm in one line, in both languages'
);
select is(
  (select name_en || ' / ' || name_ar from core.programmes where slug = 'salon'),
  'The Salon / الصالون الأدبي',
  'The Majlis is the Salon'
);
select is(
  (select summary_en from core.programmes where slug = 'salon'),
  'A guest, three readings, tea and conversation. Once a term, from fall 2027, a debate.',
  'The Salon''s summary'
);
select ok(
  not exists (select 1 from core.programmes
    where slug in ('majlis', 'munazara', 'mutanabbi-friday', 'bad-poetry-night')),
  'Munazara, Mutanabbi Friday and Bad Poetry Night are folded and removed'
);
select ok(
  exists (select 1 from core.programmes where slug = 'next-stop' and not is_active),
  'Next Stop is Qirtas''s video show: its program row is unpublished, not deleted'
);
select ok(
  not exists (select 1 from events.series_rules r join core.programmes p on p.id = r.programme_id
    where not p.is_active),
  'No repeat rule is left on a program that is not published'
);
select is(
  (select count(*)::integer from events.events e join core.programmes p on p.id = e.programme_id
    where p.slug in ('salon', 'book-circle', 'open-pages') and e.status = 'published'
      and (e.starts_at at time zone 'Asia/Baghdad')::time = '16:00'
      and extract(isodow from e.starts_at at time zone 'Asia/Baghdad') = 2),
  12,
  'The Tuesday series: twelve sessions at 4:00 PM'
);
select is(
  (select (ends_at at time zone 'Asia/Baghdad')::time from events.events where slug = 'open-pages-2027-03-30'),
  '18:00'::time,
  'Open Pages on March 30 runs to 6:00 PM'
);
select is(
  (select status from events.events where slug = 'book-circle-2027-04-09'),
  'draft',
  'Book Circle''s Friday on al-Mutanabbi Street waits for its time'
);

select * from finish();
rollback;
