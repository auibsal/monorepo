-- Structural guarantees: CI fails if any table in a SAL schema lacks Row
-- Level Security, or if a client role can read ballots.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = extensions, public;

select plan(11);

select is_empty(
  $$
    select n.nspname || '.' || c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where c.relkind in ('r', 'p')
      and n.nspname in ('public', 'core', 'access', 'membership', 'events',
        'journal', 'programmes', 'governance', 'content', 'private')
      and not c.relrowsecurity
  $$,
  'Every table in a SAL schema has Row Level Security enabled'
);

-- Tables with RLS but intentionally no policy: only the service role (which
-- bypasses RLS) and SECURITY DEFINER functions touch them.
select is_empty(
  $$
    select n.nspname || '.' || c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where c.relkind in ('r', 'p')
      and n.nspname in ('core', 'access', 'membership', 'events', 'journal',
        'programmes', 'governance', 'content')
      and not exists (select 1 from pg_policy p where p.polrelid = c.oid)
      and (n.nspname || '.' || c.relname) not in (
        'core.outbox', 'governance.ballots'
      )
  $$,
  'Every table has at least one policy (except the outbox and ballots)'
);

select ok(
  not has_table_privilege('authenticated', 'governance.ballots', 'select')
    and not has_table_privilege('anon', 'governance.ballots', 'select'),
  'No client role can read ballots'
);

select ok(
  not exists (
    select 1 from pg_trigger t
    join pg_proc p on p.oid = t.tgfoid
    where t.tgrelid in ('governance.ballots'::regclass, 'governance.ballot_receipts'::regclass)
      and p.proname = 'log_activity'
  ),
  'Ballots and receipts are never written to the activity log'
);

select hasnt_column('governance', 'ballots', 'user_id', 'Ballots carry no voter');
select hasnt_column('governance', 'ballot_receipts', 'cast_at', 'Receipts carry no timestamp');

-- Owner, Nov 8, 2026: charity collections are a Notion record; the schema
-- is gone.
select hasnt_schema('charity', 'The charity schema is gone');

-- Owner, Nov 8, 2026: Hudhud's old columns are dropped.
select hasnt_table('core', 'telegram_word_plays', 'No word plays table');
select hasnt_column('core', 'telegram_groups', 'join_policy', 'Groups carry no join policy');
select hasnt_column('core', 'telegram_members', 'warnings', 'Members carry no warning count');
select hasnt_column('core', 'telegram_members', 'joined_at', 'Members carry no join date');

select * from finish();
rollback;
