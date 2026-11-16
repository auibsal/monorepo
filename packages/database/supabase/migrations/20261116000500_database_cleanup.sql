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
drop function if exists programs.public_productions();
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

-- Its one reader and writer is core.take_rate (SECURITY DEFINER, as the
-- owner); no one else reaches it. Said as a policy, so RLS shows the intent
-- (Supabase's advisor: RLS enabled, no policy).
create policy "Only core.take_rate" on private.rate_hits
  as restrictive for all to public using (false) with check (false);

-- ── Retired rows ────────────────────────────────────────────────────────────

-- No series (decisions.md, Events): the five retired series rows have no
-- events, roles or needs left.
delete from access.role_assignments
where scope_type = 'program'
  and scope_id in (select id from core.programs
    where slug in ('book-circle', 'gallery-wall', 'listening-room', 'open-pages', 'salon'));
delete from core.programs
where slug in ('book-circle', 'gallery-wall', 'listening-room', 'open-pages', 'salon');

-- Qirtas's own row keeps a retired name as its slug (decisions.md, Retired
-- names). The storage folder media/waraq/ keeps its name: files live there.
update core.programs set slug = 'qirtas' where slug = 'waraq';

create or replace function private.lists_needs(program_id uuid)
returns boolean
language sql
stable security definer
set search_path to ''
as $$
  select private.has_permission('programs.manage', 'program', lists_needs.program_id)
    or (
      private.has_permission('journal.manage')
      and exists (select 1 from core.programs p where p.id = lists_needs.program_id and p.slug = 'qirtas')
    );
$$;

alter policy "Select by authenticated" on core.programs
  using (
    is_active
    or (select private.has_permission('programs.manage'))
    or (slug = 'qirtas' and (select private.has_permission('journal.manage')))
  );

-- Descriptions that still name retired roles and the old staff space.
update access.permissions set description = 'See who wrote each submission (the Managing Editor)'
where key = 'journal.identity.view';
update access.permissions set description =
  'Run the Typewriter Tour: transcribe, attach and approve Six Words (the Secretary, the Director of Membership and the Tour Lead)'
where key = 'tour.run';
update access.permissions set description = 'Read the signed copies of forms filled on the site (the Secretary)'
where key = 'forms.handle';
update core.settings set description = 'The bot''s Telegram username without the @, for the “Connect Telegram” link in Settings.'
where key = 'telegram.bot_username';
update core.settings set description = 'The officer handbook in the team''s Notion workspace: its first page and each page by its slug.'
where key = 'notion.handbook';
update core.settings set description = 'Notion data sources the platform syncs with.'
where key = 'notion.data_sources';
