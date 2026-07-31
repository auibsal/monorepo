## 2026-07-31 - Restore Keyboard Accessibility on Brutalist Elements
**Learning:** When implementing brutalist interactive elements (like heavy bordered buttons or links), native browser focus rings are completely obscured by custom border/background treatments.
**Action:** Always inject `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background` to restore keyboard accessibility.
