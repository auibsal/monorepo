-- The real numbers in About's sustainability note (decisions.md, Where the
-- Society stands: Sustainability): the documents signed on the site, each
-- at least one sheet not printed. The page converts the sheets into paper,
-- wood and water with the Environmental Paper Network's Paper Calculator.
-- Counts only, never who signed.

create function private.paper_numbers()
returns table (documents_signed integer, sheets_not_printed integer)
language sql
stable
security definer
set search_path = ''
as $$
  select n, n
  from (
    select count(*)::integer as n
    from governance.form_submissions s
    where s.signed_at is not null and s.withdrawn_at is null
  ) c;
$$;

revoke all on function private.paper_numbers() from public;
grant execute on function private.paper_numbers() to anon, authenticated, service_role;

create function content.paper_numbers()
returns table (documents_signed integer, sheets_not_printed integer)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.paper_numbers() $$;

revoke all on function content.paper_numbers() from public;
grant execute on function content.paper_numbers() to anon, authenticated, service_role;

comment on function content.paper_numbers() is
  'The paperless count (About): documents signed on the site and sheets not printed. Counts only.';

select private.build_api();
