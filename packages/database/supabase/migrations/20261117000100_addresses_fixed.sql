-- Addresses are generated, readable and permanent (decisions.md, The site):
-- once an event, an Edition, a piece or an episode is published, or a
-- production is listed, its address (slug) no longer changes from the site.
-- A change after that is a redirect in the code's list (MOVED in
-- apps/web/next.config.ts), made by the site chat with its reason, never an
-- edit in the Diwan. The server's own key and migrations are not held.

create function private.address_stays()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  shown boolean;
begin
  if new.slug is not distinct from old.slug
    or coalesce((select auth.role()), '') <> 'authenticated' then
    return new;
  end if;
  shown := case tg_table_name
    when 'productions' then coalesce((to_jsonb(old) ->> 'is_public')::boolean, false)
    else (to_jsonb(old) ->> 'published_at') is not null
  end;
  if shown then
    raise exception 'address_fixed'
      using errcode = '23514',
        detail = 'The address is fixed once published: a change is a redirect in the code.';
  end if;
  return new;
end;
$$;

comment on function private.address_stays() is
  'Keeps a published record''s address (decisions.md, The site: addresses are permanent).';

create trigger address_stays before update of slug on events.events
  for each row execute function private.address_stays();
create trigger address_stays before update of slug on journal.issues
  for each row execute function private.address_stays();
create trigger address_stays before update of slug on journal.pieces
  for each row execute function private.address_stays();
create trigger address_stays before update of slug on programs.episodes
  for each row execute function private.address_stays();
create trigger address_stays before update of slug on programs.productions
  for each row execute function private.address_stays();

select private.build_api();
