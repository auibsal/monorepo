# auibsal-monorepo

## ⚡ Overview
Welcome to the `auibsal-monorepo`. This is the core architecture and monorepo containing all applications, packages, and shared utilities for the AUIB Society of Arts and Letters.

## 🚀 Architecture
This repository is managed using Turborepo and pnpm workspaces. It enforces strict separation of concerns through specialized packages that encapsulate domain logic.

### Apps
- **`apps/web`**: The main public-facing website, utilizing Next.js and next-intl for localization.
- **`apps/nexus`**: The internal administrative and editorial dashboard. Enforces strict Server-Side Role-Based Access Control (RBAC).
- **`apps/workshop`**: Storybook/UI testing environment for our customized brutalist design system.

### Packages
- **`@auibsal/auth`**: Centralized authentication, Supabase client initialization, and RBAC utilities.
- **`@auibsal/database`**: Single source of truth for all Supabase generated types and schemas.
- **`@auibsal/ui`**: Shared React components designed with a unique brutalist aesthetic.
- **`@auibsal/i18n`**: Centralized translation dictionaries.
- **`@auibsal/email`**: Transactional email templates and dispatching via Resend.
- **`@auibsal/payments`**: Payment gateway integrations, primarily Wayl.
- **`@auibsal/storage`**: Utilities for handling secure uploads to Supabase Storage.
- **`@auibsal/seo`**: Shared SEO utilities and metadata generators.
- **`@auibsal/analytics`**: Server-side tracking utilities.
- **`@auibsal/utils`**: Shared helpers, validators, and formatters.
- **`@auibsal/config`**: Shared ESLint, Biome, and TypeScript configurations.
- **`@auibsal/testing`**: Testing setup and configurations using Vitest and Playwright.

## 🔒 Security & Guidelines
- **Zero Barrel Files**: Do not use `index.ts` to re-export modules. Always use explicit path-based exports (e.g., `@auibsal/ui/button`).
- **Strict Typing**: No `any` or `@ts-expect-error`.
- **Formatting**: Biome is used for linting and formatting across the repo.

## ⚙️ Usage
To run the project locally:
```bash
pnpm install
pnpm build
pnpm dev
```
