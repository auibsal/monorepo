-- Booking asks nothing (the owner, Nov 23, 2026): one tap books a place,
-- with no box about accessibility or diet. An accommodation is asked for
-- by writing to hello@auibsal.org, as the event's page says ("Ask for an
-- accommodation by …"); what is served and its allergens are on the page.
create or replace function private.standard_questions(serves_food boolean)
returns jsonb
language sql
immutable
set search_path = ''
as $$ select '[]'::jsonb $$;

comment on function private.standard_questions(boolean) is
  'The booking''s questions: none; booking is one tap.';

-- And a booking keeps no answers: whatever a client sends is dropped.
create or replace function private.booking_answers(event_id uuid, answers jsonb)
returns jsonb
language sql
immutable
security definer
set search_path = ''
as $$ select '{}'::jsonb $$;

-- Every event's questions follow (the trigger sets them from the rule).
update events.events set questions = '[]'::jsonb where questions <> '[]'::jsonb;
update events.rsvps set answers = '{}'::jsonb where answers <> '{}'::jsonb;
update events.waitlist set answers = '{}'::jsonb where answers <> '{}'::jsonb;

select private.build_api();
