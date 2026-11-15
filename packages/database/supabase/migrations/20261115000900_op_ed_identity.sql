-- The op-ed identity line on the published piece (decisions.md, Qirtas:
-- "Op-eds end with the US identity line"). The page builds the line from
-- what the writer gave with the op-ed (their year and what they study, or
-- the line after their name), whether they are a student (a Member, not
-- an Associate or Honorary Member) and their Arabic form («طالب» or
-- «طالبة»). Only for a published op-ed under
-- the writer's own name: a pen name or an anonymous byline shows no line,
-- so nothing ties it to a person.

create function private.op_ed_identity(piece uuid)
returns table (about_writer text, writer_year text, student boolean,
  feminine boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select s.about_writer, s.writer_year,
    exists (select 1 from membership.memberships m
      where m.user_id = s.author_id and m.tier = 'member'),
    coalesce(pr.title_form = 'feminine', false)
  from journal.pieces p
  join journal.contributors c on c.id = p.contributor_id
  join journal.submissions s on s.id = p.submission_id
  left join core.profiles pr on pr.id = s.author_id
  where p.id = piece
    and p.status = 'published'
    and p.published_at <= now()
    and p.category = 'opinion_essay'
    and not c.is_pen_name
    and not c.is_anonymous
    and nullif(btrim(s.about_writer), '') is not null;
$$;
revoke all on function private.op_ed_identity(uuid) from public;
grant execute on function private.op_ed_identity(uuid) to anon, authenticated;

create function journal.op_ed_identity(piece uuid)
returns table (about_writer text, writer_year text, student boolean,
  feminine boolean)
language sql
stable
security invoker
set search_path = ''
as $$ select * from private.op_ed_identity(piece) $$;
revoke all on function journal.op_ed_identity(uuid) from public;
grant execute on function journal.op_ed_identity(uuid) to anon, authenticated;

comment on function journal.op_ed_identity(uuid) is
  'A published op-ed''s identity line, as the writer gave it with the op-ed: the line, the year, whether a student and the Arabic form; nothing under a pen name or an anonymous byline.';
