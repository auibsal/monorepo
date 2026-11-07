-- Qirtas and the Mutanabbi Prize, continued (owner, Nov 7, 2026): the new
-- type values added in 20261107000500 are usable from here.

create or replace function journal.desk_of(category journal.category)
returns journal.desk
language sql
immutable
set search_path = ''
as $$
  select case
    when category in ('report', 'feature', 'interview', 'profile', 'event_coverage', 'explainer', 'news_other')
      then 'news'
    when category in ('review', 'column', 'opinion_essay', 'letter_to_editor', 'debate', 'recommendations', 'voices_other')
      then 'voices'
    when category in ('art', 'photography', 'illustration', 'comic', 'calligraphy', 'photo_essay', 'gallery_other')
      then 'gallery'
    when category in ('short_film', 'video_report', 'recorded_performance', 'animation', 'reel', 'next_stop_episode', 'video_other')
      then 'video'
    when category in ('word', 'word_search', 'crossword', 'anagram', 'quiz', 'word_ladder', 'riddle', 'name_the_book')
      then 'games'
    else 'letters'
  end::journal.desk;
$$;

-- Every type is current except the retired ones (prose, Six Words, Next
-- Stop's episodes and reels, and the retired games).
create or replace function journal.is_current_category(category journal.category)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select category not in (
    'prose', 'six_words', 'next_stop_episode', 'reel', 'quiz', 'word_ladder', 'riddle', 'name_the_book'
  );
$$;

alter table journal.pieces
  add column type_en text check (char_length(type_en) <= 60),
  add column type_ar text check (char_length(type_ar) <= 60);
alter table journal.submissions
  add column type_label text check (char_length(type_label) <= 60);

comment on column journal.pieces.type_en is
  'The piece''s own type, when its section''s list doesn''t name it (types are flexible, owner, Nov 7, 2026).';

-- 2. Anonymous bylines (decisions §5): the Editor-in-Chief knows the
-- writer; the identity stays confidential (clients never read
-- contributors.user_id). An anonymous byline has no author page.
alter table journal.contributors
  add column is_anonymous boolean not null default false;
alter table journal.submissions
  add column anonymous boolean not null default false,
  add constraint submissions_one_byline check (not (anonymous and pen_name is not null));
grant insert (anonymous, type_label) on journal.submissions to authenticated;

comment on column journal.submissions.anonymous is
  'Published as "Anonymous" (owner, Nov 7, 2026). The Editor-in-Chief knows the writer.';

create or replace function private.make_piece(submission_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  sub journal.submissions;
  author core.profiles;
  contributor uuid;
  piece uuid;
  display_en text;
  display_ar text;
  base_slug text;
  candidate text;
  n integer := 1;
  blind text;
begin
  select * into sub from journal.submissions where id = make_piece.submission_id;
  select p.id into piece from journal.pieces p where p.submission_id = sub.id;
  if found then
    return piece;
  end if;

  select * into author from core.profiles where id = sub.author_id;
  if sub.anonymous then
    display_en := 'Anonymous';
    display_ar := 'مجهول';
  elsif sub.pen_name is not null then
    display_en := btrim(sub.pen_name);
    display_ar := btrim(sub.pen_name);
  else
    display_en := coalesce(nullif(btrim(author.full_name_en), ''), 'Contributor');
    display_ar := author.full_name_ar;
  end if;

  select c.id into contributor from journal.contributors c
  where c.user_id = sub.author_id
    and c.is_anonymous = sub.anonymous
    and c.is_pen_name = (sub.pen_name is not null or sub.anonymous)
    and (sub.pen_name is null or sub.anonymous or c.name_en = display_en)
  order by c.created_at
  limit 1;

  if contributor is null then
    base_slug := coalesce(
      nullif(trim(both '-' from regexp_replace(lower(display_en), '[^a-z0-9]+', '-', 'g')), ''),
      'contributor'
    );
    candidate := base_slug;
    while exists (select 1 from journal.contributors c where c.slug = candidate) loop
      n := n + 1;
      candidate := base_slug || '-' || n;
    end loop;
    insert into journal.contributors (slug, user_id, name_en, name_ar, is_pen_name, is_anonymous)
    values (candidate, sub.author_id, display_en, display_ar,
      sub.pen_name is not null or sub.anonymous, sub.anonymous)
    returning id into contributor;
  end if;

  select b.blind_id into blind from journal.blind_keys k
  join journal.blind_entries b on b.id = k.blind_entry_id
  where k.submission_id = sub.id;

  base_slug := left(coalesce(
    nullif(trim(both '-' from regexp_replace(lower(sub.title), '[^a-z0-9]+', '-', 'g')), ''),
    lower(replace(coalesce(blind, 'piece'), 'W-', 'piece-'))
  ), 70);
  candidate := base_slug;
  n := 1;
  while exists (select 1 from journal.pieces p where p.slug = candidate) loop
    n := n + 1;
    candidate := base_slug || '-' || n;
  end loop;

  insert into journal.pieces
    (issue_id, contributor_id, submission_id, slug, category, language, title_en, title_ar,
     deck_en, deck_ar, video_url, status)
  values (
    private.call_issue(sub.call_id), contributor, sub.id, candidate, sub.category, sub.language,
    case when sub.language = 'ar' then null else sub.title end,
    case when sub.language = 'ar' then sub.title end,
    case when sub.language = 'ar' then null else sub.deck end,
    case when sub.language = 'ar' then sub.deck end,
    sub.video_url,
    'editing'
  )
  returning id into piece;

  insert into journal.piece_bodies (piece_id, body_en, body_ar)
  values (
    piece,
    case when sub.language = 'ar' then null else sub.body_html end,
    case when sub.language = 'ar' then sub.body_html end
  );

  return piece;
end;
$function$;

-- 3. Next Stop is the Director of Media's show (decisions §1): the
-- producer and the host are the Director of Media's team, and Media keeps
-- the episodes (YouTube embeds).
insert into access.roles (key, name_en, name_ar, is_council, sort) values
  ('next_stop_producer', 'Next Stop Producer', 'منتج «المحطة القادمة»', false, 154),
  ('next_stop_host', 'Next Stop Host', 'مقدّم «المحطة القادمة»', false, 155);

update access.roles set hiring_owner = 'media' where key in ('next_stop_producer', 'next_stop_host');

insert into access.role_permissions (role, permission) values
  ('next_stop_producer', 'content.manage'),
  ('next_stop_producer', 'library.read'),
  ('next_stop_host', 'library.read');

update programmes.openings
set owner = 'media', role = 'next_stop_producer'
where title_en = 'Producer, Next Stop';

create or replace function private.next_stop_team()
returns table (full_name_en text, full_name_ar text, title_en text, title_ar text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.full_name_en, p.full_name_ar,
    coalesce(a.title_en, r.name_en), coalesce(a.title_ar, r.name_ar)
  from access.role_assignments a
  join access.roles r on r.key = a.role
  join core.profiles p on p.id = a.user_id
  where a.role in ('media_director', 'next_stop_producer', 'next_stop_host')
    and a.scope_type = 'global'
    and a.starts_at <= now()
    and (a.ends_at is null or a.ends_at > now())
  order by r.sort, p.full_name_en;
$$;

drop policy "Programme managers manage episodes (update)" on programmes.episodes;
drop policy "Programme managers manage episodes (delete)" on programmes.episodes;
drop policy "Programme managers manage episodes (insert)" on programmes.episodes;
drop policy "Select by authenticated" on programmes.episodes;

create policy "Select by authenticated" on programmes.episodes
  for select to authenticated
  using (
    (published_at is not null and published_at <= now())
    or (select private.has_permission('content.manage'))
  );
create policy "Media manages episodes (insert)" on programmes.episodes
  for insert to authenticated
  with check ((select private.has_permission('content.manage')));
create policy "Media manages episodes (update)" on programmes.episodes
  for update to authenticated
  using ((select private.has_permission('content.manage')))
  with check ((select private.has_permission('content.manage')));
create policy "Media manages episodes (delete)" on programmes.episodes
  for delete to authenticated
  using ((select private.has_permission('content.manage')));

-- 4. Unpublished submissions: deleted twelve months after the decision
-- (decisions §6). The API's cron removes the files from storage, then
-- deletes the records.
create function private.expired_submissions()
returns table (submission_id uuid, paths text[])
language sql
stable
security definer
set search_path = ''
as $$
  select s.id, coalesce(array_agg(f.storage_path) filter (where f.id is not null), '{}')
  from journal.submissions s
  left join journal.submission_files f on f.submission_id = s.id
  where s.status in ('declined', 'withdrawn')
    and not exists (select 1 from journal.pieces p where p.submission_id = s.id)
    and coalesce(
      (select max(d.decided_at) from journal.decisions d where d.submission_id = s.id),
      s.updated_at
    ) < now() - interval '12 months'
  group by s.id;
$$;

revoke all on function private.expired_submissions() from public, anon, authenticated;
grant execute on function private.expired_submissions() to service_role;

create function private.delete_submissions(ids uuid[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  delete from journal.submissions s
  where s.id = any (ids)
    and s.id in (select e.submission_id from private.expired_submissions() e);
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function private.delete_submissions(uuid[]) from public, anon, authenticated;
grant execute on function private.delete_submissions(uuid[]) to service_role;

-- The daily job (the server, with the secret key) lists what is due, removes
-- the files from storage, then the rows.
create function journal.expired_submissions()
returns table (submission_id uuid, paths text[])
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.expired_submissions() $$;

revoke all on function journal.expired_submissions() from public, anon, authenticated;
grant execute on function journal.expired_submissions() to service_role;

create function journal.delete_submissions(ids uuid[])
returns integer
language sql
security invoker
set search_path = ''
as $$ select private.delete_submissions(ids) $$;

revoke all on function journal.delete_submissions(uuid[]) from public, anon, authenticated;
grant execute on function journal.delete_submissions(uuid[]) to service_role;

-- 5. The Mutanabbi Prize (decisions §5): one prize, two categories, Qirtas
-- (the year's best work published in Qirtas by a student Member) and Qalam
-- (the year's best work by a Qalam student). Given at the Annual Meeting
-- each April from 2028, for the year to March 31.
--
-- One standard scoring for both categories: editors draw up a shortlist;
-- one outside judge scores each shortlisted work out of 100, reading
-- blind; voting members vote online for one work in each category
-- (Qalam students' names hidden; members only). Each work's vote share is
-- scaled so the most-voted work scores 100. Final score = 70% judge + 30%
-- members; a tie goes to the judge's score. The Editor-in-Chief and the
-- General Secretary check the count.
create table journal.prize_rounds (
  id uuid primary key default gen_random_uuid(),
  year integer not null unique check (year >= 2028),
  period_from date not null,
  period_to date not null,
  vote_opens_at timestamptz,
  vote_closes_at timestamptz,
  awarded_on date,
  results_published boolean not null default false,
  count_checked_by_eic uuid references auth.users (id) on delete set null,
  count_checked_by_gs uuid references auth.users (id) on delete set null,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (period_to > period_from),
  check (vote_closes_at is null or vote_closes_at > vote_opens_at)
);

create index prize_rounds_created_by_idx on journal.prize_rounds (created_by);
create index prize_rounds_count_checked_by_eic_idx on journal.prize_rounds (count_checked_by_eic);
create index prize_rounds_count_checked_by_gs_idx on journal.prize_rounds (count_checked_by_gs);

create table journal.prize_entries (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references journal.prize_rounds (id) on delete cascade,
  category text not null check (category in ('qirtas', 'qalam')),
  piece_id uuid references journal.pieces (id) on delete cascade,
  qalam_title text check (char_length(qalam_title) <= 300),
  qalam_byline text check (char_length(qalam_byline) <= 200),
  judge_score numeric(5, 2) check (judge_score between 0 and 100),
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  check ((category = 'qirtas') = (piece_id is not null)),
  check (category = 'qirtas' or qalam_title is not null),
  unique (round_id, piece_id)
);

create index prize_entries_round_id_idx on journal.prize_entries (round_id, category);
create index prize_entries_piece_id_idx on journal.prize_entries (piece_id);
create index prize_entries_created_by_idx on journal.prize_entries (created_by);

comment on table journal.prize_entries is
  'The shortlist of the Mutanabbi Prize, by category. qalam_byline is the student''s first name, last initial and school; it is hidden in the members'' vote. judge_score is the outside judge''s score out of 100, entered from the score sheet.';

-- A secret ballot: who voted, and the votes, kept apart.
create table journal.prize_vote_receipts (
  round_id uuid not null references journal.prize_rounds (id) on delete cascade,
  category text not null check (category in ('qirtas', 'qalam')),
  user_id uuid not null references auth.users (id) on delete cascade,
  voted_at timestamptz not null default now(),
  primary key (round_id, category, user_id)
);

create index prize_vote_receipts_user_id_idx on journal.prize_vote_receipts (user_id);

create table journal.prize_votes (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references journal.prize_entries (id) on delete cascade
);

create index prize_votes_entry_id_idx on journal.prize_votes (entry_id);

alter table journal.prize_rounds enable row level security;
alter table journal.prize_entries enable row level security;
alter table journal.prize_vote_receipts enable row level security;
alter table journal.prize_votes enable row level security;

create policy "No third-party apps" on journal.prize_rounds
  as restrictive for all to authenticated, anon
  using ((select private.client_allows('journal')))
  with check ((select private.client_allows('journal')));
create policy "No third-party apps" on journal.prize_entries
  as restrictive for all to authenticated, anon
  using ((select private.client_allows('journal')))
  with check ((select private.client_allows('journal')));
create policy "No third-party apps" on journal.prize_vote_receipts
  as restrictive for all to authenticated, anon
  using ((select private.client_allows('journal')))
  with check ((select private.client_allows('journal')));
create policy "No third-party apps" on journal.prize_votes
  as restrictive for all to authenticated, anon
  using ((select private.client_allows('journal')))
  with check ((select private.client_allows('journal')));

create policy "Prize officers read rounds" on journal.prize_rounds
  for select to authenticated
  using ((select private.has_permission('journal.prize')) or results_published);
create policy "Anyone reads published rounds" on journal.prize_rounds
  for select to anon
  using (results_published);
create policy "Prize officers add rounds" on journal.prize_rounds
  for insert to authenticated
  with check ((select private.has_permission('journal.prize')));
create policy "Prize officers edit rounds" on journal.prize_rounds
  for update to authenticated
  using ((select private.has_permission('journal.prize')))
  with check ((select private.has_permission('journal.prize')));
create policy "Prize officers remove rounds" on journal.prize_rounds
  for delete to authenticated
  using ((select private.has_permission('journal.prize')));

create policy "Prize officers read the shortlist" on journal.prize_entries
  for select to authenticated
  using ((select private.has_permission('journal.prize')));
create policy "Prize officers shortlist" on journal.prize_entries
  for insert to authenticated
  with check ((select private.has_permission('journal.prize')));
create policy "Prize officers score" on journal.prize_entries
  for update to authenticated
  using ((select private.has_permission('journal.prize')))
  with check ((select private.has_permission('journal.prize')));
create policy "Prize officers take works off" on journal.prize_entries
  for delete to authenticated
  using ((select private.has_permission('journal.prize')));

create policy "Voters read their own receipts" on journal.prize_vote_receipts
  for select to authenticated
  using (user_id = (select auth.uid()));

create trigger set_updated_at before update on journal.prize_rounds
  for each row execute function private.set_updated_at();

-- Eligibility (decisions §5): the Qirtas category is for student Members
-- only, for work published in Qirtas in the round's year (April 1 to March
-- 31; the first round covers the site's launch to March 31, 2028).
-- Anonymous or pen-name pieces are eligible when the Editor-in-Chief
-- knows the writer (the byline belongs to a member's account).
create function private.prize_entry_valid()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  r journal.prize_rounds;
begin
  select * into r from journal.prize_rounds where id = new.round_id;
  if new.category = 'qirtas' and not exists (
    select 1 from journal.pieces p
    join journal.contributors c on c.id = p.contributor_id
    join membership.memberships m on m.user_id = c.user_id
    where p.id = new.piece_id
      and p.status = 'published'
      and (p.published_at at time zone 'Asia/Baghdad')::date between r.period_from and r.period_to
      and m.tier = 'member'
  ) then
    raise exception 'not_eligible' using errcode = '23514';
  end if;
  if r.vote_opens_at is not null and r.vote_opens_at <= now() and tg_op = 'INSERT' then
    raise exception 'shortlist_closed' using errcode = '22023';
  end if;
  return new;
end;
$$;

revoke all on function private.prize_entry_valid() from public, anon, authenticated;

create trigger prize_entry_valid
  before insert or update of piece_id, category, round_id on journal.prize_entries
  for each row execute function private.prize_entry_valid();

-- The round whose members' vote is open now, if any: voting members find
-- their ballot with it (rounds are read only by the Prize's officers until
-- the results are published).
create function private.open_prize_round()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select r.id from journal.prize_rounds r
  where r.vote_opens_at <= now() and now() < r.vote_closes_at
  order by r.year desc
  limit 1;
$$;
revoke all on function private.open_prize_round() from public, anon;
grant execute on function private.open_prize_round() to authenticated;

create function journal.open_prize_round()
returns uuid
language sql
stable
security invoker
set search_path = ''
as $$ select private.open_prize_round() $$;
revoke all on function journal.open_prize_round() from public, anon;
grant execute on function journal.open_prize_round() to authenticated;

-- The members' ballot: the shortlist in each category, Qalam students'
-- names hidden.
create function private.prize_ballot(round_id uuid)
returns table (entry_id uuid, category text, title_en text, title_ar text, piece_slug text, desk journal.desk, byline_en text, byline_ar text, voted boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  r journal.prize_rounds;
begin
  select * into r from journal.prize_rounds where id = prize_ballot.round_id;
  if not found or r.vote_opens_at is null or now() < r.vote_opens_at then
    raise exception 'The vote is not open' using errcode = '22023';
  end if;
  if not private.is_voting_member((select auth.uid())) then
    raise exception 'Voting members only' using errcode = '42501';
  end if;
  return query
  select e.id, e.category,
    coalesce(p.title_en, e.qalam_title), coalesce(p.title_ar, e.qalam_title),
    p.slug, journal.desk_of(p.category),
    case when e.category = 'qirtas' then c.name_en end,
    case when e.category = 'qirtas' then c.name_ar end,
    exists (
      select 1 from journal.prize_vote_receipts v
      where v.round_id = r.id and v.category = e.category and v.user_id = (select auth.uid())
    )
  from journal.prize_entries e
  left join journal.pieces p on p.id = e.piece_id
  left join journal.contributors c on c.id = p.contributor_id
  where e.round_id = r.id
  order by e.category, coalesce(p.title_en, e.qalam_title);
end;
$$;

revoke all on function private.prize_ballot(uuid) from public, anon;
grant execute on function private.prize_ballot(uuid) to authenticated;

create function journal.prize_ballot(round_id uuid)
returns table (entry_id uuid, category text, title_en text, title_ar text, piece_slug text, desk journal.desk, byline_en text, byline_ar text, voted boolean)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.prize_ballot(round_id) $$;

revoke all on function journal.prize_ballot(uuid) from public, anon;
grant execute on function journal.prize_ballot(uuid) to authenticated;

create function private.cast_prize_vote(entry_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  e journal.prize_entries;
  r journal.prize_rounds;
begin
  select * into e from journal.prize_entries where id = cast_prize_vote.entry_id;
  select * into r from journal.prize_rounds where id = e.round_id;
  if not found or r.vote_opens_at is null or now() not between r.vote_opens_at and r.vote_closes_at then
    raise exception 'The vote is not open' using errcode = '22023';
  end if;
  if not private.is_voting_member((select auth.uid())) then
    raise exception 'Voting members only' using errcode = '42501';
  end if;
  insert into journal.prize_vote_receipts (round_id, category, user_id)
  values (r.id, e.category, (select auth.uid()));
  insert into journal.prize_votes (entry_id) values (e.id);
exception
  when unique_violation then
    raise exception 'You have already voted in this category' using errcode = '23505';
end;
$$;

revoke all on function private.cast_prize_vote(uuid) from public, anon;
grant execute on function private.cast_prize_vote(uuid) to authenticated;

create function journal.cast_prize_vote(entry_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.cast_prize_vote(entry_id) $$;

revoke all on function journal.cast_prize_vote(uuid) from public, anon;
grant execute on function journal.cast_prize_vote(uuid) to authenticated;

-- The count: judge's score, votes, the members' score scaled so the
-- most-voted work scores 100, and the final score (70% judge, 30%
-- members); ranked with ties going to the judge's score. The Prize's
-- officers see it once the vote closes; everyone, once the results are
-- published on the award day.
create function private.prize_results(round_id uuid)
returns table (
  entry_id uuid, category text, title_en text, title_ar text, piece_slug text, desk journal.desk,
  byline_en text, byline_ar text, judge_score numeric, votes integer, member_score numeric,
  final_score numeric, rank integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  r journal.prize_rounds;
  officer boolean := private.has_permission('journal.prize') or private.has_permission('governance.manage');
begin
  select * into r from journal.prize_rounds where id = prize_results.round_id;
  if not found then
    raise exception 'Round not found' using errcode = 'P0002';
  end if;
  if not (
    (officer and r.vote_closes_at is not null and now() > r.vote_closes_at)
    or (r.results_published and r.awarded_on is not null and private.today() >= r.awarded_on)
  ) then
    raise exception 'The results show once the vote has closed' using errcode = '42501';
  end if;
  return query
  with tallied as (
    select e.id, e.category, e.judge_score,
      (select count(*)::integer from journal.prize_votes v where v.entry_id = e.id) as n,
      coalesce(p.title_en, e.qalam_title) as t_en, coalesce(p.title_ar, e.qalam_title) as t_ar,
      p.slug, journal.desk_of(p.category) as d,
      case when e.category = 'qirtas' then c.name_en else e.qalam_byline end as b_en,
      case when e.category = 'qirtas' then c.name_ar else e.qalam_byline end as b_ar
    from journal.prize_entries e
    left join journal.pieces p on p.id = e.piece_id
    left join journal.contributors c on c.id = p.contributor_id
    where e.round_id = r.id
  ),
  scaled as (
    select t.*,
      case when max(t.n) over (partition by t.category) > 0
        then round(t.n * 100.0 / max(t.n) over (partition by t.category), 2)
        else 0 end as m
    from tallied t
  ),
  scored as (
    select s.*, round(0.7 * coalesce(s.judge_score, 0) + 0.3 * s.m, 2) as f from scaled s
  )
  select s.id, s.category, s.t_en, s.t_ar, s.slug, s.d, s.b_en, s.b_ar,
    s.judge_score, s.n, s.m, s.f,
    (rank() over (partition by s.category order by s.f desc, s.judge_score desc nulls last))::integer
  from scored s
  order by s.category, 13, s.t_en;
end;
$$;

revoke all on function private.prize_results(uuid) from public;
grant execute on function private.prize_results(uuid) to anon, authenticated;

create function journal.prize_results(round_id uuid)
returns table (
  entry_id uuid, category text, title_en text, title_ar text, piece_slug text, desk journal.desk,
  byline_en text, byline_ar text, judge_score numeric, votes integer, member_score numeric,
  final_score numeric, rank integer
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.prize_results(round_id) $$;

revoke all on function journal.prize_results(uuid) from public;
grant execute on function journal.prize_results(uuid) to anon, authenticated;

-- Checking the count: the Editor-in-Chief and the General Secretary each
-- record that they checked it; results publish only after both.
create function private.check_prize_count(round_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if access.has_permission('journal.prize') and exists (
    select 1 from access.role_assignments a
    where a.user_id = (select auth.uid()) and a.role = 'eic'
      and a.starts_at <= now() and (a.ends_at is null or a.ends_at > now())
  ) then
    update journal.prize_rounds set count_checked_by_eic = (select auth.uid()) where id = check_prize_count.round_id;
  elsif exists (
    select 1 from access.role_assignments a
    where a.user_id = (select auth.uid()) and a.role = 'general_secretary'
      and a.starts_at <= now() and (a.ends_at is null or a.ends_at > now())
  ) then
    update journal.prize_rounds set count_checked_by_gs = (select auth.uid()) where id = check_prize_count.round_id;
  else
    raise exception 'The Editor-in-Chief and the General Secretary check the count' using errcode = '42501';
  end if;
end;
$$;

revoke all on function private.check_prize_count(uuid) from public, anon;
grant execute on function private.check_prize_count(uuid) to authenticated;

create function journal.check_prize_count(round_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $$ select private.check_prize_count(round_id) $$;

revoke all on function journal.check_prize_count(uuid) from public, anon;
grant execute on function journal.check_prize_count(uuid) to authenticated;

create function private.prize_publish_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.results_published and not old.results_published
    and (new.count_checked_by_eic is null or new.count_checked_by_gs is null) then
    raise exception 'count_not_checked' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function private.prize_publish_guard() from public, anon, authenticated;

create trigger prize_publish_guard
  before update on journal.prize_rounds
  for each row execute function private.prize_publish_guard();

create or replace function private.history_tables()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array[
    'events.events',
    'journal.pieces',
    'journal.issues',
    'journal.calls',
    'journal.puzzles',
    'journal.prize_rounds',
    'programmes.productions',
    'programmes.episodes',
    'governance.partners',
    'governance.partner_agreements',
    'governance.elections',
    'governance.society_documents'
  ]
$$;

-- An Anonymous byline never shows its writer's Tour pages either.
create or replace function private.profile_six_words(author_slug text)
returns table (id uuid, text text, language text, tour text, created_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select w.id, w.text, w.language, w.tour, w.created_at
  from programmes.six_words w
  join journal.contributors c
    on c.user_id = w.user_id and not c.is_pen_name and not c.is_anonymous
  where c.slug = profile_six_words.author_slug
    and w.visibility in ('profile', 'tour') and w.publishable
  order by w.created_at;
$$;

-- Table privileges for the Prize (RLS decides the rows): rounds and the
-- shortlist are kept by the Prize's officers; the count checks are set only
-- by check_prize_count(); votes and receipts are written only by
-- cast_prize_vote().
revoke all on journal.prize_rounds, journal.prize_entries, journal.prize_vote_receipts, journal.prize_votes
  from anon, authenticated;
grant select on journal.prize_rounds to anon, authenticated;
grant insert (id, year, period_from, period_to, vote_opens_at, vote_closes_at, awarded_on),
  update (period_from, period_to, vote_opens_at, vote_closes_at, awarded_on, results_published),
  delete on journal.prize_rounds to authenticated;
grant select, delete on journal.prize_entries to authenticated;
grant insert (id, round_id, category, piece_id, qalam_title, qalam_byline, judge_score),
  update (judge_score, qalam_title, qalam_byline) on journal.prize_entries to authenticated;
grant select on journal.prize_vote_receipts to authenticated;
grant all on journal.prize_rounds, journal.prize_entries, journal.prize_vote_receipts, journal.prize_votes
  to service_role;
