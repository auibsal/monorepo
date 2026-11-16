-- Hudhud's posts on Supabase Queues (decisions.md, The site: Background
-- jobs): the queue exists, only the server's key reaches it, a message
-- read and not confirmed reappears, and a post set aside is reported.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = extensions, public;

select plan(7);

delete from core.staff_alerts;

select ok(exists (select 1 from pgmq.list_queues() where queue_name = 'telegram'),
  'the queue telegram exists');
select ok(
  not has_function_privilege('authenticated', 'api.telegram_read(integer, integer)', 'execute')
    and not has_function_privilege('anon', 'api.telegram_enqueue(jsonb[])', 'execute')
    and has_function_privilege('service_role', 'api.telegram_done(bigint)', 'execute'),
  'only the server''s key reaches the queue');
select ok(not has_schema_privilege('authenticated', 'pgmq', 'usage'),
  'members have no way into pgmq');

select is(core.telegram_enqueue(array['{"method":"sendMessage","payload":{"chat_id":1}}'::jsonb]), 1,
  'a post goes on the queue');
select is((select count(*)::int from core.telegram_read(10, 0)), 1, 'a run reads it');
-- Read with no time hidden (0 s) and not confirmed: it is there again.
select is((select read_ct from core.telegram_read(10, 30)), 2,
  'unconfirmed, it reappears for the next run, its tries counted');

select core.telegram_set_aside((select msg_id from pgmq.q_telegram limit 1));
select private.platform_health();
select is((select count(*)::int from core.staff_alerts where dedupe_key like 'telegram-set-aside:%'), 1,
  'a post set aside is reported, like a failed job');

select * from finish();
rollback;
