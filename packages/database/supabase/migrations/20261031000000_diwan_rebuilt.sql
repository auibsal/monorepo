-- The Diwan, rebuilt (owner, Oct 30, 2026): six sections, nothing kept by
-- hand that a connected platform or the calendar already knows, and no
-- third-party apps.

-- ── No third-party apps ─────────────────────────────────────────────────────
-- Sign in with SAL and /api/v1 are gone. Any token issued to an app (it
-- carries a client_id) now reaches nothing: the restrictive policy on every
-- table refuses it, Storage refuses it, and the pre-request gate refuses
-- every Data API call it makes. The app registry and the consent page's
-- lookup go with them.

create or replace function private.client_allows(area text)
returns boolean
language sql
stable
set search_path = ''
as $$
  select private.oauth_client_id() is null;
$$;

do $$
declare
  p record;
begin
  for p in
    select schemaname, tablename
    from pg_policies
    where policyname = 'Third-party apps reach only their areas'
  loop
    execute format(
      'alter policy "Third-party apps reach only their areas" on %I.%I '
      'rename to "No third-party apps"',
      p.schemaname, p.tablename
    );
  end loop;
end;
$$;

create or replace function private.gate_request()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if private.oauth_client_id() is not null then
    raise exception 'Third-party apps are not supported' using errcode = '42501';
  end if;
end;
$$;

drop function access.oauth_client_info(uuid);
drop function private.table_area(text, text);
drop table access.oauth_clients;

-- ── Feature switches retired ────────────────────────────────────────────────
-- Online elections and volunteer certificates are simply on.

create or replace function private.elections_enabled()
returns boolean
language sql
stable
set search_path = ''
as $$
  select true;
$$;

-- The certificate trigger still reads the volunteer switch; keep it on and
-- private until the trigger is next rewritten.
update core.settings
  set value = 'true', is_public = false
  where key = 'features.volunteer_certificates';
delete from core.settings where key = 'features.elections';

-- ── Settings nobody keeps by hand ───────────────────────────────────────────
-- The name Qirtas, hello@auibsal.org and the AUIB calendar's address are in
-- the project file; Hudhud invites members to the Telegram group; the Faculty
-- Advisor is a role. Pledge and agreement versions stay, but private.
-- (platform.api_url stays: the outbox and the cron jobs call through it.)
delete from core.settings where key in (
  'journal.name_en',
  'journal.name_ar',
  'contact.email',
  'contact.telegram_url',
  'society.faculty_advisor_en',
  'society.faculty_advisor_ar',
  'auib.calendar_url'
);
update core.settings set is_public = false
  where key in ('pledges.member.version', 'pledges.human_authorship.version',
    'journal.agreement.version');

-- Signed-in members read the pledge versions they are asked to accept: the
-- body in private (it reads past the settings policy), the name the site
-- calls in core.
create function private.pledge_versions()
returns table (key text, value jsonb)
language sql
stable
security definer
set search_path = ''
as $$
  select s.key, s.value
  from core.settings s
  where s.key in ('pledges.member.version', 'pledges.human_authorship.version',
    'journal.agreement.version')
    and auth.uid() is not null;
$$;
revoke all on function private.pledge_versions() from public, anon;
grant execute on function private.pledge_versions() to authenticated;

create function core.pledge_versions()
returns table (key text, value jsonb)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.pledge_versions() $$;
revoke all on function core.pledge_versions() from public, anon;
grant execute on function core.pledge_versions() to authenticated;

-- ── The Site section ────────────────────────────────────────────────────────
-- No public page read these: page text lives with each page, the home page
-- builds itself, images are added where they are used, and notices go out
-- through Hudhud and the Sunday Paper.
drop table content.announcements cascade;
drop table content.homepage_slots cascade;
drop table content.pages cascade;
drop table content.media_assets cascade;

-- Collaborative rooms: minutes and Qirtas pieces only.
create or replace function private.can_edit_room(topic text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  parts text[] := regexp_match(
    topic,
    '^sal:([a-z]+):([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$'
  );
  kind text := parts[1];
  record_id uuid := parts[2]::uuid;
  issue uuid;
begin
  if parts is null or (select private.oauth_client_id()) is not null then
    return false;
  end if;
  case kind
    when 'minutes' then
      return exists (select 1 from governance.minutes m where m.id = record_id)
        and access.has_permission('governance.minutes.write');
    when 'piece' then
      select p.issue_id into issue from journal.pieces p where p.id = record_id;
      return issue is not null
        and access.has_permission('journal.publish', 'issue', issue);
    else
      return false;
  end case;
end;
$$;

-- ── Terms ───────────────────────────────────────────────────────────────────
-- Terms come from the AUIB calendar (the hourly sync writes core.semesters).
-- A role runs for the Society's year: unless given an end, it ends with the
-- Spring semester, so the April elections hand over cleanly. The Faculty
-- Advisor serves until the role is ended.

create function private.year_end()
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select ((s.ends_on + 1)::timestamp at time zone 'Asia/Baghdad')
  from core.semesters s
  where s.code like 'spring-%' and s.ends_on >= (now() at time zone 'Asia/Baghdad')::date
  order by s.ends_on
  limit 1;
$$;

-- Runs as its owner: whoever assigns the role (assign_role, the platform)
-- need not reach the private schema themselves.
create function private.role_runs_for_the_year()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.ends_at is null and new.role <> 'faculty_advisor' then
    new.ends_at := private.year_end();
  end if;
  return new;
end;
$$;

revoke all on function private.role_runs_for_the_year() from public, anon, authenticated;

create trigger runs_for_the_year before insert on access.role_assignments
  for each row execute function private.role_runs_for_the_year();

-- Today's term, for the Diwan and the members' pages.
create function core.current_term()
returns table (code text, name_en text, name_ar text, starts_on date, ends_on date)
language sql
stable
set search_path = ''
as $$
  select s.code, s.name_en, s.name_ar, s.starts_on, s.ends_on
  from core.semesters s
  where s.ends_on >= (now() at time zone 'Asia/Baghdad')::date
  order by s.starts_on
  limit 1;
$$;
grant execute on function core.current_term() to anon, authenticated;

-- ── Forms and letters ───────────────────────────────────────────────────────
-- No forms as such. Three requests stay, each where it belongs: a concern
-- (Concerns, in the Diwan's Society), a program pitch (What's on →
-- Programs) and a General Assembly motion (Society → Resolutions). The rest
-- are done elsewhere on the platform or are officers' papers kept as Notion
-- templates; their past submissions stay readable to those who sent and
-- handled them, and no new ones start.
alter table governance.form_types
  drop constraint form_types_submit_rule_check,
  add constraint form_types_submit_rule_check
    check (submit_rule in ('anyone', 'member', 'role_holder', 'handler', 'retired'));

update governance.form_types set submit_rule = 'retired'
  where key not in ('f09', 'f10', 'f20');

-- The Media Release (F-17) is now one choice in Profile: whether photos of
-- the member taken at the Society's events may be shared. Off until they
-- say so; read like the rest of their details (themselves and Membership).
alter table core.member_details
  add column photo_consent boolean not null default false;

-- Blackouts were typed by hand and nothing read them; the AUIB calendar
-- shows exam weeks and closures beside What's on.
drop table core.blackouts cascade;

-- ── The Faculty Advisor is a role ───────────────────────────────────────────
-- The advisor's name was typed into two settings; now whoever holds the
-- faculty_advisor role is named with the Council (last, under the role's
-- title), on the Council page and the members' Society page alike.
create or replace function private.council_members()
returns table (
  full_name_en text,
  full_name_ar text,
  titles_en text[],
  titles_ar text[]
)
language sql
stable
security definer
set search_path = ''
as $$
  with held as (
    select distinct on (a.user_id, a.role)
      a.user_id,
      coalesce(a.title_en, r.name_en) as title_en,
      coalesce(a.title_ar, r.name_ar) as title_ar,
      r.sort
    from access.role_assignments a
    join access.roles r on r.key = a.role
    where (r.is_council or r.key = 'faculty_advisor')
      and a.scope_type = 'global'
      and a.starts_at <= now()
      and (a.ends_at is null or a.ends_at > now())
    order by a.user_id, a.role, (a.title_en is null), a.starts_at
  )
  select
    p.full_name_en,
    p.full_name_ar,
    array_agg(h.title_en order by h.sort, h.title_en),
    array_agg(h.title_ar order by h.sort, h.title_en)
  from held h
  join core.profiles p on p.id = h.user_id
  group by h.user_id, p.full_name_en, p.full_name_ar
  order by min(h.sort), p.full_name_en;
$$;
