## 2026-08-20 - Brutalist Loading Spinner Pattern
**Learning:** The application uses a strict brutalist design system where standard round spinners look out of place. The established pattern for async submit buttons is a square spinner (`<div className="h-4 w-4 animate-spin rounded-none bg-background"></div>`) combined with a `flex items-center justify-center gap-3` button structure.
**Action:** Always use the square brutalist spinner pattern for async loading states instead of default rounded circular spinners to maintain design system consistency.
