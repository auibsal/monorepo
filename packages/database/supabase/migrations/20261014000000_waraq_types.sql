-- Waraq (owner, Oct 14, 2026): the AUIB Literary Journal, campus news, the
-- Gallery Wall, Six Words and Side Quest episodes become one bilingual
-- publication with five desks. The plan is the Notion project "Waraq: one
-- publication for news, letters and art"; the rules are the officer
-- handbook page "Waraq: how the publication is run".
--
-- This file only adds enum values: Postgres cannot use a new value in the
-- transaction that adds it, so the module itself is the next migration.
-- The schema keeps its code name, `journal`.

-- The types of piece beyond the journal's seven. The journal's own stay as
-- they are: poetry (poem), fiction (story), creative_nonfiction (essay),
-- short_drama (drama), art_photography (artwork), translation, six_words.
alter type journal.category add value if not exists 'article';
alter type journal.category add value if not exists 'interview';
alter type journal.category add value if not exists 'review';
alter type journal.category add value if not exists 'feature';
alter type journal.category add value if not exists 'photo_essay';
alter type journal.category add value if not exists 'comic';
alter type journal.category add value if not exists 'video';
alter type journal.category add value if not exists 'column';
alter type journal.category add value if not exists 'letter';

-- Shortlisted is the board's "selection" column; Fix requested is intake
-- with a returned note. No new submission status is needed.

create type journal.desk as enum ('news', 'letters', 'gallery', 'video', 'voices');
