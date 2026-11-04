-- Retired names out of the code too (owner, Nov 4, 2026): "the Qirtas
-- Prizes" are the Qirtas Awards and "the Callboard" is Get involved, in
-- the database's own names as everywhere else. Objects are renamed in place
-- (grants, owners, triggers and policies follow them); function bodies that
-- name them are then rewritten; the permission journal.prizes is
-- journal.awards; a certificate's kind 'prize' is 'award'.

-- ── Tables, columns, constraints, indexes, triggers, policies ─────────────
alter table journal.prizes rename to awards;
alter table journal.prize_rounds rename to award_rounds;
alter table journal.prize_entries rename to award_entries;
alter table journal.prize_judges rename to award_judges;
alter table journal.award_entries rename column prize_key to award_key;
alter table journal.award_judges rename column prize_key to award_key;

do $$
declare
  r record;
begin
  for r in
    select con.conname, cls.relname
    from pg_constraint con
    join pg_class cls on cls.oid = con.conrelid
    join pg_namespace n on n.oid = cls.relnamespace
    where n.nspname = 'journal' and con.conname like '%prize%'
  loop
    execute format('alter table journal.%I rename constraint %I to %I',
      r.relname, r.conname, replace(r.conname, 'prize', 'award'));
  end loop;
  for r in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'journal' and c.relkind = 'i' and c.relname like '%prize%'
  loop
    execute format('alter index journal.%I rename to %I',
      r.relname, replace(r.relname, 'prize', 'award'));
  end loop;
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'journal' and policyname ~* 'prize'
  loop
    execute format('alter policy %I on %I.%I rename to %I',
      r.policyname, r.schemaname, r.tablename,
      replace(replace(r.policyname, 'Prizes', 'Awards'), 'prizes', 'awards'));
  end loop;
end;
$$;

alter trigger prize_entry_valid on journal.award_entries rename to award_entry_valid;

-- ── Functions: new names, then bodies that say the new names ──────────────
alter function private.prize_entry_valid() rename to award_entry_valid;
alter function private.runs_the_prizes() rename to runs_the_awards;
alter function private.prize_results(text) rename to award_results;
alter function journal.prize_results(text) rename to award_results;
alter function private.prepare_prize_certificates(uuid) rename to prepare_award_certificates;
alter function journal.prepare_prize_certificates(uuid) rename to prepare_award_certificates;
alter function private.callboard_skills_valid(text[]) rename to wanted_skills_valid;

create function pg_temp.renamed(body text)
returns text
language sql
immutable
as $$
  select replace(replace(replace(replace(replace(replace(replace(replace(
    replace(replace(replace(replace(replace(replace(replace(
      body,
      'prepare_prize_certificates', 'prepare_award_certificates'),
      'prize_entry_valid', 'award_entry_valid'),
      'runs_the_prizes', 'runs_the_awards'),
      'prize_results', 'award_results'),
      'callboard_skills_valid', 'wanted_skills_valid'),
      'journal.prize_rounds', 'journal.award_rounds'),
      'journal.prize_entries', 'journal.award_entries'),
      'journal.prize_judges', 'journal.award_judges'),
      'journal.prizes', 'journal.awards'),
      'prize_key', 'award_key'),
      'prizes_not_awarded', 'awards_not_awarded'),
      'prize_piece_unpublished', 'award_piece_unpublished'),
      'prize_wrong_section', 'award_wrong_section'),
      '''prize''', '''award'''),
      'the Prizes', 'the Awards')
$$;

do $$
declare
  f record;
  def text;
  public_may boolean;
  g record;
begin
  for f in
    select p.oid, p.proacl, p.oid::regprocedure::text as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname not in ('pg_catalog', 'information_schema')
      and n.nspname not like 'pg_temp%'
      and p.prosrc ~ 'prize|callboard'
  loop
    def := pg_temp.renamed(pg_get_functiondef(f.oid));
    begin
      execute def;
    exception when invalid_function_definition then
      -- The result's columns changed (award_key): drop and create, keeping
      -- who may call it.
      execute format('drop function %s', f.sig);
      execute def;
      public_may := false;
      for g in select * from aclexplode(coalesce(f.proacl, '{}')) loop
        if g.grantee = 0 then
          public_may := true;
        end if;
        execute format('grant execute on function %s to %s',
          f.sig,
          case when g.grantee = 0 then 'public' else quote_ident(g.grantee::regrole::text) end);
      end loop;
      if not public_may then
        execute format('revoke all on function %s from public', f.sig);
      end if;
    end;
  end loop;
end;
$$;

-- ── The permission: journal.prizes is journal.awards ──────────────────────
insert into access.permissions (key, description)
select 'journal.awards', replace(description, 'Prizes', 'Awards')
from access.permissions
where key = 'journal.prizes'
on conflict (key) do nothing;

update access.role_permissions
set permission = 'journal.awards'
where permission = 'journal.prizes';

do $$
declare
  p record;
  stmt text;
begin
  for p in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where coalesce(qual, '') || coalesce(with_check, '') ~ 'prize|callboard'
  loop
    -- The permission's key, and the old names a policy's text still keeps
    -- (column aliases such as "AS runs_the_prizes").
    stmt := format('alter policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
    if p.qual is not null then
      stmt := stmt || format(' using (%s)',
        replace(pg_temp.renamed(p.qual), 'runs_the_prizes', 'runs_the_awards'));
    end if;
    if p.with_check is not null then
      stmt := stmt || format(' with check (%s)',
        replace(pg_temp.renamed(p.with_check), 'runs_the_prizes', 'runs_the_awards'));
    end if;
    execute stmt;
  end loop;
end;
$$;

delete from access.permissions where key in ('journal.prizes');

-- ── A certificate from the Awards is of kind 'award' ──────────────────────
alter table membership.certificates
  drop constraint certificates_kind_check,
  drop constraint certificates_prize_citation;

update membership.certificates set kind = 'award' where kind = 'prize';

alter table membership.certificates
  add constraint certificates_kind_check
    check (kind in ('service', 'fellowship', 'honorary', 'volunteer', 'production',
      'partner', 'award', 'apprenticeship')),
  add constraint certificates_award_citation
    check (kind <> 'award' or citation_en is not null);

-- What happened before the rename reads under the new names too.
update core.activity_log
set table_name = replace(table_name, 'prize', 'award')
where table_schema = 'journal' and table_name like 'prize%';
