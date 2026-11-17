-- The Company's public productions (auibsal.org/company), read with the
-- publishable key. The page read programs.productions, which the public
-- may not read (only a production's leads and company may), so the list
-- was refused. A function gives the public the listed productions whose
-- rights are cleared, and only the fields the page shows: never the
-- rights, the auditions or the report.

create function private.public_productions()
returns table (
  id uuid, slug text, kind text, stage text, title_en text, title_ar text,
  summary_en text, summary_ar text, playwright text
)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, p.slug, p.kind, p.stage, p.title_en, p.title_ar,
    p.summary_en, p.summary_ar, p.playwright
  from programs.productions p
  where p.is_public and p.rights_status = 'cleared'
  order by p.created_at desc;
$$;
revoke all on function private.public_productions() from public;

create function programs.public_productions()
returns table (
  id uuid, slug text, kind text, stage text, title_en text, title_ar text,
  summary_en text, summary_ar text, playwright text
)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.public_productions() $$;
revoke all on function programs.public_productions() from public;
grant execute on function private.public_productions() to anon, authenticated;
grant execute on function programs.public_productions() to anon, authenticated;

comment on function programs.public_productions() is
  'The Company''s listed productions whose rights are cleared, newest first, with only the fields the public page shows.';

select private.build_api();
