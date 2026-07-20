## 2026-07-20 - [Disabled Cursor States]
**Learning:** In Tailwind CSS, applying `disabled:pointer-events-none` prevents hover and cursor events entirely, thereby blocking `disabled:cursor-not-allowed` from working.
**Action:** Replaced `disabled:pointer-events-none` with `disabled:cursor-not-allowed` to ensure users receive visual feedback when a button is disabled.
