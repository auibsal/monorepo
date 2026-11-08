# Changelog

The platform of the AUIB Society of Arts and Letters, auibsal.org. Each
release is tagged in git; the Society’s documents keep their own versions
in the Library.

## 1.0.0 (launch, November 8, 2026)

The first release: the public site, your account, the Diwan, the API
routes and Hudhud, as described in `claude/decisions.md`, `AGENTS.md` and
`docs/platform`.

- **Runtime:** Node.js 26 (LTS) on Vercel, Bun 1.4 for installs and
  scripts, every package at its latest stable release (the Supabase CLI
  stays on 2.x until the migration and backup workflows move to 3.x).
- **Code:** TypeScript 7 targeting ES2024 with `noUncheckedIndexedAccess`;
  Biome with Ultracite 8; Knip on exports and types.
- **Security:** a nonce-based Content Security Policy for your account and
  the Diwan; webhooks under `/api/hooks/*`, each signed; signed share
  images; one error shape (RFC 9457).
- **Quality:** axe on every WCAG 2.1 A/AA rule; browser journeys on
  desktop, a Pixel and an iPhone, in both languages; integration suites
  that fail when they run no tests.
- **Decisions:** the architecture decision records in `docs/adr/`.
