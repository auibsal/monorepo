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

-- Every event's questions follow (the trigger sets them from the rule).
update events.events set questions = '[]'::jsonb where questions <> '[]'::jsonb;

select private.build_api();
