-- American English across the board, no exceptions (owner, Oct 29, 2026).
-- The exception for text quoted from the Society's documents is gone, and
-- the endorsement line is now "a Society of Arts and Letters program".
-- Every English text field in the database (the columns ending in _en, and
-- the permission descriptions) is respelled: program, color, center,
-- canceled and the rest. Code identifiers stay (the programmes schema,
-- programme_id, the 'cancelled' status values, the permission keys): no
-- column ending in _en holds one. A new spelling is not an edit, so the
-- triggers that reset a piece's approvals are paused while it runs.

create function pg_temp.american(value text)
returns text
language plpgsql
immutable
as $$
declare
  pair text[];
  result text := value;
begin
  if value is null then
    return null;
  end if;
  foreach pair slice 1 in array array[
    ['programmes', 'programs'], ['Programmes', 'Programs'], ['PROGRAMMES', 'PROGRAMS'],
    ['programme', 'program'], ['Programme', 'Program'], ['PROGRAMME', 'PROGRAM'],
    ['colours', 'colors'], ['Colours', 'Colors'], ['colour', 'color'], ['Colour', 'Color'],
    ['centres', 'centers'], ['Centres', 'Centers'], ['centre', 'center'], ['Centre', 'Center'],
    ['cancelled', 'canceled'], ['Cancelled', 'Canceled'],
    ['cancelling', 'canceling'], ['Cancelling', 'Canceling'],
    ['behaviours', 'behaviors'], ['behaviour', 'behavior'], ['Behaviour', 'Behavior'],
    ['honours', 'honors'], ['honour', 'honor'], ['Honour', 'Honor'],
    ['organisations', 'organizations'], ['organisation', 'organization'], ['Organisation', 'Organization'],
    ['organised', 'organized'], ['Organised', 'Organized'], ['organise', 'organize'],
    ['Organise', 'Organize'], ['organising', 'organizing'],
    ['favour', 'favor'], ['favours', 'favors'],
    ['labour', 'labor'],
    ['judgement', 'judgment'], ['judgements', 'judgments'],
    ['licence', 'license'], ['Licence', 'License'],
    ['recognised', 'recognized'], ['recognise', 'recognize'], ['recognises', 'recognizes'],
    ['catalogue', 'catalog'],
    ['travelled', 'traveled'],
    ['enrolment', 'enrollment'],
    ['practise', 'practice']
  ] loop
    result := regexp_replace(result, '\m' || pair[1] || '\M', pair[2], 'g');
  end loop;
  return result;
end;
$$;

alter table journal.pieces disable trigger after_piece_content_change;
alter table journal.piece_bodies disable trigger after_piece_body_change;

do $$
declare
  c record;
begin
  for c in
    select col.table_schema, col.table_name, col.column_name
    from information_schema.columns col
    join information_schema.tables t
      on t.table_schema = col.table_schema and t.table_name = col.table_name
    where t.table_type = 'BASE TABLE'
      and col.table_schema in ('core', 'governance', 'content', 'journal', 'programmes',
        'events', 'access', 'membership', 'charity')
      and col.data_type = 'text'
      and col.column_name like '%\_en' escape '\'
      and col.is_generated = 'NEVER'
  loop
    execute format(
      'update %I.%I set %I = pg_temp.american(%I) where %I is distinct from pg_temp.american(%I)',
      c.table_schema, c.table_name, c.column_name, c.column_name, c.column_name, c.column_name
    );
  end loop;
end;
$$;

update access.permissions set description = pg_temp.american(description)
where description is distinct from pg_temp.american(description);

alter table journal.pieces enable trigger after_piece_content_change;
alter table journal.piece_bodies enable trigger after_piece_body_change;
