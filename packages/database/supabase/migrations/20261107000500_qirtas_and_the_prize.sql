-- Qirtas (owner, Nov 7, 2026; claude/decisions.md §5).
--
-- * Six sections; types are flexible: each section takes what fits it.
--   The fixed six types per section are dropped; a piece may carry its
--   own type label, and each section has an "other" type.
-- * Six Words are not part of Qirtas (their pages are the Tour's, on
--   members' profiles); Next Stop is the Director of Media's show, not
--   part of Qirtas. Video publishes members' films and video stories.
-- * Games: the word, word search, crossword and anagrams, generated daily
--   by the site and checked by the editors; members send no games.
-- * Bylines: the writer's name as in the Register, a pen name, or
--   "Anonymous"; for a pen name or Anonymous the Editor-in-Chief knows the
--   writer and keeps the identity confidential.
-- * Unpublished Write for Qirtas submissions are deleted twelve months
--   after the decision.
-- * The Mutanabbi Prize replaces the Qirtas Awards.

-- 1. Types.
alter type journal.category add value if not exists 'news_other';
alter type journal.category add value if not exists 'voices_other';
alter type journal.category add value if not exists 'letters_other';
alter type journal.category add value if not exists 'gallery_other';
alter type journal.category add value if not exists 'video_other';
alter type journal.category add value if not exists 'word';
alter type journal.category add value if not exists 'word_search';
