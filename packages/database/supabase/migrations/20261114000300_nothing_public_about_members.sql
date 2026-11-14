-- Nothing about members is public except bylines and role holders, and Your
-- account in six tabs (decisions.md, Members and The site; the ninth site
-- prompt, 6, 7, 11 and 12). The owner approved each removal below, with
-- the counts in production on Nov 14, 2026: no saves, no directory
-- opt-ins, no hidden credits (20261114000000), one Notion invite link.
--
-- 1. Six-word pages are private: the writer sees each under its event in
--    Your account, staff in the Diwan; the public wall and sharing go, and
--    the Tour's page shows counts only.
-- 2. The members-only directory and Qirtas's contributor pages go.
-- 3. Saving goes: the Saved tab and its table.
-- 4. There is no pledge to make: the Code of Conduct is the sign-up line.
-- 5. The enrollment check: once a semester, the Director of Membership
--    compares classes with Student Life's enrollment list, matched by AUIB
--    email; only mismatches show, and nothing of the list is kept.
-- 6. Notion by named invitation: the invite link goes; the Secretary
--    invites each role holder by their AUIB email and marks it done.

-- ── 1. Six words ──────────────────────────────────────────────────────────
drop function if exists programmes.six_words_wall(integer);
drop function if exists private.six_words_wall(integer);
drop function if exists programmes.profile_six_words(text);
drop function if exists private.profile_six_words(text);

-- The writer's own pages, each with the event it was typed at.
create function private.my_six_words()
returns table (id uuid, text text, language text, tour text, event_id uuid, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select w.id, w.text, w.language, w.tour,
    (select s.event_id from programmes.shifts s where s.id = w.station_shift_id),
    w.created_at
  from programmes.six_words w
  where w.user_id = (select auth.uid()) and w.text is not null
  order by w.created_at desc;
$$;
revoke all on function private.my_six_words() from public, anon;
grant execute on function private.my_six_words() to authenticated;

create function programmes.my_six_words()
returns table (id uuid, text text, language text, tour text, event_id uuid, created_at timestamptz)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.my_six_words() $$;
revoke all on function programmes.my_six_words() from public, anon;
grant execute on function programmes.my_six_words() to authenticated;

-- The Tour's page: counts only.
create function private.six_words_counts()
returns table (pages bigint, writers bigint)
language sql
stable
security definer
set search_path = ''
as $$
  select count(*), count(distinct coalesce(w.user_id::text, w.email))
  from programmes.six_words w
  where w.text is not null;
$$;
revoke all on function private.six_words_counts() from public;
grant execute on function private.six_words_counts() to anon, authenticated;

create function programmes.six_words_counts()
returns table (pages bigint, writers bigint)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.six_words_counts() $$;
revoke all on function programmes.six_words_counts() from public;
grant execute on function programmes.six_words_counts() to anon, authenticated;

-- ── 2. The directory ──────────────────────────────────────────────────────
drop function if exists membership.members_directory();
drop function if exists private.members_directory();

create or replace function private.profile_visible(target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    target = (select auth.uid())
    or private.has_permission('members.manage')
    or private.has_permission('members.verify')
    or private.is_staff((select auth.uid()))
    or (
      private.has_permission('partners.manage')
      and exists (
        select 1 from governance.partner_affiliations f where f.user_id = target
      )
    )
    or (
      private.is_verified()
      and (
        private.is_staff(target)
        or exists (
          select 1 from governance.candidates c
          where c.user_id = target and c.status = 'approved'
        )
      )
    );
$$;

-- Qirtas's contributor pages (/qirtas/authors/<slug>) go; a byline is
-- only a name on a piece.
drop function if exists journal.author_card(text);
drop function if exists private.author_card(text);
drop function if exists journal.my_author_page();
drop function if exists private.my_author_page();

-- ── 4. No pledges to make (the shape stays for its callers) ──────────────
create or replace function private.my_status()
returns table (
  is_member boolean, verified boolean, tier membership.tier, member_since date,
  activities integer, voting_member boolean, pending_pledges membership.pledge_type[],
  in_directory boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    membership.is_member(),
    exists (select 1 from core.profiles p where p.id = auth.uid() and p.verified_at is not null),
    (select m.tier from membership.memberships m where m.user_id = auth.uid()),
    (select m.member_since from membership.memberships m where m.user_id = auth.uid()),
    private.activity_count(auth.uid()),
    private.is_voting_member(auth.uid()),
    array[]::membership.pledge_type[],
    false;
$$;

alter table membership.memberships drop column in_directory;

-- ── 3. Saving ─────────────────────────────────────────────────────────────
drop table if exists journal.saved_pieces;

-- ── 5. The enrollment check ───────────────────────────────────────────────
-- Given the AUIB addresses on Student Life's enrollment list for the
-- semester, the mismatches with the Register: a Member (a student) not on
-- the list, and an Associate who is. Matched by AUIB email; the list is
-- read in this call only and never stored.
create function private.enrollment_mismatches(enrolled text[])
returns table (user_id uuid, name_en text, name_ar text, tier membership.tier, issue text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  listed text[];
begin
  if not private.has_permission('members.manage') then
    raise exception 'Only the Director of Membership runs the check' using errcode = '42501';
  end if;
  if coalesce(array_length(enrolled, 1), 0) = 0 then
    raise exception 'empty_list' using errcode = '22023';
  end if;
  select array_agg(distinct lower(btrim(e))) into listed
  from unnest(enrolled) as e
  where btrim(e) ~* '^[^@\s]+@auib\.edu\.iq$';
  return query
  select p.id, p.full_name_en, p.full_name_ar, m.tier,
    case when m.tier = 'member' then 'not_enrolled' else 'enrolled_associate' end
  from membership.memberships m
  join core.profiles p on p.id = m.user_id
  join auth.users u on u.id = m.user_id
  where private.is_auib_email(u.email)
    and (
      (m.tier = 'member' and not (lower(u.email) = any (coalesce(listed, '{}'))))
      or (m.tier = 'associate' and lower(u.email) = any (coalesce(listed, '{}')))
    )
  order by m.tier, lower(p.full_name_en);
end;
$$;
revoke all on function private.enrollment_mismatches(text[]) from public, anon;
grant execute on function private.enrollment_mismatches(text[]) to authenticated;

create function membership.enrollment_mismatches(enrolled text[])
returns table (user_id uuid, name_en text, name_ar text, tier membership.tier, issue text)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.enrollment_mismatches(enrolled) $$;
revoke all on function membership.enrollment_mismatches(text[]) from public, anon;
grant execute on function membership.enrollment_mismatches(text[]) to authenticated;

-- ── 6. Notion by named invitation ─────────────────────────────────────────
delete from core.settings where key in ('notion.invite_link', 'notion.catch_up_sent_at');

create table core.notion_invitations (
  user_id uuid primary key references auth.users (id) on delete cascade,
  invited_at timestamptz not null default now(),
  invited_by uuid references auth.users (id) on delete set null default auth.uid()
);

comment on table core.notion_invitations is
  'Role holders the Secretary invited to Notion by their AUIB email (no shared link: Notion is staff only).';

create index notion_invitations_invited_by_idx on core.notion_invitations (invited_by);

alter table core.notion_invitations enable row level security;

create policy "No third-party apps" on core.notion_invitations
  as restrictive for all to authenticated, anon
  using ((select private.client_allows('core')))
  with check ((select private.client_allows('core')));

grant all on core.notion_invitations to service_role;

-- Who holds a Diwan role (one that opens Notion) and has no invitation yet.
create function private.notion_to_invite()
returns table (user_id uuid, name_en text, name_ar text, email text, roles text[])
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (private.has_permission('members.manage') or private.has_permission('settings.manage')) then
    raise exception 'Only the Secretary sees this list' using errcode = '42501';
  end if;
  return query
  select p.id, p.full_name_en, p.full_name_ar, u.email::text,
    array_agg(distinct coalesce(nullif(btrim(a.title_en), ''), r.name_en))
  from access.role_assignments a
  join access.roles r on r.key = a.role and r.in_notion
  join core.profiles p on p.id = a.user_id
  join auth.users u on u.id = a.user_id
  where a.starts_at <= now() and (a.ends_at is null or a.ends_at > now())
    and not exists (select 1 from core.notion_invitations n where n.user_id = a.user_id)
  group by p.id, p.full_name_en, p.full_name_ar, u.email
  order by lower(p.full_name_en);
end;
$$;
revoke all on function private.notion_to_invite() from public, anon;
grant execute on function private.notion_to_invite() to authenticated;

create function core.notion_to_invite()
returns table (user_id uuid, name_en text, name_ar text, email text, roles text[])
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.notion_to_invite() $$;
revoke all on function core.notion_to_invite() from public, anon;
grant execute on function core.notion_to_invite() to authenticated;

create function private.mark_notion_invited(member uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (private.has_permission('members.manage') or private.has_permission('settings.manage')) then
    raise exception 'Only the Secretary records an invitation' using errcode = '42501';
  end if;
  insert into core.notion_invitations (user_id, invited_by)
  values (member, (select auth.uid()))
  on conflict (user_id) do nothing;
end;
$$;
revoke all on function private.mark_notion_invited(uuid) from public, anon;
grant execute on function private.mark_notion_invited(uuid) to authenticated;

create function core.mark_notion_invited(member uuid)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.mark_notion_invited(member) $$;
revoke all on function core.mark_notion_invited(uuid) from public, anon;
grant execute on function core.mark_notion_invited(uuid) to authenticated;
