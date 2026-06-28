## 2024-06-28 - Add explicit focus-visible styles to navigation links
**Learning:** Next.js `Link` and `a` tags in structural layout components (like Navbar/Footer) often lose default browser focus states when custom hover/transition classes are applied, creating accessibility traps for keyboard users.
**Action:** Always add explicit keyboard focus styles (e.g., `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 rounded-sm`) to navigation links using appropriate brand colors for offsets.
