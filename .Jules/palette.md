## 2025-07-02 - Next.js Layout Link Keyboard Accessibility
**Learning:** Next.js `Link` elements and simple `<a>` tags in layout components (like Navbar and Footer) often lack explicit visual feedback for keyboard navigation, making them inaccessible for users relying on tab navigation.
**Action:** Always add explicit keyboard focus styles (e.g., `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2`) to Next.js `Link` and anchor (`a`) tags in layout components to maintain consistent keyboard navigation accessibility.
