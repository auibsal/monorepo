-- The design review, PR 5c (Nov 4, 2026), A17: the Games section's other
-- types become puzzles the editors write in the Diwan and readers play on
-- auibsal.org/qirtas/games, in English or Arabic: a quiz, a word ladder,
-- riddles, anagrams and name the book. Each kind's `data` is checked by
-- its schema in @repo/sal-data (games.ts) before it is published.

alter table journal.puzzles
  drop constraint puzzles_kind_check,
  add constraint puzzles_kind_check check (kind in (
    'crossword', 'word_search', 'quiz', 'word_ladder', 'riddle', 'anagram',
    'name_the_book'
  ));
