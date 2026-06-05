## 2025-06-05 - Editor Toolbar Accessibility
**Learning:** The TipTap custom editor toolbar was missing critical ARIA attributes (`aria-pressed` for toggle states, `role="toolbar"`), explicit `type="button"` attributes (causing potential form submission issues), and `focus-visible` classes for keyboard navigation.
**Action:** Always add `role="toolbar"` to button groupings, `aria-pressed` for active states, `type="button"` for custom controls, and standard `focus-visible` classes to all interactive elements, especially in shared design system components.
