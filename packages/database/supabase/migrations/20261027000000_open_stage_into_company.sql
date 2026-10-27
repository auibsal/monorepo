-- Open Stage merges into the Company (owner, 2026-10-27). The Company keeps
-- the theater: its productions, auditions and whatever nights it sets
-- itself. The Evenings become three (the Majlis, Book Circle, Open Pages),
-- each in turn, so each comes every three weeks. The name "Open Stage" is
-- retired.
--
-- Open Stage's row stays, unpublished (as Gallery Wall's did), so its
-- history keeps its place; everything that named it now names the Company.
-- Its repeat rule is removed: the Company sets its own nights.

do $$
declare
  open_stage uuid := (select id from core.programmes where slug = 'open-stage');
  company uuid := (select id from core.programmes where slug = 'company');
  ref record;
begin
  if open_stage is null or company is null then
    return;
  end if;

  -- Its repeat rule goes first (one per program; the Company keeps its own).
  delete from events.series_rules where programme_id = open_stage;

  -- Every row that names Open Stage now names the Company.
  for ref in
    select c.conrelid::regclass as tbl, a.attname as col
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
    where c.contype = 'f'
      and c.confrelid = 'core.programmes'::regclass
      and array_length(c.conkey, 1) = 1
  loop
    execute format('update %s set %I = $1 where %I = $2', ref.tbl, ref.col, ref.col)
      using company, open_stage;
  end loop;

  update core.programmes set is_active = false, sort = 140 where id = open_stage;

  update core.programmes set
    summary_en = 'The Society''s theater company: one staged production a semester, cast from open auditions.',
    summary_ar = 'فرقة الجمعية المسرحية: عمل مسرحي واحد كل فصل، يُختار ممثلوه من تجارب أداء مفتوحة.'
  where id = company;
end;
$$;
