-- The op-ed identity line (decisions.md, Qirtas: "Op-eds end with the US
-- identity line"), built by the site from the writer's class and the one
-- line they give: a student gives their year and what they study ("[Name]
-- is a junior studying business at AUIB."); anyone else gives the line
-- after their name. The year is kept here beside that line.

alter table journal.submissions
  add column writer_year text
    check (writer_year in ('first', 'second', 'third', 'fourth', 'graduate'));

comment on column journal.submissions.writer_year is
  'An op-ed by a student: their year (first, second, third, fourth or graduate), for the identity line; about_writer then holds what they study.';
comment on column journal.submissions.about_writer is
  'An op-ed''s one line about its writer: what a student studies, or for anyone else the line after their name; the site builds the identity line from it and the class.';

grant insert (writer_year), update (writer_year) on journal.submissions to authenticated;
