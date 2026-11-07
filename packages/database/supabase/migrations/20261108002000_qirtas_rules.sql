-- Qirtas (decisions §5, §11; the audit's C7).
--
-- 1. The Mutanabbi Prize: a winner chooses whether to be named, and
--    editors, the judge and Council members recuse themselves from
--    anything they are connected to (a recusal list the site enforces).
-- 2. Retired: calls for the Edition (Write for Qirtas is one door, any
--    time; the Edition draws from published work) and hand-made puzzles
--    (the games are generated daily and checked by the editors in a
--    queue, journal.game_checks).

-- ── 1. The Prize ─────────────────────────────────────────────────────────────

alter table journal.prize_entries add column winner_named boolean not null default false;
comment on column journal.prize_entries.winner_named is
  'The winner chose to be named (decisions §5): the results then show their name instead of the published byline (a pen name or Anonymous).';

create table journal.prize_recusals (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references journal.prize_entries (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  reason text check (char_length(reason) <= 300),
  created_at timestamptz not null default now(),
  unique (entry_id, user_id)
);
create index prize_recusals_user_id_idx on journal.prize_recusals (user_id);
comment on table journal.prize_recusals is
  'Who stepped aside from which shortlisted work (decisions §5): they neither score it nor vote for it.';
alter table journal.prize_recusals enable row level security;
create policy "No third-party apps" on journal.prize_recusals
  as restrictive for all to authenticated
  using ((select private.client_allows('journal')))
  with check ((select private.client_allows('journal')));
create policy "The Prize's officers and the person read recusals" on journal.prize_recusals
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.has_permission('journal.prize')));
create policy "People recuse themselves" on journal.prize_recusals
  for insert to authenticated
  with check (user_id = (select auth.uid()));
grant select, insert on journal.prize_recusals to authenticated;
grant all on journal.prize_recusals to service_role;

-- A recused officer doesn't score the work.
create function private.prize_score_not_recused()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.judge_score is distinct from old.judge_score and exists (
    select 1 from journal.prize_recusals x
    where x.entry_id = new.id and x.user_id = (select auth.uid())
  ) then
    raise exception 'recused' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function private.prize_score_not_recused() from public, anon, authenticated;
create trigger prize_score_not_recused before update of judge_score on journal.prize_entries
  for each row execute function private.prize_score_not_recused();

-- …nor votes for it.
CREATE OR REPLACE FUNCTION private.cast_prize_vote(entry_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
  if exists (
    select 1 from journal.prize_recusals x
    where x.entry_id = e.id and x.user_id = (select auth.uid())
  ) then
    raise exception 'recused' using errcode = '42501';
  end if;
  insert into journal.prize_vote_receipts (round_id, category, user_id)
  values (r.id, e.category, (select auth.uid()));
  insert into journal.prize_votes (entry_id) values (e.id);
exception
  when unique_violation then
    raise exception 'You have already voted in this category' using errcode = '23505';
end;
$function$;

-- The results show the published byline unless the winner chose a name.
CREATE OR REPLACE FUNCTION private.prize_results(round_id uuid)
 RETURNS TABLE(entry_id uuid, category text, title_en text, title_ar text, piece_slug text, desk journal.desk, byline_en text, byline_ar text, judge_score numeric, votes integer, member_score numeric, final_score numeric, rank integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
      -- The byline as published (a name, a pen name or Anonymous), unless
      -- the winner chose to be named (decisions §5).
      case when e.category = 'qirtas' then
        case when e.winner_named then coalesce(pr.full_name_en, c.name_en) else c.name_en end
        else e.qalam_byline end as b_en,
      case when e.category = 'qirtas' then
        case when e.winner_named then coalesce(pr.full_name_ar, pr.full_name_en, c.name_ar) else c.name_ar end
        else e.qalam_byline end as b_ar
    from journal.prize_entries e
    left join journal.pieces p on p.id = e.piece_id
    left join journal.contributors c on c.id = p.contributor_id
    left join core.profiles pr on pr.id = c.user_id
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
$function$;

-- ── 2. Calls for the Edition: retired ────────────────────────────────────────
-- Write for Qirtas is one door, any time: the standing call (no Edition)
-- is the only call. The Edition calls go (none has a submission), and no
-- other call is made.

update journal.submissions s set call_id = (select c.id from journal.calls c where c.issue_id is null)
where s.call_id in (select c.id from journal.calls c where c.issue_id is not null);
update journal.blind_entries b set call_id = (select c.id from journal.calls c where c.issue_id is null)
where b.call_id in (select c.id from journal.calls c where c.issue_id is not null);
delete from journal.calls where issue_id is not null;
drop policy "Journal managers manage calls (insert)" on journal.calls;
comment on table journal.calls is
  'The standing call only (decisions §5): Write for Qirtas is one door, any time; Edition calls are retired.';

-- ── 2. Hand-made puzzles: retired ────────────────────────────────────────────

drop table journal.puzzles;

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
    'journal.prize_rounds',
    'programmes.productions',
    'programmes.episodes',
    'governance.partners',
    'governance.partner_agreements',
    'governance.elections',
    'governance.society_documents'
  ]
$$;

-- The editors' check queue for the generated games: each day's games, in
-- each language, are marked checked (or flagged with a note) before they
-- come up.
create table journal.game_checks (
  game_day integer not null check (game_day > 0),
  lang text not null check (lang in ('en', 'ar')),
  checked_by uuid default auth.uid() references auth.users (id) on delete set null,
  checked_at timestamptz not null default now(),
  flagged boolean not null default false,
  note text check (char_length(note) <= 500),
  primary key (game_day, lang)
);
create index game_checks_checked_by_idx on journal.game_checks (checked_by);
comment on table journal.game_checks is
  'The editors'' check of each day''s generated games (decisions §5): checked, or flagged with a note.';
alter table journal.game_checks enable row level security;
create policy "No third-party apps" on journal.game_checks
  as restrictive for all to authenticated
  using ((select private.client_allows('journal')))
  with check ((select private.client_allows('journal')));
create policy "Games editors read the queue" on journal.game_checks
  for select to authenticated
  using ((select private.has_permission('journal.edit.games')));
create policy "Games editors check games" on journal.game_checks
  for insert to authenticated
  with check ((select private.has_permission('journal.edit.games')) and checked_by = (select auth.uid()));
create policy "Games editors change a check" on journal.game_checks
  for update to authenticated
  using ((select private.has_permission('journal.edit.games')))
  with check ((select private.has_permission('journal.edit.games')) and checked_by = (select auth.uid()));
grant select, insert, update on journal.game_checks to authenticated;
grant all on journal.game_checks to service_role;

-- The Editions page before the first one is published: Editions not yet
-- out that have a launch on the calendar (their ids only; the launch is
-- read through journal.edition_launch).
create function private.coming_editions()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select i.id from journal.issues i
  where i.status <> 'published' and i.launch_event_id is not null
  order by i.volume, i.number;
$$;
revoke all on function private.coming_editions() from public;
grant execute on function private.coming_editions() to anon, authenticated;

create function journal.coming_editions()
returns setof uuid
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.coming_editions() $$;
revoke all on function journal.coming_editions() from public;
grant execute on function journal.coming_editions() to anon, authenticated;
