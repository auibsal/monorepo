## 2024-07-01 - Missing Default Focus Styles on Layout Links
**Learning:** Next.js `<Link>` components and standard anchors (`<a>`) in layout components (like Navbar and Footer) often miss default keyboard focus indicators due to standard CSS resets or custom styling.
**Action:** Always explicitly define `focus-visible` styles with ring utilities (e.g., `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2`) matched to their background colors (`auib-red` or `auib-charcoal`) for robust keyboard accessibility navigation.
