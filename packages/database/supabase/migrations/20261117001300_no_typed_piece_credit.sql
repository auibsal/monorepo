-- Credits are never typed (decisions.md, Qirtas): a piece's people come
-- from its byline and its accepted credits (journal.piece_credits), and its
-- editors from the work they did. The typed credit line goes; no piece in
-- production ever had one. Search and the content-change trigger leave it
-- out, and the Data API is rebuilt without it.

drop schema if exists api cascade;
drop trigger after_piece_content_change on journal.pieces;
alter table journal.pieces drop column search;
alter table journal.pieces drop column credit_en, drop column credit_ar;

alter table journal.pieces add column search tsvector
  generated always as (private.search_vector(variadic array[title_en, title_ar, deck_en, deck_ar])) stored;
create index pieces_search_idx on journal.pieces using gin (search);

create trigger after_piece_content_change
  after update of title_en, title_ar, deck_en, deck_ar, language, category, video_url, contributor_id
  on journal.pieces
  for each row
  when (old.title_en is distinct from new.title_en
    or old.title_ar is distinct from new.title_ar
    or old.deck_en is distinct from new.deck_en
    or old.deck_ar is distinct from new.deck_ar
    or old.language is distinct from new.language
    or old.category is distinct from new.category
    or old.video_url is distinct from new.video_url
    or old.contributor_id is distinct from new.contributor_id)
  execute function private.after_piece_content_change();

select private.build_api();
