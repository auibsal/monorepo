-- Hudhud's removals (owner, Nov 7, 2026; decisions, Telegram): Hudhud warns
-- anyone in the members' group who hasn't joined on auibsal.org and
-- removes them a week later. Telegram doesn't let a bot list a group's
-- members, so Hudhud warns each person the first time it sees them post.
-- Admins (Student Life's staff among them) and anyone holding a Society
-- role (the Faculty Advisor) are never removed. Linking an account clears
-- the warning.
alter table core.telegram_members
  add column warned_at timestamptz,
  add column removed_at timestamptz;

create index telegram_members_warned_idx on core.telegram_members (warned_at)
  where warned_at is not null and removed_at is null;

comment on column core.telegram_members.warned_at is
  'When Hudhud warned this unlinked person that they will be removed in a week (owner, Nov 7, 2026).';
comment on column core.telegram_members.removed_at is
  'When Hudhud removed them from the group, a week after the warning.';
