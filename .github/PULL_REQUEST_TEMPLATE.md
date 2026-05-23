## 📝 Description
Provide a concise summary of the changes, the rationale behind them, and how they impact the platform.

## 🔄 Type of Change
_Select the most relevant category:_
- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] ✨ New feature (non-breaking change which adds functionality)
- [ ] 🛠️ Refactor (code improvement that does not affect functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)

## 🌍 Workspace Scope
_Indicate which parts of the monorepo this PR affects:_
- [ ] `apps/web` (Public Platform)
- [ ] `apps/nexus` (Editorial Dashboard)
- [ ] `packages/ui` (Brutalist Component Library)
- [ ] `packages/config` (Tooling/Tailwind)
- [ ] `packages/database` (Supabase Schemas)
- [ ] `packages/auth` (Authentication Logic)
- [ ] Root / Infrastructure

## 🏗 Architectural & CI/CD Checklist
- [ ] Code has been strictly formatted and linted locally (`pnpm format` & `pnpm lint`).
- [ ] Strict TypeScript validation passes across all workspaces (`pnpm typecheck`).
- [ ] Playwright E2E testing suites pass (`pnpm test`).
- [ ] Any new dependencies were checked against the global catalog (`pnpm-workspace.yaml`).
- [ ] Turborepo cache builds successfully locally (`pnpm build`).
- [ ] **Supabase:** Database types have been regenerated AND new migrations are committed (if modifying schema).

## 🎨 Design & Layout Checklist
- [ ] Architectural/Brutalist design tokens adhered to (e.g., `border-4`, hard shadows, industrial typography).
- [ ] Accessibility (a11y) verified: Stark contrast ratios maintained and ARIA labels included where necessary.
- [ ] No raw SVGs used (imported strictly from `lucide-react`).
- [ ] Internationalization (EN/AR) alignment verified (RTL/LTR layouts render correctly).
- [ ] Tested on both Mobile and Desktop viewports.

## 📸 Visual Proof (If modifying UI)
_Attach screenshots or a short screen recording demonstrating the changes._

## 🔗 Relevant Issues
Closes #
