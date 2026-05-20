## 📝 Description
Provide a concise summary of the changes, the rationale behind them, and how they impact the platform.

## 🌍 Workspace Scope
*Indicate which parts of the monorepo this PR affects:*
- [ ] `apps/web` (Public Platform)
- [ ] `apps/nexus` (Editorial Dashboard)
- [ ] `packages/ui` (Brutalist Component Library)
- [ ] `packages/config` (Tooling/Tailwind)
- [ ] `packages/database` (Supabase Schemas)
- [ ] `packages/auth` (Authentication Logic)
- [ ] Root / Infrastructure

## 🏗 Architectural & CI/CD Checklist
- [ ] Code has been strictly formatted and linted locally (`pnpm format` & `pnpm lint`).
- [ ] Any new dependencies were checked against the global catalog (`pnpm-workspace.yaml`).
- [ ] Turborepo cache builds successfully locally (`pnpm build`).
- [ ] Supabase database types have been regenerated (if modifying schema).

## 🎨 Design & Layout Checklist
- [ ] Brutalist design tokens adhered to (e.g., `border-4`, hard shadows, industrial typography).
- [ ] No raw SVGs used (imported strictly from `lucide-react`).
- [ ] Internationalization (EN/AR) alignment verified (RTL/LTR layouts render correctly).
- [ ] Tested on both Mobile and Desktop viewports.

## 📸 Visual Proof (If modifying UI)
*Attach screenshots or a short screen recording demonstrating the changes.*

## 🔗 Relevant Issues
Closes #
