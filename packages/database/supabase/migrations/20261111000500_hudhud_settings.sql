-- Hudhud (decisions §6, §18): a group's settings are kept in the Diwan
-- (Media → Channels), never typed as commands in the chat; the people who
-- stay in the members' group without an account (Student Life's staff,
-- the Faculty Advisor) are a list in the Diwan too.

-- Officers with settings.manage read and change connected groups.
create policy "Officers read the connected groups" on core.telegram_groups
  for select to authenticated
  using ((select private.has_permission('settings.manage')));
create policy "Officers change the connected groups" on core.telegram_groups
  for update to authenticated
  using ((select private.has_permission('settings.manage')))
  with check ((select private.has_permission('settings.manage')));

grant select (chat_id, title, lang, topics, audience, registered_at) on core.telegram_groups to authenticated;
grant update (lang, topics, audience) on core.telegram_groups to authenticated;

-- The exempt list: kept by Membership.
create table core.telegram_exempt (
  telegram_id bigint primary key check (telegram_id > 0),
  label text not null check (char_length(btrim(label)) between 1 and 120),
  added_by uuid references auth.users (id) on delete set null default auth.uid(),
  added_at timestamptz not null default now()
);

create index telegram_exempt_added_by_idx on core.telegram_exempt (added_by);

comment on table core.telegram_exempt is
  'Telegram accounts that stay in the members'' group without a member''s account (Student Life''s staff, the Faculty Advisor), kept by Membership in the Diwan (decisions §6).';

alter table core.telegram_exempt enable row level security;

create policy "No third-party apps" on core.telegram_exempt
  as restrictive for all to authenticated, anon
  using ((select private.client_allows('core')))
  with check ((select private.client_allows('core')));
create policy "Membership reads the exempt list" on core.telegram_exempt
  for select to authenticated
  using ((select private.has_permission('members.manage')));
create policy "Membership adds to the exempt list" on core.telegram_exempt
  for insert to authenticated
  with check ((select private.has_permission('members.manage')));
create policy "Membership removes from the exempt list" on core.telegram_exempt
  for delete to authenticated
  using ((select private.has_permission('members.manage')));

grant select, insert, delete on core.telegram_exempt to authenticated;
grant all on core.telegram_exempt to service_role;

-- Group posts are in English with a button to the Arabic page (decisions
-- §6): the language setting now only says which language Hudhud answers in.
update core.telegram_groups set lang = 'en' where lang = 'both' and audience = 'members';
