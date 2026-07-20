
## 2026-07-20 - [Disabled Button Accessibility]
**Learning:** The `disabled` HTML attribute does not natively work on `<a>` tags used with `asChild`, requiring `pointer-events-none` to prevent clicks. This prevents using `cursor-not-allowed`.
**Action:** Reverted the cursor change and instead applied `aria-disabled={props.disabled}` to ensure screen readers properly announce the disabled state for all variants.
