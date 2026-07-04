## 2024-07-04 - Next.js Link Focus States
**Learning:** Next.js `Link` components and generic anchor tags often lack default keyboard focus indicators, making navigation inaccessible for keyboard users, especially in layout components like headers and footers with custom styling.
**Action:** Always add explicit `focus-visible` utility classes (e.g., `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2`) to all interactive elements, including Next.js `Link` and anchor tags, to ensure clear keyboard navigation visibility.
