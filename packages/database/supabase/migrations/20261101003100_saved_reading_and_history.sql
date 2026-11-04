-- The design review, PR 4d (Nov 4, 2026).
--
-- A9 and C22: saved reading. A member (or a guest who reads Qirtas) saves
-- a published piece to read later; the list is theirs alone, on Today and
-- on its own page in Membership. Only pieces they can read can be saved,
-- and a piece that is unpublished or removed leaves their list with it.
--
-- C24: a record's history on its own page in the Diwan, from the activity
-- log. Who did what and when, and which fields changed: never the values,
-- so nothing a record hides (an author before a blind decision, a draft's
-- text) reaches anyone through its history. Officers only, and only for a
-- record they can already see.

create table journal.saved_pieces (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  piece_id uuid not null references journal.pieces (id) on delete cascade,
  saved_at timestamptz not null default now(),
  primary key (user_id, piece_id)
);

comment on table journal.saved_pieces is
  'Pieces a reader saved to read later. Read and written by that reader only.';

create index saved_pieces_piece_idx on journal.saved_pieces (piece_id);
create index saved_pieces_user_idx on journal.saved_pieces (user_id, saved_at desc);

alter table journal.saved_pieces enable row level security;

revoke all on journal.saved_pieces from anon, authenticated;
grant select, insert, delete on journal.saved_pieces to authenticated;
grant all on journal.saved_pieces to service_role;

create policy "No third-party apps" on journal.saved_pieces
  as restrictive for all to authenticated
  using ((select private.client_allows('journal')))
  with check ((select private.client_allows('journal')));

create policy "Readers see what they saved" on journal.saved_pieces
  for select to authenticated using (user_id = (select auth.uid()));
-- Only a published piece the reader can read (the pieces' own policies
-- decide, members-only pieces included).
create policy "Readers save what they can read" on journal.saved_pieces
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from journal.pieces p
      where p.id = piece_id and p.status = 'published'
    )
  );
create policy "Readers let go of what they saved" on journal.saved_pieces
  for delete to authenticated using (user_id = (select auth.uid()));

-- ── A record's history ──────────────────────────────────────────────────

-- The records with their own page in the Diwan whose history it shows.
create function private.history_tables()
returns text[]
language sql
immutable
set search_path = ''
as $$
  select array[
    'events.events',
    'journal.pieces',
    'journal.issues',
    'journal.calls',
    'journal.award_rounds',
    'journal.puzzles',
    'programmes.productions',
    'programmes.episodes',
    'governance.partners',
    'governance.partner_agreements',
    'governance.elections',
    'governance.society_documents',
    'charity.campaigns'
  ]
$$;
revoke all on function private.history_tables() from public;
grant execute on function private.history_tables() to authenticated, service_role;

create function private.record_history(record_table text, record_id text)
returns table (
  operation text,
  actor_id uuid,
  occurred_at timestamptz,
  changed text[]
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (select private.is_staff((select auth.uid())))
    or not (record_table = any (private.history_tables())) then
    return;
  end if;
  return query
    select l.operation, l.actor_id, l.occurred_at,
      case when l.operation = 'UPDATE' then
        coalesce((
          select array_agg(k order by k)
          from jsonb_object_keys(coalesce(l.new_row, '{}'::jsonb)) as k
          where k not in ('updated_at', 'search')
            and (l.old_row -> k) is distinct from (l.new_row -> k)
        ), '{}')
      else '{}'::text[] end
    from core.activity_log l
    where l.table_schema = split_part(record_table, '.', 1)
      and l.table_name = split_part(record_table, '.', 2)
      and l.row_id = record_id
    order by l.id desc
    limit 100;
end;
$$;
revoke all on function private.record_history(text, text) from public;
grant execute on function private.record_history(text, text) to authenticated, service_role;

-- The name the Diwan calls. It runs as the caller, so the record must be
-- one their roles already let them see (its table's own policies decide);
-- only then is the log read.
create function core.record_history(record_table text, record_id text)
returns table (
  operation text,
  actor_id uuid,
  occurred_at timestamptz,
  changed text[]
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  visible boolean;
begin
  if not (record_table = any (private.history_tables())) then
    return;
  end if;
  execute format(
    'select exists (select 1 from %I.%I where id::text = $1)',
    split_part(record_table, '.', 1),
    split_part(record_table, '.', 2)
  ) into visible using record_id;
  if not visible then
    return;
  end if;
  return query select * from private.record_history(record_table, record_id);
end;
$$;
revoke all on function core.record_history(text, text) from public;
grant execute on function core.record_history(text, text) to authenticated, service_role;
