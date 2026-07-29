## 2026-07-29 - Brutalist Loading Spinner
**Learning:** This codebase uses a specific brutalist square spinner pattern for loading states on buttons to match the overall design system.
**Action:** Use `<div className="h-4 w-4 animate-spin rounded-none bg-background"></div>` alongside `flex items-center justify-center gap-3` for button loading states rather than standard round SVG spinners or generic text.
