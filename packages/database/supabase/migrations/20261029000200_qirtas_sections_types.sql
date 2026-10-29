-- Qirtas in six sections (owner, Oct 29, 2026), step 1: the new section
-- and the new types. Values added to an enum can be used only once the
-- transaction that adds them commits, so the mapping and the rules that
-- use them follow in 20261029000300.
--
-- Sections: News, Voices, Letters, Gallery, Video and Games (new).
-- Types, six a section:
--   News     report, feature, interview, profile, event coverage, explainer
--   Voices   review, column, opinion essay, letter to the editor, debate,
--            recommendations
--   Letters  poetry, fiction, creative nonfiction, drama, translation,
--            Six Words
--   Gallery  art, photography, illustration, comics, calligraphy, photo essay
--   Video    Next Stop episode, reel, short film, video report, recorded
--            performance, animation
--   Games    crossword, quiz, word ladder, riddle, anagram, name the book

alter type journal.desk add value if not exists 'games';

alter type journal.category add value if not exists 'profile';
alter type journal.category add value if not exists 'event_coverage';
alter type journal.category add value if not exists 'explainer';
alter type journal.category add value if not exists 'opinion_essay';
alter type journal.category add value if not exists 'debate';
alter type journal.category add value if not exists 'recommendations';
alter type journal.category add value if not exists 'photography';
alter type journal.category add value if not exists 'illustration';
alter type journal.category add value if not exists 'calligraphy';
alter type journal.category add value if not exists 'next_stop_episode';
alter type journal.category add value if not exists 'reel';
alter type journal.category add value if not exists 'short_film';
alter type journal.category add value if not exists 'recorded_performance';
alter type journal.category add value if not exists 'animation';
alter type journal.category add value if not exists 'crossword';
alter type journal.category add value if not exists 'quiz';
alter type journal.category add value if not exists 'word_ladder';
alter type journal.category add value if not exists 'riddle';
alter type journal.category add value if not exists 'anagram';
alter type journal.category add value if not exists 'name_the_book';
