-- One email per sign-up (decisions §6, audit A1): the welcome is part of the
-- confirmation email, so no separate welcome is queued; its content is the
-- first screen after confirming (/welcome).
drop trigger after_first_pledge on membership.pledges;
drop function private.after_first_pledge();

-- Essential mail only until Resend Pro is in place (the outbox reads this;
-- set it to false once the plan is raised).
insert into core.settings (key, value)
values ('email.essential_only', 'true'::jsonb)
on conflict (key) do update set value = excluded.value;
