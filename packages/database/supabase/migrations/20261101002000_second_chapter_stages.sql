-- Second Chapter's stages and drop-off points (owner, Nov 4, 2026).
--
-- The program's page follows the collection through its stages (boxes,
-- donations, the fair, the witnessed handover, the impact report) from the
-- campaign's own record. The days of each stage are kept on the campaign,
-- entered in the Diwan, so nothing is written into the page by hand.
-- Drop-off points are a repeating field: each a place in both languages
-- and, if given, when it is open. The page shows them only when entered.
--
-- The columns inherit the campaign's policies: anyone reads a published
-- campaign, its managers edit it.

alter table charity.campaigns
  add column boxes_on date,
  add column donations_starts_on date,
  add column donations_ends_on date,
  add column fair_starts_on date,
  add column fair_ends_on date,
  add column handover_due_on date,
  add column impact_due_on date,
  add column drop_off_points jsonb not null default '[]'::jsonb;

-- A drop-off point is {place_en, place_ar, hours_en?, hours_ar?}: both
-- names required, every value text, at most 20 points.
create function private.valid_drop_off_points(points jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select jsonb_typeof(points) = 'array'
    and jsonb_array_length(points) <= 20
    and not exists (
      select 1
      from jsonb_array_elements(points) p
      where jsonb_typeof(p) <> 'object'
        or exists (
          select 1 from jsonb_object_keys(p) k
          where k not in ('place_en', 'place_ar', 'hours_en', 'hours_ar')
        )
        or jsonb_typeof(p -> 'place_en') is distinct from 'string'
        or jsonb_typeof(p -> 'place_ar') is distinct from 'string'
        or char_length(btrim(p ->> 'place_en')) not between 1 and 200
        or char_length(btrim(p ->> 'place_ar')) not between 1 and 200
        or (p ? 'hours_en' and (jsonb_typeof(p -> 'hours_en') <> 'string'
            or char_length(p ->> 'hours_en') > 200))
        or (p ? 'hours_ar' and (jsonb_typeof(p -> 'hours_ar') <> 'string'
            or char_length(p ->> 'hours_ar') > 200))
    );
$$;

revoke all on function private.valid_drop_off_points(jsonb) from public;
grant execute on function private.valid_drop_off_points(jsonb)
  to anon, authenticated, service_role;

alter table charity.campaigns
  add constraint drop_off_points_valid
    check (private.valid_drop_off_points(drop_off_points)),
  add constraint donations_in_order
    check (donations_ends_on is null or donations_starts_on is null
      or donations_ends_on >= donations_starts_on),
  add constraint fair_in_order
    check (fair_ends_on is null or fair_starts_on is null
      or fair_ends_on >= fair_starts_on);

comment on column charity.campaigns.drop_off_points is
  'Where books can be left: [{place_en, place_ar, hours_en?, hours_ar?}], at most 20.';
comment on column charity.campaigns.boxes_on is
  'The day the collection boxes go out; the stage tracker reads it.';
