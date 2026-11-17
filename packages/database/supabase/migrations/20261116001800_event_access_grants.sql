-- The event's access and format, written from its page in the Diwan
-- (20261116000700_event_access.sql, 20261116000800_after_the_event.sql):
-- the columns came without the grants every other column of the event has,
-- so saving the event was refused. Row Level Security still decides which
-- events a person may change.

grant insert (classes, format, access_detail_en, access_detail_ar),
  update (classes, format, access_detail_en, access_detail_ar)
  on events.events to authenticated;

select private.build_api();
