## 2026-07-20 - [Disabled Cursor States]
**Learning:** In Tailwind CSS, applying `disabled:pointer-events-none` prevents hover and cursor events entirely, thereby blocking `disabled:cursor-not-allowed` from working.
**Action:** Replaced `disabled:pointer-events-none` with `disabled:cursor-not-allowed` to ensure users receive visual feedback when a button is disabled.

## 2026-07-20 - [Disabled Button Accessibility]
**Learning:** The `disabled` HTML attribute does not natively work on `<a>` tags used with `asChild`, requiring `pointer-events-none` to prevent clicks. This prevents using `cursor-not-allowed`.
**Action:** Reverted the cursor change and instead applied `aria-disabled={props.disabled}` to ensure screen readers properly announce the disabled state for all variants.
