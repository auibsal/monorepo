# AUIB Society of Arts and Letters - Digital Platform

The official digital platform and internal editorial dashboard for the AUIB Society of Arts and Letters.

## 🏗 Architecture

This monorepo utilizes [Turborepo](https://turbo.build/) to manage multiple applications and shared packages. Dependency versioning is strictly centralized using **pnpm v10 Catalogs**.

### Applications (`apps/`)
*   `web`: Public-facing Next.js application. (EN/AR).
*   `nexus`: Internal editorial dashboard (Submissions, Kanban, CMS).

### Shared Packages (`packages/`)
*   `ui`: Brutalist component library (Shadcn, Tailwind v4, Radix UI).
*   `config`: Global configurations (ESLint, Prettier, TSConfig, Tailwind Tokens).
*   `database`: Supabase schema interfaces.
*   `auth`: Shared Supabase SSR authentication utilities.

---

## 🚀 Getting Started

### 1. Prerequisites
This project requires strictly enforced environment versions:
*   **Node.js**: `v24.0.0` or higher.
*   **pnpm**: `v10.33.2` or higher.

### 2. Environment Setup
Create a `.env.local` file at the root. Use the `.env.example` as a template.
```bash
cp .env.example .env.local

```
### 3. Installation
Install all dependencies across the workspace from the root. This syncs with the global pnpm catalog:
```bash
pnpm install

```
### 4. Dependency Management
**Important:** Do not manually add dependencies to application package.json files. Add them to the pnpm-workspace.yaml catalog, then update the local package.json with the catalog: prefix.
## 🛠 Commands
### Development
| Command | Description |
|---|---|
| pnpm dev | Start development servers (Nexus & Web) |
| pnpm clean | Wipe all build caches and .next outputs |
### Quality Assurance
| Command | Description |
|---|---|
| pnpm typecheck | Strict TypeScript validation |
| pnpm lint | Run ESLint across all workspaces |
| pnpm format | **Local:** Format and overwrite files |
| pnpm format:check | **CI/CD:** Verify formatting compliance |
| pnpm test | Execute Playwright E2E suites |
### Production
| Command | Description |
|---|---|
| pnpm build | Production build for all workspaces |
## 🛡 Security
Please report vulnerabilities privately via **security@auibsal.org** or use the GitHub "Report a vulnerability" tool in the Security tab. See /SECURITY.md for full disclosure policies.
