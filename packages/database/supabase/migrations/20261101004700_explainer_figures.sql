-- The design review, PR 6 (A16): explainers with simple figures.
--
-- A piece may carry figures (journal.piece_figures): a titled list of
-- labeled values, drawn on the piece as bars a reader can explore, with
-- the same values as a table. The editor places a figure in the text with
-- a paragraph of its own, "[figure 1]" («[شكل 1]»); a figure not placed
-- shows after the text. Figures are read under the same rules as the
-- piece's text, and written by its editors (private.piece_editor).

create table journal.piece_figures (
  id uuid primary key default gen_random_uuid(),
  piece_id uuid not null references journal.pieces (id) on delete cascade,
  sort smallint not null default 1 check (sort between 1 and 20),
  title_en text check (char_length(title_en) <= 200),
  title_ar text check (char_length(title_ar) <= 200),
  unit_en text check (char_length(unit_en) <= 40),
  unit_ar text check (char_length(unit_ar) <= 40),
  source_en text check (char_length(source_en) <= 300),
  source_ar text check (char_length(source_ar) <= 300),
  -- [{"label_en": "...", "label_ar": "...", "value": 12.5}, ...]
  rows jsonb not null default '[]'::jsonb check (
    jsonb_typeof(rows) = 'array' and jsonb_array_length(rows) between 1 and 24
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (piece_id, sort),
  constraint piece_figures_titled check (coalesce(title_en, title_ar) is not null)
);

comment on table journal.piece_figures is
  'Figures in a piece (explainers, A16): labeled values drawn as bars, with a table; placed in the text with "[figure n]".';

create trigger set_updated_at before update on journal.piece_figures
  for each row execute function private.set_updated_at();

-- Every row is a label in at least one language and a number.
create function private.check_figure_rows()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if exists (
    select 1 from jsonb_array_elements(new.rows) r
    where jsonb_typeof(r) <> 'object'
      or jsonb_typeof(r -> 'value') <> 'number'
      or coalesce(nullif(btrim(r ->> 'label_en'), ''), nullif(btrim(r ->> 'label_ar'), '')) is null
      or char_length(coalesce(r ->> 'label_en', '')) > 80
      or char_length(coalesce(r ->> 'label_ar', '')) > 80
  ) then
    raise exception 'figure_rows' using errcode = '22023';
  end if;
  return new;
end;
$$;

revoke all on function private.check_figure_rows() from public, anon, authenticated;

create trigger check_figure_rows
  before insert or update of rows on journal.piece_figures
  for each row execute function private.check_figure_rows();

alter table journal.piece_figures enable row level security;

revoke all on journal.piece_figures from anon, authenticated;
grant select on journal.piece_figures to anon, authenticated;
grant insert (piece_id, sort, title_en, title_ar, unit_en, unit_ar, source_en, source_ar, rows)
  on journal.piece_figures to authenticated;
grant update (sort, title_en, title_ar, unit_en, unit_ar, source_en, source_ar, rows)
  on journal.piece_figures to authenticated;
grant delete on journal.piece_figures to authenticated;
grant all on journal.piece_figures to service_role;

create policy "No third-party apps" on journal.piece_figures
  as restrictive for all to authenticated
  using ((select private.client_allows('journal')))
  with check ((select private.client_allows('journal')));

-- Read like the text: a published public piece's by anyone; a published
-- members-only piece's by members; the author's and editors' own always.
create policy "Anyone reads the figures of published public pieces" on journal.piece_figures
  for select to anon
  using (exists (
    select 1 from journal.pieces p
    where p.id = piece_figures.piece_id and p.status = 'published'
      and p.published_at <= now() and not p.members_only
  ));
create policy "Select by authenticated" on journal.piece_figures
  for select to authenticated
  using (
    exists (
      select 1 from journal.pieces p
      where p.id = piece_figures.piece_id and p.status = 'published'
        and p.published_at <= now() and not p.members_only
    )
    or (select private.is_piece_author(piece_figures.piece_id))
    or ((select private.membership_is_member()) and exists (
      select 1 from journal.pieces p
      where p.id = piece_figures.piece_id and p.status = 'published' and p.published_at <= now()
    ))
    or (select private.piece_editor(piece_figures.piece_id))
  );
create policy "Piece editors add figures" on journal.piece_figures
  for insert to authenticated with check ((select private.piece_editor(piece_id)));
create policy "Piece editors change figures" on journal.piece_figures
  for update to authenticated
  using ((select private.piece_editor(piece_id)))
  with check ((select private.piece_editor(piece_id)));
create policy "Piece editors remove figures" on journal.piece_figures
  for delete to authenticated using ((select private.piece_editor(piece_id)));

-- A figure is part of what readers see: changing it asks for the approvals
-- again, as media and credits do.
create trigger after_piece_parts_change
  after insert or update or delete on journal.piece_figures
  for each row execute function private.after_piece_parts_change();

create trigger revalidate
  after insert or update or delete on journal.piece_figures
  for each statement execute function private.queue_revalidation('journal');
