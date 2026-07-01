## 2024-07-01 - Add Focus Styles to Next.js Links
**Learning:** Next.js `Link` and anchor (`a`) tags in layout components like Navbars and Footers often lack explicit focus styles out-of-the-box, resulting in poor keyboard accessibility.
**Action:** Always verify keyboard focus states and add `focus-visible:ring-2` (and related classes like `focus-visible:ring-offset-2` and `rounded-sm`) to ensure consistent visual feedback for keyboard navigation.
