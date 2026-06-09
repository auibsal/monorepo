## 2026-06-09 - Adding aria-live attributes to dynamically rendered feedback
**Learning:** When rendering dynamic form feedback (e.g., error or success messages), screen readers will not announce them automatically unless specific ARIA roles are provided.
**Action:** Explicitly add `role="alert"` (which implies `aria-live="assertive"`) for error states and `role="status"` (which implies `aria-live="polite"`) for success states to ensure screen readers immediately notify users of changes.
