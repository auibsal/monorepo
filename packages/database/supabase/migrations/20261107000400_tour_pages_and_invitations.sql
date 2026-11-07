-- Six-word pages from the Typewriter Tour, and the one-time invitation to
-- join (owner, Nov 7, 2026; claude/decisions.md §1 and §2).
--
-- Six Words are not part of Qirtas. Each page belongs to its writer's
-- member profile and is private by default; the writer chooses in their
-- account who sees it: private, their profile, or the Tour's page under
-- Join. That choice is the consent record. A writer may have more than
-- one page.
--
-- Spring 2026: the scanned pages are imported once (by the General
-- Secretary, after this migration, never in a migration file: personal
-- data lives only on the site), every one private, each attached to its
-- writer's account when they join with the listed AUIB email. The import's
-- status and tier columns are for editors only. Pages with no email stay
-- private and editors-only; a writer claims one through Help Desk and an
-- editor attaches it by hand; pages still unclaimed after the spring 2027
-- Tour are deleted (setting tour.unclaimed_until, the day after that Tour).

alter table programmes.six_words drop constraint six_words_text_check;
alter table programmes.six_words drop constraint six_words_language_check;
alter table programmes.six_words drop constraint six_words_status_check;

alter table programmes.six_words
  add constraint six_words_text_check check (char_length(btrim(text)) between 1 and 400),
  add constraint six_words_language_check check (language in ('en', 'ar', 'other')),
  add column visibility text not null default 'private'
    check (visibility in ('private', 'profile', 'tour')),
  add column publishable boolean not null default true,
  add column tour text check (char_length(tour) <= 120),
  add column page_ref text unique check (char_length(page_ref) <= 40),
  add column station text check (char_length(station) <= 120),
  add column typed_on text check (char_length(typed_on) <= 120),
  add column writer_name text check (char_length(writer_name) <= 200),
  add column email text check (email = lower(email)),
  add column editor_status text check (char_length(editor_status) <= 60),
  add column editor_tier text check (char_length(editor_tier) <= 10),
  add column claimed_at timestamptz;

-- The old moderation status becomes "publishable": editors may keep a page
-- off every public view (a page not for publication); the writer decides
-- the rest.
update programmes.six_words set publishable = (status <> 'rejected');
update programmes.six_words set visibility = 'tour' where status = 'approved' and user_id is not null;

drop policy "Anyone reads approved six words" on programmes.six_words;
drop policy "Select by authenticated" on programmes.six_words;
drop policy "Members delete their own six words" on programmes.six_words;

drop trigger revalidate on programmes.six_words;
drop trigger log_activity on programmes.six_words;
drop index programmes.six_words_status_idx;
alter table programmes.six_words drop column status;
alter table programmes.six_words drop constraint six_words_user_id_key;
create index six_words_user_id_idx on programmes.six_words (user_id);
create trigger log_activity
  after update of visibility, publishable, user_id on programmes.six_words
  for each row execute function private.log_activity();
create trigger revalidate
  after update of visibility, publishable, user_id on programmes.six_words
  for each statement execute function private.queue_revalidation('programmes');

create index six_words_email_idx on programmes.six_words (email) where user_id is null;

comment on table programmes.six_words is
  'Six-word pages from the Typewriter Tour (owner, Nov 7, 2026): not part of Qirtas. Each belongs to its writer and is private until they choose their profile or the Tour''s page (visibility, the consent record). Editors may mark a page not publishable. writer_name, email, editor_status and editor_tier are for the Tour''s officers only.';
comment on column programmes.six_words.visibility is
  'private (the writer and the Tour''s officers), profile (the writer''s page on the site) or tour (also the Tour''s page under Join). Set only by the writer. Private by default.';

-- The writer reads their own pages; the Tour's officers read every page;
-- the public reads pages shown on a profile or the Tour's page, through
-- six_words_wall() and profile_six_words(), never the table (it holds
-- emails and editors' notes).
create policy "Writers and the Tour's officers read pages" on programmes.six_words
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.runs_the_tour()));

revoke update on programmes.six_words from authenticated;
grant update (visibility) on programmes.six_words to authenticated;

create policy "Writers choose who sees their pages" on programmes.six_words
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Only the writer sets a page's visibility; a page not publishable stays
-- private whatever is asked.
create function private.page_visibility_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- A page kept off the site goes back to private, whoever keeps it off.
  if not new.publishable then
    new.visibility := 'private';
    return new;
  end if;
  if new.visibility is distinct from old.visibility
    and auth.uid() is not null
    and new.user_id is distinct from auth.uid()
  then
    raise exception 'only_the_writer_chooses' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function private.page_visibility_guard() from public, anon, authenticated;

create trigger page_visibility_guard
  before update on programmes.six_words
  for each row execute function private.page_visibility_guard();

-- Recording a page at the Tour or the membership table: the volunteer
-- types or photographs it and attaches it to the writer's account by
-- their live card. Private until the writer chooses.
create or replace function private.record_six_words(words text, language text, card_code text default null, digits text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  writer uuid;
  entry uuid;
begin
  if not private.runs_the_tour() then
    raise exception 'tour.run is required' using errcode = '42501';
  end if;
  if nullif(trim(coalesce(card_code, '')), '') is not null then
    writer := private.live_card_holder(card_code, digits);
  end if;
  insert into programmes.six_words (user_id, text, language, recorded_by, claimed_at)
  values (writer, regexp_replace(trim(words), '\s+', ' ', 'g'), record_six_words.language,
    (select auth.uid()), case when writer is not null then now() end)
  returning id into entry;
  return entry;
end;
$$;

create or replace function private.attach_six_words(entry_id uuid, card_code text, digits text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  writer uuid;
begin
  if not private.runs_the_tour() then
    raise exception 'tour.run is required' using errcode = '42501';
  end if;
  writer := private.live_card_holder(card_code, digits);
  update programmes.six_words w set user_id = writer, claimed_at = now(), visibility = 'private'
  where w.id = attach_six_words.entry_id and w.user_id is null;
  if not found then
    raise exception 'No unclaimed page with this id' using errcode = 'P0002';
  end if;
end;
$$;

-- An editor attaches a page by hand to a member who claimed it through
-- Help Desk.
create function private.attach_page_to_member(entry_id uuid, member_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.runs_the_tour() then
    raise exception 'tour.run is required' using errcode = '42501';
  end if;
  if not private.is_member(attach_page_to_member.member_id) then
    raise exception 'Not a member' using errcode = '22023';
  end if;
  update programmes.six_words w
  set user_id = attach_page_to_member.member_id, claimed_at = now(), visibility = 'private'
  where w.id = attach_page_to_member.entry_id and w.user_id is null;
  if not found then
    raise exception 'No unclaimed page with this id' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function private.attach_page_to_member(uuid, uuid) from public, anon;
grant execute on function private.attach_page_to_member(uuid, uuid) to authenticated;

create function programmes.attach_page_to_member(entry_id uuid, member_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.attach_page_to_member(entry_id, member_id) $$;

revoke all on function programmes.attach_page_to_member(uuid, uuid) from public, anon;
grant execute on function programmes.attach_page_to_member(uuid, uuid) to authenticated;

-- Editors keep a page off public views, or let the writer show it.
create or replace function private.moderate_six_words(entry_id uuid, approve boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.runs_the_tour() then
    raise exception 'tour.run is required' using errcode = '42501';
  end if;
  update programmes.six_words
  set publishable = approve,
      visibility = case when approve then visibility else 'private' end,
      moderated_by = auth.uid(),
      moderated_at = now()
  where id = entry_id;
end;
$$;

-- Joining with the listed AUIB email attaches the writer's pages.
create function private.claim_tour_pages()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  address text;
begin
  if new.verified_at is null or old.verified_at is not null then
    return new;
  end if;
  select lower(u.email) into address from auth.users u where u.id = new.id;
  if address is null then
    return new;
  end if;
  update programmes.six_words w
  set user_id = new.id, claimed_at = now(), visibility = 'private'
  where w.user_id is null and w.email = address;
  update membership.invitations i set joined_at = now()
  where i.email = address and i.joined_at is null;
  return new;
end;
$$;

revoke all on function private.claim_tour_pages() from public, anon, authenticated;

-- The pages shown on the Tour's page: the writer chose the Tour's page and
-- the page is publishable; the writer's name only if the card was signed.
create or replace function private.six_words_wall(max_results integer default 200)
returns table (id uuid, text text, language text, author_en text, author_ar text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select w.id, w.text, w.language,
    case when w.show_name then p.full_name_en end,
    case when w.show_name then p.full_name_ar end,
    w.created_at
  from programmes.six_words w
  join core.profiles p on p.id = w.user_id
  where w.visibility = 'tour' and w.publishable
  order by w.created_at desc
  limit least(greatest(max_results, 1), 500);
$$;

-- A member's pages on their profile: those they chose to show.
-- A person's pages on their author page, by its slug: their own byline only,
-- never a pen name, so no account id reaches the page.
create function private.profile_six_words(author_slug text)
returns table (id uuid, text text, language text, tour text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select w.id, w.text, w.language, w.tour, w.created_at
  from programmes.six_words w
  join journal.contributors c
    on c.user_id = w.user_id and not c.is_pen_name
  where c.slug = profile_six_words.author_slug
    and w.visibility in ('profile', 'tour') and w.publishable
  order by w.created_at;
$$;

revoke all on function private.profile_six_words(text) from public;
grant execute on function private.profile_six_words(text) to anon, authenticated, service_role;

create function programmes.profile_six_words(author_slug text)
returns table (id uuid, text text, language text, tour text, created_at timestamptz)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.profile_six_words(author_slug) $$;

revoke all on function programmes.profile_six_words(text) from public;

-- 2. The one-time invitation to join (decisions §2): the spring 2026 Tour
-- writers and the fall 2026 club fair sign-ups, sent once on launch day
-- from hello@auibsal.org with a stop link, only when the President says
-- go. The list is deleted thirty days after sending.
create table membership.invitations (
  email text primary key check (email = lower(email) and email like '%@auib.edu.iq'),
  first_name text check (char_length(first_name) <= 80),
  kind text not null check (kind in ('tour', 'plain')),
  station text check (char_length(station) <= 200),
  words text check (char_length(words) <= 1000),
  quote_words boolean not null default false,
  pages integer not null default 0 check (pages between 0 and 4),
  source text not null default 'tour_2026' check (source in ('tour_2026', 'club_fair_2026')),
  sent_at timestamptz,
  joined_at timestamptz,
  created_at timestamptz not null default now()
);

alter table membership.invitations enable row level security;

create policy "No third-party apps" on membership.invitations
  as restrictive for all to authenticated, anon
  using ((select private.client_allows('membership')))
  with check ((select private.client_allows('membership')));

create policy "The Director of Membership reads the list" on membership.invitations
  for select to authenticated
  using ((select private.has_permission('members.manage')));

comment on table membership.invitations is
  'The one-time invitation to join (owner, Nov 7, 2026): tour (a spring 2026 Tour writer; words quoted only when quote_words) or plain (no page on record, or a club fair sign-up). Sent once, when the President says go; deleted thirty days after sending.';

create trigger claim_tour_pages
  after update of verified_at on core.profiles
  for each row execute function private.claim_tour_pages();

-- Sending: one outbox email per row, once. Called by the President on the
-- day (governance.manage and roles.assign).
create function private.send_invitations()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer := 0;
  r membership.invitations;
begin
  if not (access.has_permission('roles.assign') and access.has_permission('governance.manage')) then
    raise exception 'The President sends the invitations' using errcode = '42501';
  end if;
  for r in
    select * from membership.invitations i
    where i.sent_at is null
      and not exists (
        select 1 from auth.users u where lower(u.email) = i.email
      )
    for update
  loop
    perform private.enqueue('membership.invitation', jsonb_build_object('email', r.email));
    update membership.invitations set sent_at = now() where email = r.email;
    n := n + 1;
  end loop;
  return n;
end;
$$;

revoke all on function private.send_invitations() from public, anon;
grant execute on function private.send_invitations() to authenticated;

create function membership.send_invitations()
returns integer
language sql
security invoker
set search_path = ''
as $$ select private.send_invitations() $$;

revoke all on function membership.send_invitations() from public, anon;
grant execute on function membership.send_invitations() to authenticated;

-- Retention: the invitation list thirty days after sending; pages still
-- unclaimed after the spring 2027 Tour.
insert into core.settings (key, value)
values ('tour.unclaimed_until', 'null'::jsonb)
on conflict (key) do nothing;

create function private.purge_tour_lists()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer := 0;
  m integer := 0;
  until date := (private.setting('tour.unclaimed_until') #>> '{}')::date;
begin
  delete from membership.invitations
  where sent_at is not null and sent_at < now() - interval '30 days';
  get diagnostics n = row_count;
  if until is not null and private.today() > until then
    delete from programmes.six_words where user_id is null and tour is not null;
    get diagnostics m = row_count;
  end if;
  return n + m;
end;
$$;

revoke all on function private.purge_tour_lists() from public, anon, authenticated;

select cron.schedule('sal-tour-lists', '20 5 * * *', $$ select private.purge_tour_lists() $$);

-- Who may touch the invitation list: the Director of Membership reads it
-- (RLS above); the API routes send, stop and mark it with the secret key.
revoke all on membership.invitations from anon, authenticated;
grant select on membership.invitations to authenticated;
grant all on membership.invitations to service_role;
