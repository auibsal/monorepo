## 2026-07-22 - Focus Styles on Brutalist Components
**Learning:** Custom brutalist UI components with unique hover/shadow states often obscure default browser focus rings. It's critical to add explicit `focus-visible` styles to ensure keyboard accessibility.
**Action:** Always add explicit keyboard focus styles (e.g., `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary`) to custom buttons and links to maintain consistent keyboard navigation.
