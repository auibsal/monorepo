# AUIB Society of Arts and Letters - Digital Platform

This is the monorepo for the official digital platform and internal editorial dashboard of the AUIB Society of Arts and Letters. It is built using Next.js, Turborepo, Tailwind CSS, and Supabase.

## 🏗 Architecture

This repository utilizes [Turborepo](https://turbo.build/) to manage multiple applications and shared packages within a single workspace using `pnpm`.

### Applications (`apps/`)
- `web`: The public-facing Next.js application (Internationalized: EN/AR). Contains the society blog, event calendar, published journals, and public information.
- `nexus`: The internal Next.js editorial dashboard. Handles manuscript submissions, the editorial Kanban board, CMS management, and user roles.

### Shared Packages (`packages/`)
- `ui`: A shared brutalist UI component library built with Shadcn, Tailwind, and Radix UI. Includes the TipTap rich-text editor and typography configurations.
- `database`: Shared Supabase database types, schemas, and interfaces.
- `auth`: Shared Supabase SSR authentication utilities and middleware logic.
- `typescript-config`: Base TypeScript configurations extended across the monorepo.

## 🚀 Getting Started

### 1. Prerequisites
Ensure you have the following installed:
- Node.js (v18+)
- [pnpm](https://pnpm.io/installation) (v10.x)

### 2. Environment Variables
You must connect the platform to Supabase. Create a `.env.local` file at the root of the monorepo and populate it with your project keys:

```env
NEXT_PUBLIC_SUPABASE_URL="your-supabase-project-url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"

```
### 3. Installation
Install all dependencies across the workspace from the root directory:
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
## 🛠 Build & Test Commands
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
To execute Playwright end-to-end tests:
```bash
pnpm test
