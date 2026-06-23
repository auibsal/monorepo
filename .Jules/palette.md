## 2024-06-23 - Focus styles for Next.js Link and a tags in layout components
**Learning:** Next.js `Link` elements and standard `a` tags in layout components (like Navbar and Footer) often lack default focus states, making them inaccessible via keyboard navigation.
**Action:** Always explicitly add keyboard focus styles (e.g., `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-auib-red rounded-sm`) to these elements to maintain consistent keyboard navigation accessibility.
