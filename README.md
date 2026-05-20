# AUIB Society of Arts and Letters - Digital Platform

This is the monorepo for the official digital platform and internal editorial dashboard of the AUIB Society of Arts and Letters. It is built using Next.js 16, Turborepo, Tailwind CSS v4, and Supabase.

## 🏗 Architecture

This repository utilizes [Turborepo](https://turbo.build/) to manage multiple applications and shared packages within a single workspace. Dependency versioning is strictly centralized using **pnpm v10 Catalogs**.

### Applications (`apps/`)
- `web`: The public-facing Next.js application (Internationalized: EN/AR). Contains the society blog, event calendar, published journals, and public information.
- `nexus`: The internal Next.js editorial dashboard. Handles manuscript submissions, the editorial Kanban board, CMS management, and user roles.

### Shared Packages (`packages/`)
- `ui`: A shared brutalist UI component library built with Shadcn, Tailwind v4, and Radix UI. Includes the TipTap rich-text editor and typography configurations.
- `config`: The centralized "Brain" of the monorepo. Houses the global ESLint architecture, Prettier exports, base TypeScript configs, and the unified Tailwind v4 design tokens (`theme.css`).
- `database`: Shared Supabase database types, schemas, and interfaces.
- `auth`: Shared Supabase SSR authentication utilities and middleware logic.

## 🚀 Getting Started

### 1. Prerequisites
Ensure you have the following installed:
- Node.js (v24.x)
- [pnpm](https://pnpm.io/installation) (v10.x)

### 2. Environment Variables
You must connect the platform to Supabase and other third-party services. Create a `.env.local` file at the root of the monorepo. 

For local development, ask the core infrastructure team for the current environment matrix, or copy the `.env.example` file:
```bash
cp .env.example .env.local

```
*(Note: Refer to turbo.json for the full list of build-dependent variables, including POSTGRES_URL and RESEND_API_KEY).*
### 3. Installation
Install all dependencies across the workspace from the root directory. This will automatically sync with the global pnpm catalog:
```bash
pnpm install

```
### 4. Local Development
Start the development servers for all applications simultaneously using Turborepo:
```bash
pnpm dev

```
 * The public web app will be available at http://localhost:3000
 * The Nexus dashboard will be available at http://localhost:3001
## 🛠 Build & Tooling Commands
To build all apps and packages for production:
```bash
pnpm build

```
To run the Next.js linters across all workspaces:
```bash
pnpm lint

```
To run a strict TypeScript typecheck across all workspaces:
```bash
pnpm typecheck

```
To automatically sort imports and format all code using the root Prettier engine:
```bash
pnpm format

```
To wipe all Next.js caches, Turborepo caches, and build outputs if the development server becomes unstable:
```bash
pnpm clean

```
To execute Playwright end-to-end tests:
```bash
pnpm test
