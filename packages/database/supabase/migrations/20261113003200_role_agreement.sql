-- The role agreement (decisions.md, Documents and forms: "signed on
-- accepting any role: the Code of Conduct and, for work made in the role
-- (design, code, photos, video, writing for the Society), the maker keeps
-- copyright and gives the Society a lasting license to use it"; the third
-- prompt, §2). One per role given, signed by the holder in the name the
-- register holds ("Sign as …"), before the conflict-of-interest
-- declaration, which the database now refuses until it is signed.

insert into core.settings (key, value) values ('role_agreement.version', '"1"')
on conflict (key) do nothing;

create table access.role_agreements (
  assignment_id uuid primary key references access.role_assignments (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  version text not null,
  signer_name text not null,
  signed_at timestamptz not null default now()
);

comment on table access.role_agreements is
  'The role agreement each holder signs on accepting a role: the Code of Conduct and the license for work made in the role.';

create index role_agreements_user_id_idx on access.role_agreements (user_id);

alter table access.role_agreements enable row level security;

create policy "Holders and role officers read role agreements" on access.role_agreements
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.has_permission('roles.assign')));
create policy "No third-party apps" on access.role_agreements
  as restrictive for all to authenticated
  using ((select private.client_allows('access')))
  with check ((select private.client_allows('access')));

grant select on access.role_agreements to authenticated;
grant all on access.role_agreements to service_role;

-- The holder signs for one of their roles.
create function private.sign_role_agreement(assignment_id uuid)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  a access.role_assignments;
  signed timestamptz;
  who text;
begin
  select * into a from access.role_assignments r where r.id = sign_role_agreement.assignment_id;
  if not found or a.user_id is distinct from auth.uid() then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  who := private.register_name(a.user_id);
  if nullif(btrim(coalesce(who, '')), '') is null then
    raise exception 'name_required' using errcode = '22023';
  end if;
  insert into access.role_agreements (assignment_id, user_id, version, signer_name)
  values (a.id, a.user_id,
    coalesce((select s.value #>> '{}' from core.settings s where s.key = 'role_agreement.version'), '1'),
    who)
  on conflict on constraint role_agreements_pkey do nothing;
  select r.signed_at into signed from access.role_agreements r where r.assignment_id = a.id;
  return signed;
end;
$$;
revoke all on function private.sign_role_agreement(uuid) from public, anon;
grant execute on function private.sign_role_agreement(uuid) to authenticated;

create function access.sign_role_agreement(assignment_id uuid)
returns timestamptz
language sql
security invoker
set search_path = ''
as $$ select private.sign_role_agreement($1) $$;
revoke all on function access.sign_role_agreement(uuid) from public, anon;
grant execute on function access.sign_role_agreement(uuid) to authenticated, service_role;

-- When the agreement began to be asked: the moment this migration ran.
insert into core.settings (key, value) values ('role_agreement.since', to_jsonb(now()))
on conflict (key) do nothing;

create function private.role_agreement_since()
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select (s.value #>> '{}')::timestamptz from core.settings s
    where s.key = 'role_agreement.since'), '-infinity'::timestamptz)
$$;
revoke all on function private.role_agreement_since() from public, anon;
grant execute on function private.role_agreement_since() to authenticated, service_role;

-- Whether the person has a current role whose agreement is unsigned.
create function private.role_agreement_missing(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from access.role_assignments a
    where a.user_id = uid and a.starts_at <= now() and (a.ends_at is null or a.ends_at > now())
      -- Asked of roles given from the day the agreement exists; roles
      -- given before were accepted under the Code of Conduct alone.
      and a.starts_at >= private.role_agreement_since()
      and not exists (select 1 from access.role_agreements g where g.assignment_id = a.id)
  );
$$;
revoke all on function private.role_agreement_missing(uuid) from public, anon;
grant execute on function private.role_agreement_missing(uuid) to authenticated, service_role;

-- The declaration comes after the agreement.
create function private.declaration_after_agreement()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.form_key = 'f06' and new.status <> 'draft'
    and (tg_op = 'INSERT' or old.status = 'draft')
    and new.submitted_by is not null
    and private.role_agreement_missing(new.submitted_by) then
    raise exception 'role_agreement_first' using errcode = 'P0001',
      hint = 'Sign the role agreement for each of your roles first.';
  end if;
  return new;
end;
$$;

create trigger declaration_after_agreement
  before insert or update of status on governance.form_submissions
  for each row execute function private.declaration_after_agreement();

-- The checklist's second step is this role's agreement (and, for Qirtas,
-- the readers' pledge).
do $$
declare
  def text;
  old_step text := E'      when ''pledge'' then\n        exists (\n          select 1 from membership.pledges p\n          where p.user_id = (select auth.uid()) and p.pledge_type = ''member''\n        )';
begin
  def := pg_get_functiondef('private.my_role_checklist'::regproc);
  if position(old_step in def) = 0 then
    raise exception 'Unexpected body in private.my_role_checklist';
  end if;
  def := replace(def, old_step,
    E'      when ''pledge'' then\n        (exists (\n          select 1 from access.role_agreements g where g.assignment_id = s.id\n        ) or (s.starts_at < private.role_agreement_since() and exists (\n          select 1 from membership.pledges p\n          where p.user_id = (select auth.uid()) and p.pledge_type = ''member''\n        )))');
  execute def;
end
$$;
