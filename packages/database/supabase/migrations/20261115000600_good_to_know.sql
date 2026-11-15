-- "Good to know" (decisions.md, Events): the site's own fields on each
-- event, set in the Diwan's event editor, shown under the date and place:
-- who can come and places left (from the access kind and the capacity), the
-- language, step-free access and the seating with the date to ask for an
-- accommodation by, the food and drink with its allergens, a content note,
-- and whether photos are taken.
--
-- Allergens become the nine major US food allergens (FALCPA with the FASTER
-- Act: milk, eggs, fish, crustacean shellfish, tree nuts, peanuts, wheat,
-- soy, sesame), with any other named in words (such as corn). The EU-only
-- ones move to that line, so nothing is lost.

alter table events.events
  add column language text check (language in ('en', 'ar', 'both')),
  add column accommodation_by date,
  add column served_en text check (char_length(served_en) <= 200),
  add column served_ar text check (char_length(served_ar) <= 200),
  add column other_allergens_en text check (char_length(other_allergens_en) <= 120),
  add column other_allergens_ar text check (char_length(other_allergens_ar) <= 120),
  add column content_note_en text check (char_length(content_note_en) <= 300),
  add column content_note_ar text check (char_length(content_note_ar) <= 300),
  add column no_photos boolean not null default false;

comment on column events.events.language is
  'The language the event is held in: en, ar or both; null until the lead says.';
comment on column events.events.accommodation_by is
  'The day to ask for an accommodation by; null means three days before the event.';
comment on column events.events.served_en is
  'What is served (food and drink), in English; shown only when serves_food.';
comment on column events.events.served_ar is
  'What is served (food and drink), in Arabic.';
comment on column events.events.other_allergens_en is
  'Any allergen in the food beyond the nine, named in English (such as corn).';
comment on column events.events.other_allergens_ar is
  'Any allergen beyond the nine, named in Arabic.';
comment on column events.events.content_note_en is
  'A content note, for events that show or discuss violence, death, abuse or similar.';
comment on column events.events.content_note_ar is
  'The content note in Arabic.';
comment on column events.events.no_photos is
  'True when no photos are taken at the event; otherwise the page says photos are taken.';

-- Map the existing choices across: gluten → wheat, crustaceans →
-- crustacean shellfish; the EU-only ones (celery, mustard, sulphites,
-- lupin, molluscs) are named on the other line.
alter table events.events drop constraint events_allergens_check;

update events.events e
set other_allergens_en = nullif(concat_ws(', ',
      e.other_allergens_en,
      (select string_agg(a, ', ' order by a)
       from unnest(e.allergens) a
       where a in ('celery', 'mustard', 'sulphites', 'lupin', 'molluscs'))
    ), ''),
    allergens = array(
      select distinct case a
        when 'gluten' then 'wheat'
        when 'crustaceans' then 'crustacean_shellfish'
        else a
      end
      from unnest(e.allergens) a
      where a not in ('celery', 'mustard', 'sulphites', 'lupin', 'molluscs')
    )
where cardinality(e.allergens) > 0;

alter table events.events add constraint events_allergens_check check (
  allergens <@ array[
    'milk', 'eggs', 'fish', 'crustacean_shellfish', 'tree_nuts', 'peanuts',
    'wheat', 'soy', 'sesame'
  ]::text[]
);

comment on column events.events.allergens is
  'The major US food allergens in what is served (milk, eggs, fish, crustacean_shellfish, tree_nuts, peanuts, wheat, soy, sesame); others go in other_allergens_*.';

-- The event editor writes these (RLS still decides who may). The access
-- fields of 20261113000700 were never granted, so the Access form could
-- not save; they are granted here with the new ones.
grant update (step_free, seating, serves_food, allergens, language,
  accommodation_by, served_en, served_ar, other_allergens_en,
  other_allergens_ar, content_note_en, content_note_ar, no_photos)
  on events.events to authenticated;
