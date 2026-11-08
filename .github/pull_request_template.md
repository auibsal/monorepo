## What changes

<!-- One paragraph: what the change does and why. Name the decisions.md section or the issue it carries out. -->

## Where to look

<!-- Pages, routes, migrations or emails a reviewer should open. -->

## Checklist

- [ ] `bun run check`, `bun run typecheck` and `bun run test` pass
- [ ] Schema changes: a new migration (newer than main's), RLS with the "No third-party apps" policy, pgTAP tests, `bun run db:test` and `bun run db:types`
- [ ] UI text in both `en.json` and `ar.json`; `bun run check:i18n` and `bun run check:rtl` pass
- [ ] A new email: its copy in both languages, a story and a row in `docs/platform/email.md`
- [ ] A new env var: in `keys.ts`, `apps/web/.env.example` and the secrets table in `docs/platform/secrets.md`
- [ ] Docs updated (AGENTS.md, `docs/platform`, PROGRESS.md) where they describe what changed
- [ ] No personal data in the code, fixtures, migrations or screenshots
