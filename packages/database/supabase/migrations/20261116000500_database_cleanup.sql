-- The database's dead weight (the owner, Nov 16: unused, outdated and
-- duplicated things go; one place for each thing). Every item below was
-- checked in production on Nov 16: no app code, no other function, no
-- trigger, policy, default, constraint, cron job or PostgREST setting uses
-- it.

-- A table nothing reads or writes: the Council's terms are the semesters
-- and the role assignments (AGENTS.md: nobody types what the site knows).
drop table if exists governance.council_terms;

-- API functions the site stopped calling, with the bodies only they called.
drop function if exists core.my_minor_status();
drop function if exists private.my_minor_status();
drop function if exists core.previous_semester();
drop function if exists private.previous_semester();
drop function if exists journal.submission_partners();
drop function if exists private.submission_partners();
drop function if exists programmes.public_productions();
drop function if exists private.public_productions();

-- Helpers nothing calls, and trigger functions no trigger uses.
drop function if exists private.add_update(uuid, text, text, jsonb);
drop function if exists private.can_keep_ad(text);
drop function if exists private.edition_citation(journal.issues, text);
drop function if exists private.guard_production_partner();
drop function if exists private.is_leadership_role(text);
drop function if exists private.judge_names();
drop function if exists private.manages_opening_id(uuid);
drop function if exists private.matches_legal_name(uuid, text);
drop function if exists private.name_key(text, text, text, text);
drop function if exists private.opening_is_open(uuid);
drop function if exists private.partner_has_lead(uuid);
drop function if exists private.reject_change();
drop function if exists private.valid_drop_off_points(jsonb);
drop function if exists private.wall_name(text, text, text);
-- Broken as well as unused: it read access.oauth_clients, which is gone.
drop function if exists private.oauth_client_info(uuid);
-- The old sign-up gate (AUIB addresses only); one sign-up for everyone
-- replaced it, and the triggers on auth.users decide now.
drop function if exists private.sign_up_allowed(text, jsonb);

-- Indexes another index already covers (the same leading column).
drop index if exists journal.calls_issue_id_idx;
drop index if exists membership.pledges_user_id_idx;

-- Settings nothing reads.
delete from core.settings where key in ('journal.tagline_en', 'journal.tagline_ar');

-- Every table has a primary key (Supabase's advisor); the rate counter's
-- rows had none.
alter table private.rate_hits
  add column if not exists id bigint generated always as identity primary key;
