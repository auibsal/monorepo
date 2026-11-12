-- The Society by the numbers, on About (decisions.md, The site): counted
-- by the site from its own records, as counts only.

create function private.society_numbers()
returns table (members integer, events integer, pieces integer, editions integer)
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select count(*)::integer from membership.memberships),
    (select count(*)::integer from events.events e
      where e.status = 'published' and not e.members_only and e.starts_at <= now()),
    (select count(*)::integer from journal.pieces p
      where p.status = 'published' and p.published_at <= now()),
    (select count(*)::integer from journal.issues i where i.status = 'published');
$$;

revoke all on function private.society_numbers() from public;
grant execute on function private.society_numbers() to anon, authenticated, service_role;

create function content.society_numbers()
returns table (members integer, events integer, pieces integer, editions integer)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.society_numbers() $$;

revoke all on function content.society_numbers() from public;
grant execute on function content.society_numbers() to anon, authenticated, service_role;

comment on function content.society_numbers() is
  'The Society by the numbers (About): members of every class, public events held, pieces and Editions published. Counts only.';
