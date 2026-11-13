-- Hudhud: role titles in the groups, and joining from the site or the bot
-- (the owner, Nov 12, 2026; admins by Hudhud, the owner, Nov 13, 2026).
--
-- 1. Each connected group keeps a join-request link Hudhud makes itself
--    (createChatInviteLink, "Approve new members"): members (or, for the
--    Diwan group, role holders) with a linked Telegram are let in at once,
--    as before; everyone else waits for the admins.
-- 2. Member tags (decisions.md, Channels and email): everyone holding a
--    role that opens the team's work (access.roles.in_notion), with
--    Telegram linked, carries their seat as their member tag in each group
--    they are in, and the exempt list its label ("Student Life") in the
--    members' group.
-- 3. Admins by Hudhud (the owner, Nov 13, 2026, in place of decisions.md's
--    "Add New Admins: off"): the President, the Vice President, the
--    Secretary and the Director of Media are admins of both groups
--    (decisions.md, Channels and email: "full admins"), and every Council
--    seat is an admin of the Diwan group, with their seat as their title.
--    Hudhud gives every right but Remain Anonymous and Add New Admins, so
--    no admin it makes can make others. When the seat ends Hudhud takes the
--    rights back (it can only change admins it made); admins added by hand
--    are left alone. When the last role ends the tag comes off, and 7 days
--    later the person leaves the Diwan group. core.telegram_titles keeps
--    whom Hudhud tagged or made an admin.

alter table core.telegram_groups
  add column invite_link text check (invite_link is null or invite_link ~ '^https://t\.me/\+');

comment on column core.telegram_groups.invite_link is
  'The join-request link Hudhud made for the group; shown to those it lets in (members, or role holders for the Diwan group).';

create table core.telegram_titles (
  chat_id bigint not null references core.telegram_groups (chat_id) on delete cascade,
  telegram_id bigint not null check (telegram_id > 0),
  title text not null check (char_length(title) between 1 and 16),
  set_at timestamptz not null default now(),
  -- When the last role ended: the tag is off; the Diwan group lets the
  -- person go 7 days later.
  ended_at timestamptz,
  -- Hudhud made them an admin (and so may take it back).
  admin boolean not null default false,
  primary key (chat_id, telegram_id)
);

comment on table core.telegram_titles is
  'Whom Hudhud gave a member tag or made an admin in a group (their seat), and when their last role ended.';

alter table core.telegram_titles enable row level security;

create policy "No third-party apps" on core.telegram_titles
  as restrictive for all to authenticated, anon
  using ((select private.client_allows('core')))
  with check ((select private.client_allows('core')));
create policy "Settings managers read the titles" on core.telegram_titles
  for select to authenticated
  using ((select private.has_permission('settings.manage')));

grant select on core.telegram_titles to authenticated;
grant all on core.telegram_titles to service_role;

-- The linked role holders and the tag each should carry (the bot, with
-- the secret key): the Council seat first, else the earliest role; the
-- assignment's own title (a director's seat), else the role's name.
-- `officer`: an admin of both groups; `council`: an admin of the Diwan group.
create function core.telegram_role_titles()
returns table (telegram_id bigint, title_en text, title_ar text, officer boolean, council boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select
    t.telegram_id,
    (array_agg(coalesce(nullif(btrim(a.title_en), ''), r.name_en)
      order by r.is_council desc, a.starts_at))[1],
    (array_agg(coalesce(nullif(btrim(a.title_ar), ''), r.name_ar)
      order by r.is_council desc, a.starts_at))[1],
    bool_or(r.key in ('president', 'vice_president', 'general_secretary', 'media_director')),
    bool_or(r.is_council)
  from core.telegram_accounts t
  join access.role_assignments a on a.user_id = t.user_id
  join access.roles r on r.key = a.role
  where r.in_notion
    and a.starts_at <= now()
    and (a.ends_at is null or a.ends_at > now())
  group by t.telegram_id
$$;

revoke all on function core.telegram_role_titles() from public, anon, authenticated;
grant execute on function core.telegram_role_titles() to service_role;

-- The groups a person may join, with their links: the members' group for a
-- member, the Diwan group for a role holder. `linked` says whether their
-- Telegram is linked, since Hudhud lets people in by their link.
create function private.telegram_join_links_for(uid uuid)
returns table (audience text, title text, invite_link text, linked boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select g.audience, g.title, g.invite_link,
    exists (select 1 from core.telegram_accounts t where t.user_id = uid)
  from core.telegram_groups g
  where uid is not null
    and g.invite_link is not null
    and (
      (g.audience = 'members' and private.is_member(uid))
      or (g.audience = 'staff' and private.is_staff(uid))
    )
  order by g.audience
$$;

revoke all on function private.telegram_join_links_for(uuid) from public, anon;
grant execute on function private.telegram_join_links_for(uuid) to authenticated, service_role;

-- The signed-in person's own (the site: Settings and Today).
create function core.telegram_join_links()
returns table (audience text, title text, invite_link text, linked boolean)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.telegram_join_links_for((select auth.uid())) $$;

revoke all on function core.telegram_join_links() from public, anon;
grant execute on function core.telegram_join_links() to authenticated;

-- Any member's, for the bot (the secret key only).
create function core.telegram_join_links_for(member uuid)
returns table (audience text, title text, invite_link text, linked boolean)
language sql
stable
security definer
set search_path = ''
as $$ select * from private.telegram_join_links_for(member) $$;

revoke all on function core.telegram_join_links_for(uuid) from public, anon, authenticated;
grant execute on function core.telegram_join_links_for(uuid) to service_role;
