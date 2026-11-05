-- Games come from the editors only, and the paper's games are daily
-- (owner, Nov 5, 2026).
--
-- * Members no longer send games: a submission or a draft in the Games
--   section is refused (journal.desk_of() says 'games').
-- * What the editors had published is removed: every published puzzle and
--   every Games piece. Drafts of the kinds that stay are kept.
-- * The kinds are revised. A Games kind stays only when the site can make a
--   new one every day from its own word lists: the crossword and the
--   anagram (beside the daily word and word search, which were daily
--   already). The quiz, the word ladder, riddles and name the book need
--   fresh writing every day (or a whole dictionary, for ladders), so they
--   are retired: refused as types and as puzzles.
-- * Members' Games drafts are removed, since they can no longer be sent.

create function private.games_by_editors()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if journal.desk_of(new.category) = 'games' then
    raise exception 'games_by_editors' using errcode = '22023';
  end if;
  return new;
end;
$$;
revoke all on function private.games_by_editors() from public, anon, authenticated;

create trigger games_by_editors
  before insert or update of category on journal.submissions
  for each row execute function private.games_by_editors();
create trigger games_by_editors
  before insert or update of category on journal.submission_drafts
  for each row execute function private.games_by_editors();

delete from journal.submission_drafts
where journal.desk_of(category) = 'games';

-- The editors' published games, removed entirely.
delete from journal.puzzles where status = 'published';
delete from journal.puzzles where kind not in ('crossword', 'word_search', 'anagram');
delete from journal.pieces where desk = 'games';

alter table journal.puzzles
  drop constraint puzzles_kind_check,
  add constraint puzzles_kind_check check (kind in ('crossword', 'word_search', 'anagram'));

-- The current types: the Games section keeps the crossword and the anagram.
create or replace function journal.is_current_category(category journal.category)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select category in (
    'report', 'feature', 'interview', 'profile', 'event_coverage', 'explainer',
    'review', 'column', 'opinion_essay', 'letter_to_editor', 'debate', 'recommendations',
    'poetry', 'fiction', 'creative_nonfiction', 'drama', 'translation', 'six_words',
    'art', 'photography', 'illustration', 'comic', 'calligraphy', 'photo_essay',
    'next_stop_episode', 'reel', 'short_film', 'video_report', 'recorded_performance', 'animation',
    'crossword', 'anagram'
  );
$$;
