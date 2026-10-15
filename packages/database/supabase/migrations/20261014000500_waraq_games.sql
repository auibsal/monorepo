-- Waraq's games: crosswords and word searches that editors write in the
-- Nexus (Administration → Waraq → Games). The daily word guess and word
-- search are made in code from fixed word lists (packages/sal-data/games.ts)
-- and need no table. A puzzle is in one language; its title is in both.

create table journal.puzzles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 80),
  kind text not null check (kind in ('crossword', 'word_search')),
  language text not null check (language in ('en', 'ar')),
  title_en text not null default '' check (char_length(title_en) <= 120),
  title_ar text not null default '' check (char_length(title_ar) <= 120),
  note_en text check (char_length(note_en) <= 500),
  note_ar text check (char_length(note_ar) <= 500),
  -- The grid and its words or clues; checked by crosswordSchema and
  -- wordSearchSchema in @repo/sal-data before it is saved and when read.
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object'),
  -- Starter puzzles were made with an AI tool from facts published on
  -- auibsal.org; the page says so.
  made_with_ai boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'published' or (published_at is not null and (title_en <> '' or title_ar <> '')))
);

create index puzzles_published_idx on journal.puzzles (language, published_at desc)
  where status = 'published';
create index puzzles_created_by_idx on journal.puzzles (created_by);

create trigger set_updated_at before update on journal.puzzles
  for each row execute function private.set_updated_at();
create trigger log_activity after insert or update or delete on journal.puzzles
  for each row execute function private.log_activity();
create trigger revalidate after insert or update or delete on journal.puzzles
  for each statement execute function private.queue_revalidation('journal');

-- Who writes puzzles: any Waraq desk editor, the Copy Chief, publishers,
-- the Editor-in-Chief and Managing Editor.
create function private.can_edit_puzzles()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select access.has_permission_anywhere('journal.approve')
    or access.has_permission_anywhere('journal.publish')
    or access.has_permission_anywhere('journal.copy')
    or access.has_permission_anywhere('journal.edit.news')
    or access.has_permission_anywhere('journal.edit.letters')
    or access.has_permission_anywhere('journal.edit.gallery')
    or access.has_permission_anywhere('journal.edit.video')
    or access.has_permission_anywhere('journal.edit.voices');
$$;

revoke all on function private.can_edit_puzzles() from public, anon;
grant execute on function private.can_edit_puzzles() to authenticated, service_role;

alter table journal.puzzles enable row level security;

create policy "Anyone reads published puzzles"
  on journal.puzzles for select to anon, authenticated
  using (status = 'published' and published_at <= now());
create policy "Puzzle editors read puzzles"
  on journal.puzzles for select to authenticated
  using ((select private.can_edit_puzzles()));
create policy "Puzzle editors add puzzles"
  on journal.puzzles for insert to authenticated
  with check ((select private.can_edit_puzzles()));
create policy "Puzzle editors change puzzles"
  on journal.puzzles for update to authenticated
  using ((select private.can_edit_puzzles()))
  with check ((select private.can_edit_puzzles()));
create policy "Puzzle editors delete puzzles"
  on journal.puzzles for delete to authenticated
  using ((select private.can_edit_puzzles()));
create policy "Third-party apps reach only their areas"
  on journal.puzzles as restrictive for all to authenticated
  using ((select private.client_allows('journal')))
  with check ((select private.client_allows('journal')));

grant select on journal.puzzles to anon, authenticated;
grant insert (slug, kind, language, title_en, title_ar, note_en, note_ar, data, status, published_at)
  on journal.puzzles to authenticated;
grant update (slug, kind, language, title_en, title_ar, note_en, note_ar, data, status, published_at)
  on journal.puzzles to authenticated;
grant delete on journal.puzzles to authenticated;
grant all on journal.puzzles to service_role;

-- The starter puzzles (owner, Oct 14, 2026: "plus the starter puzzles"):
-- made with an AI tool from facts on auibsal.org (the programs, the desks,
-- the motto), laid out by layoutCrossword and buildWordSearch.
insert into journal.puzzles (slug, kind, language, title_en, title_ar, data, made_with_ai, status, published_at)
select slug, kind, language, title_en, title_ar, data, true, 'published', now()
from (values
  ('first-crossword', 'crossword', 'en', 'The first crossword', 'الكلمات المتقاطعة الأولى', '{"cols":15,"entries":[{"across":true,"answer":"VOICES","clue":"Waraq''s desk for columns and letters to the editor","col":0,"row":2,"number":4},{"across":true,"answer":"MUTANABBI","clue":"Baghdad''s book street, and a SAL walk to it","col":6,"row":3,"number":8},{"across":true,"answer":"TYPEWRITER","clue":"Every spring, six words and one of these tour the whole campus","col":3,"row":6,"number":9},{"across":true,"answer":"PEN","clue":"The paper and the ___ (the Society''s motto)","col":5,"row":8,"number":11},{"across":true,"answer":"SCRATCH","clue":"___ Night: try a scene, a poem or a sketch, no pressure","col":3,"row":10,"number":12},{"across":false,"answer":"NEXUS","clue":"The Society''s member portal","col":7,"row":0,"number":1},{"across":false,"answer":"MOTION","clue":"___ Night: a literary debate once a term","col":14,"row":0,"number":2},{"across":false,"answer":"BOOK","clue":"___ Circle: one a month, Arabic and English in turn","col":1,"row":1,"number":3},{"across":false,"answer":"CHAPTER","clue":"Second ___: every fall, donate books and volunteer at the fair","col":3,"row":2,"number":5},{"across":false,"answer":"MAJLIS","clue":"The SAL salon: a guest, readings, tea, conversation","col":9,"row":2,"number":6},{"across":false,"answer":"GALLERY","clue":"Waraq''s desk for art and photography","col":11,"row":2,"number":7},{"across":false,"answer":"PAPER","clue":"The ___ and the pen (the Society''s motto)","col":5,"row":6,"number":10}],"rows":11}'::jsonb),
  ('first-arabic-crossword', 'crossword', 'ar', 'The first Arabic crossword', 'أول كلمات متقاطعة بالعربية', '{"cols":9,"entries":[{"across":true,"answer":"مناظرة","clue":"نقاش أدبي على طريقة المناظرات تقيمه الجمعية مرة كل فصل","col":3,"row":0,"number":1},{"across":true,"answer":"القلم","clue":"والقرطاسُ و...: شعار الجمعية","col":2,"row":4,"number":3},{"across":true,"answer":"ورق","clue":"اسم صحيفة الجمعية","col":2,"row":6,"number":4},{"across":true,"answer":"كاتبة","clue":"كل ربيع: ست كلمات، وآلة ... واحدة، والحرم الجامعي كله","col":0,"row":8,"number":5},{"across":true,"answer":"المتنبي","clue":"شارع الكتب في بغداد","col":0,"row":10,"number":7},{"across":true,"answer":"ورش","clue":"صفحات مفتوحة: ... كتابة بحضور المحررين","col":1,"row":12,"number":9},{"across":false,"answer":"المجلس","clue":"صالون الجمعية الشهري: ضيف، وقراءات، وشاي، وحديث","col":5,"row":0,"number":2},{"across":false,"answer":"اصوات","clue":"مكتب الأعمدة ورسائل القرّاء في ورق","col":2,"row":4,"number":3},{"across":false,"answer":"كتاب","clue":"حلقة الكتاب: ... واحد كل شهر","col":0,"row":8,"number":5},{"across":false,"answer":"قصيدة","clue":"في ليلة الشعر الرديء، أسوأ ... في الجامعة تفوز","col":6,"row":8,"number":6},{"across":false,"answer":"معرض","clue":"مكتب الفن والتصوير في ورق","col":2,"row":10,"number":8}],"rows":14}'::jsonb),
  ('sal-programs-word-search', 'word_search', 'en', 'SAL''s programs', 'برامج الجمعية', '{"grid":[["M","J","J","W","S","C","R","A","T","C","H","M"],["O","L","Q","C","H","A","P","T","E","R","Z","U"],["T","M","R","T","B","M","A","J","L","I","S","T"],["I","H","Q","Q","X","Y","S","B","A","N","L","A"],["O","O","P","E","N","P","A","G","E","S","A","N"],["N","R","T","L","G","A","L","L","E","R","Y","A"],["J","P","G","K","Y","D","R","X","G","M","N","B"],["S","I","D","E","Q","U","E","S","T","C","L","B"],["Q","B","O","O","K","C","I","R","C","L","E","I"],["T","K","T","Y","P","E","W","R","I","T","E","R"],["A","F","N","W","A","R","A","Q","W","K","J","E"],["P","O","E","T","R","Y","I","N","F","O","N","S"]],"size":12,"words":[{"col":1,"dc":1,"dr":0,"label":"Book Circle","row":8,"word":"BOOKCIRCLE"},{"col":2,"dc":1,"dr":0,"label":"Typewriter","row":9,"word":"TYPEWRITER"},{"col":11,"dc":0,"dr":1,"label":"Mutanabbi","row":0,"word":"MUTANABBI"},{"col":1,"dc":1,"dr":0,"label":"Open Pages","row":4,"word":"OPENPAGES"},{"col":0,"dc":1,"dr":0,"label":"Side Quest","row":7,"word":"SIDEQUEST"},{"col":4,"dc":1,"dr":0,"label":"Scratch","row":0,"word":"SCRATCH"},{"col":4,"dc":1,"dr":0,"label":"Gallery","row":5,"word":"GALLERY"},{"col":3,"dc":1,"dr":0,"label":"Chapter","row":1,"word":"CHAPTER"},{"col":5,"dc":1,"dr":0,"label":"Majlis","row":2,"word":"MAJLIS"},{"col":0,"dc":0,"dr":1,"label":"Motion","row":0,"word":"MOTION"},{"col":0,"dc":1,"dr":0,"label":"Poetry","row":11,"word":"POETRY"},{"col":3,"dc":1,"dr":0,"label":"Waraq","row":10,"word":"WARAQ"}]}'::jsonb),
  ('waraq-and-the-society-word-search', 'word_search', 'ar', 'Waraq and the Society', 'ورق والجمعية', '{"grid":[["ة","ط","ت","ا","ش","م","غ","غ","ا","م"],["ق","ك","ة","ل","ا","ع","ع","م","خ","ر"],["ح","ذ","ة","م","ل","ر","ن","ن","ب","ئ"],["ز","ص","ه","ج","م","ض","ا","ا","ا","ي"],["ا","خ","ا","ل","ت","و","ل","ظ","ر","ا"],["د","ض","ل","س","ن","ك","ق","ر","ح","ت"],["ا","ي","ق","م","ب","و","ر","ة","ظ","و"],["ب","ط","ل","غ","ي","ر","ط","ا","ش","ظ"],["م","ل","م","ي","ز","ق","ا","ض","ن","غ"],["ب","ا","ص","و","ا","ت","س","ه","ه","ض"]],"size":10,"words":[{"col":4,"dc":0,"dr":1,"label":"المتنبي","row":1,"word":"المتنبي"},{"col":6,"dc":0,"dr":1,"label":"القرطاس","row":3,"word":"القرطاس"},{"col":3,"dc":0,"dr":1,"label":"المجلس","row":0,"word":"المجلس"},{"col":7,"dc":0,"dr":1,"label":"مناظرة","row":1,"word":"مناظرة"},{"col":9,"dc":0,"dr":1,"label":"مرئيات","row":0,"word":"مرئيات"},{"col":8,"dc":0,"dr":1,"label":"أخبار","row":0,"word":"اخبار"},{"col":1,"dc":1,"dr":0,"label":"أصوات","row":9,"word":"اصوات"},{"col":2,"dc":0,"dr":1,"label":"القلم","row":4,"word":"القلم"},{"col":0,"dc":0,"dr":1,"label":"آداب","row":4,"word":"اداب"},{"col":5,"dc":0,"dr":1,"label":"معرض","row":0,"word":"معرض"},{"col":5,"dc":0,"dr":1,"label":"ورق","row":6,"word":"ورق"}]}'::jsonb)
) as p (slug, kind, language, title_en, title_ar, data)
on conflict (slug) do nothing;
