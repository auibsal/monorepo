## 2024-05-24 - Missing Focus Styles on Nav Links
**Learning:** Found an accessibility issue pattern where `Link` and `a` tags inside complex components (like `Navbar` and `Footer`) lacked explicit focus-visible states compared to standard buttons.
**Action:** Always add explicit keyboard focus styles (e.g. `focus-visible:ring-2 focus-visible:ring-offset-2`) to `Link` elements and anchor tags in layout components to maintain consistent keyboard navigation accessibility.
