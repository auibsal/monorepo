-- Qirtas in six sections, six types each (migrations 20261029000200-0300).
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
select plan(14);

select is(
  (select array_agg(d order by d)::text[] from unnest(enum_range(null::journal.desk)) d),
  array['news', 'letters', 'gallery', 'video', 'voices', 'games'],
  'Six sections, with Games'
);
select is(
  (select array_agg(n order by n) from (
    select count(*)::integer as n from unnest(enum_range(null::journal.category)) c
    where journal.is_current_category(c) group by journal.desk_of(c)) t),
  array[6, 6, 6, 6, 6, 6],
  'Six types in each section'
);
select is(journal.desk_of('review'), 'voices'::journal.desk, 'The review is in Voices now');
select is(journal.desk_of('event_coverage'), 'news'::journal.desk, 'Event coverage is News');
select is(journal.desk_of('calligraphy'), 'gallery'::journal.desk, 'Calligraphy is Gallery');
select is(journal.desk_of('next_stop_episode'), 'video'::journal.desk, 'A Next Stop episode is Video');
select is(journal.desk_of('name_the_book'), 'games'::journal.desk, 'Name the Book is a game');
select ok(not journal.is_current_category('prose'), 'Prose is retired');
select ok(
  not journal.is_edition_desk('games') and not journal.is_edition_desk('voices'),
  'Games and Voices come through the newsroom door'
);

-- The newsroom door takes Games, without a call; the database refuses retired types.
select pg_temp.make_user('00000000-0000-0000-0000-0000000065a1', 'puzzler@auib.edu.iq', 'Puzzler');
select pg_temp.make_user('00000000-0000-0000-0000-0000000065a2', 'games.ed@auib.edu.iq', 'Games Editor');
select pg_temp.grant_role('00000000-0000-0000-0000-0000000065a2', 'games_editor');
insert into membership.pledges (user_id, pledge_type, version)
select '00000000-0000-0000-0000-0000000065a1', t, '1'
from unnest(enum_range(null::membership.pledge_type)) t;

select pg_temp.login_as('00000000-0000-0000-0000-0000000065a1');
select lives_ok(
  $$ insert into journal.submissions (category, language, title, body_html,
       human_authorship_confirmed, first_publication_confirmed)
     values ('riddle', 'en', 'What has pages', '<p>A riddle</p>', true, true) $$,
  'A member sends a riddle to Games'
);
select throws_ok(
  $$ insert into journal.submissions (category, language, title, body_html,
       human_authorship_confirmed, first_publication_confirmed)
     values ('prose', 'en', 'Old type', '<p>x</p>', true, true) $$,
  '22023', 'category_retired', 'The database refuses a retired type'
);
select throws_ok(
  $$ insert into journal.submissions (category, language, title,
       human_authorship_confirmed, first_publication_confirmed)
     values ('short_film', 'en', 'No link', true, true) $$,
  '23514', null, 'Every Video type needs its link'
);

select pg_temp.login_as('00000000-0000-0000-0000-0000000065a2');
select is(
  (select count(*) from journal.desk_queue() where desk = 'games')::integer,
  0,
  'Games work is read blind, not by name in a section queue'
);
select ok(
  access.has_permission('journal.edit.games') and not access.has_permission('journal.edit.voices'),
  'The Games Editor edits Games only'
);

select * from finish();
rollback;
